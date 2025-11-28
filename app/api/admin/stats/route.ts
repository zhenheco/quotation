/**
 * 超級管理員系統統計 API
 *
 * GET /api/admin/stats
 * 取得系統統計資訊
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { createApiClient } from '@/lib/supabase/api';
import { isSuperAdmin } from '@/lib/dal/rbac';
import { getSupabaseClient } from '@/lib/db/supabase-client';

// Note: Edge runtime removed for OpenNext compatibility;

export async function GET(request: NextRequest) {
  try {
    // 驗證使用者身份
    const supabase = createApiClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getSupabaseClient();

    // 檢查是否為超級管理員
    const isAdmin = await isSuperAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // 獲取統計資料
    const stats = await getSystemStats(db);

    return NextResponse.json({
      success: true,
      stats
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching system stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? getErrorMessage(error) : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * 獲取系統統計資料
 */
async function getSystemStats(db: ReturnType<typeof getSupabaseClient>) {
  // 公司總數
  const { count: totalCompanies } = await db
    .from('companies')
    .select('*', { count: 'exact', head: true });

  // 使用者總數（從 user_roles 統計唯一 user_id）
  const { data: userRoles } = await db
    .from('user_roles')
    .select('user_id');
  const totalUsers = new Set(userRoles?.map(r => r.user_id) || []).size;

  // 活躍公司數（有成員的公司）
  const { data: activeCompanyMembers } = await db
    .from('company_members')
    .select('company_id')
    .eq('is_active', true);
  const activeCompaniesCount = new Set(activeCompanyMembers?.map(m => m.company_id) || []).size;

  // 公司成員總數
  const { count: totalMembers } = await db
    .from('company_members')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // 各角色數量
  const { data: rolesData } = await db
    .from('roles')
    .select('id, name, name_zh, name_en, level')
    .neq('name', 'super_admin')
    .order('level');

  const roleStats = await Promise.all(
    (rolesData || []).map(async (role) => {
      const { count } = await db
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id);

      return {
        role_name: role.name,
        display_name: role.name_zh,
        count: count || 0
      };
    })
  );

  // 最近新增的公司（最近7天）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: recentCompaniesCount } = await db
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo.toISOString());

  // 最近新增的使用者（最近7天）
  const { data: recentUserRoles } = await db
    .from('user_roles')
    .select('user_id')
    .gte('created_at', sevenDaysAgo.toISOString());
  const recentUsersCount = new Set(recentUserRoles?.map(r => r.user_id) || []).size;

  return {
    overview: {
      totalCompanies: totalCompanies || 0,
      totalUsers,
      activeCompanies: activeCompaniesCount,
      totalMembers: totalMembers || 0
    },
    recent: {
      newCompanies: recentCompaniesCount || 0,
      newUsers: recentUsersCount
    },
    roles: roleStats
  };
}
