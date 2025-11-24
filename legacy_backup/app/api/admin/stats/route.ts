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
import { getD1Client } from '@/lib/db/d1-client';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Note: Edge runtime removed for OpenNext compatibility;

export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext();
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

    const db = getD1Client(env);

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
async function getSystemStats(db: ReturnType<typeof getD1Client>) {
  // 公司總數
  const companies = await db.query<{ count: number }>(
    'SELECT COUNT(*) as count FROM companies'
  );
  const totalCompanies = companies[0]?.count || 0;

  // 使用者總數（從 user_roles 統計唯一 user_id）
  const users = await db.query<{ count: number }>(
    'SELECT COUNT(DISTINCT user_id) as count FROM user_roles'
  );
  const totalUsers = users[0]?.count || 0;

  // 活躍公司數（有成員的公司）
  const activeCompanies = await db.query<{ count: number }>(`
    SELECT COUNT(DISTINCT company_id) as count
    FROM company_members
    WHERE is_active = 1
  `);
  const activeCompaniesCount = activeCompanies[0]?.count || 0;

  // 公司成員總數
  const members = await db.query<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM company_members
    WHERE is_active = 1
  `);
  const totalMembers = members[0]?.count || 0;

  // 各角色數量
  const roles = await db.query<{
    role_name: string;
    name_zh: string;
    name_en: string;
    user_count: number;
  }>(`
    SELECT
      r.name as role_name,
      r.name_zh,
      r.name_en,
      COUNT(ur.user_id) as user_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.id = ur.role_id
    WHERE r.name != 'super_admin'
    GROUP BY r.id, r.name, r.name_zh, r.name_en, r.level
    ORDER BY r.level
  `);

  const roleStats = roles.map((r) => ({
    role_name: r.role_name,
    display_name: r.name_zh, // 使用中文名稱作為顯示名稱
    count: r.user_count || 0
  }));

  // 最近新增的公司（最近7天）- SQLite 使用 datetime
  const recentCompanies = await db.query<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM companies
    WHERE created_at >= datetime('now', '-7 days')
  `);
  const recentCompaniesCount = recentCompanies[0]?.count || 0;

  // 最近新增的使用者（最近7天）- 從 user_roles 統計
  const recentUsers = await db.query<{ count: number }>(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM user_roles
    WHERE created_at >= datetime('now', '-7 days')
  `);
  const recentUsersCount = recentUsers[0]?.count || 0;

  return {
    overview: {
      totalCompanies,
      totalUsers,
      activeCompanies: activeCompaniesCount,
      totalMembers
    },
    recent: {
      newCompanies: recentCompaniesCount,
      newUsers: recentUsersCount
    },
    roles: roleStats
  };
}
