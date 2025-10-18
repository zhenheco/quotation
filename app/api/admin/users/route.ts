import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdmin } from '@/lib/services/rbac';
import { query } from '@/lib/db/zeabur';

/**
 * GET /api/admin/users
 * 取得所有使用者列表（僅超級管理員）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 驗證用戶
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 檢查是否為超管
    const isAdmin = await isSuperAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // 取得所有使用者及其公司資訊
    const result = await query(
      `SELECT * FROM user_with_companies
       ORDER BY full_name ASC`
    );

    const users = result.rows.map(row => ({
      user_id: row.user_id,
      full_name: row.full_name,
      display_name: row.display_name,
      phone: row.phone,
      avatar_url: row.avatar_url,
      is_active: row.is_active,
      last_login_at: row.last_login_at,
      companies: row.companies || [],
      global_roles: row.global_roles || []
    }));

    return NextResponse.json({
      users,
      total: users.length
    });

  } catch (error: any) {
    console.error('Error fetching users:', error);

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
