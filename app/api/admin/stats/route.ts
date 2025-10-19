/**
 * 超級管理員系統統計 API
 *
 * GET /api/admin/stats
 * 取得系統統計資訊
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/services/rbac';
import { query } from '@/lib/db/zeabur';

export async function GET(request: NextRequest) {
  try {
    // 驗證使用者身份
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 檢查是否為超級管理員
    const isAdmin = await isSuperAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // 獲取統計資料
    const stats = await getSystemStats();

    return NextResponse.json({
      success: true,
      stats
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching system stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * 獲取系統統計資料
 */
async function getSystemStats() {
  // 公司總數
  const companiesResult = await query(
    'SELECT COUNT(*) as count FROM companies WHERE deleted_at IS NULL'
  );
  const totalCompanies = parseInt(companiesResult.rows[0]?.count || '0');

  // 使用者總數
  const usersResult = await query(
    'SELECT COUNT(*) as count FROM user_profiles'
  );
  const totalUsers = parseInt(usersResult.rows[0]?.count || '0');

  // 活躍公司數（有成員的公司）
  const activeCompaniesResult = await query(`
    SELECT COUNT(DISTINCT company_id) as count
    FROM company_members
    WHERE deleted_at IS NULL
  `);
  const activeCompanies = parseInt(activeCompaniesResult.rows[0]?.count || '0');

  // 公司成員總數
  const membersResult = await query(`
    SELECT COUNT(*) as count
    FROM company_members
    WHERE deleted_at IS NULL
  `);
  const totalMembers = parseInt(membersResult.rows[0]?.count || '0');

  // 各角色數量
  const rolesResult = await query(`
    SELECT
      r.role_name,
      r.display_name,
      COUNT(ur.user_id) as user_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.id = ur.role_id
    WHERE r.role_name != 'super_admin'
    GROUP BY r.id, r.role_name, r.display_name
    ORDER BY r.level
  `);

  const roleStats = rolesResult.rows.map((row: any) => ({
    role_name: row.role_name,
    display_name: row.display_name,
    count: parseInt(row.user_count || '0')
  }));

  // 最近新增的公司（最近7天）
  const recentCompaniesResult = await query(`
    SELECT COUNT(*) as count
    FROM companies
    WHERE created_at >= NOW() - INTERVAL '7 days'
    AND deleted_at IS NULL
  `);
  const recentCompanies = parseInt(recentCompaniesResult.rows[0]?.count || '0');

  // 最近新增的使用者（最近7天）
  const recentUsersResult = await query(`
    SELECT COUNT(*) as count
    FROM user_profiles
    WHERE created_at >= NOW() - INTERVAL '7 days'
  `);
  const recentUsers = parseInt(recentUsersResult.rows[0]?.count || '0');

  return {
    overview: {
      totalCompanies,
      totalUsers,
      activeCompanies,
      totalMembers
    },
    recent: {
      newCompanies: recentCompanies,
      newUsers: recentUsers
    },
    roles: roleStats
  };
}
