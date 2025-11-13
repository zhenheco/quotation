import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdmin } from '@/lib/dal/rbac';
import { getD1Client } from '@/lib/db/d1-client';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { User } from '@supabase/supabase-js';

export const runtime = 'edge';

/**
 * GET /api/admin/users
 * 取得所有使用者列表（僅超級管理員）
 */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext();

  try {
    const supabase = createApiClient(request);

    // 驗證用戶
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env);

    // 檢查是否為超管
    const isAdmin = await isSuperAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // 取得所有使用者 ID（從 user_roles 獲取唯一的 user_id）
    const userIdsResult = await db.query<{ user_id: string }>(`
      SELECT DISTINCT user_id
      FROM user_roles
      ORDER BY user_id ASC
    `);

    const userIds = userIdsResult.map(row => row.user_id);

    // 從 Supabase Auth 取得使用者資訊
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json(
        { error: 'Failed to fetch user data from auth' },
        { status: 500 }
      );
    }

    // 建立使用者 ID 到認證資料的映射
    const authUserMap = new Map<string, User>(
      authUsers.map(u => [u.id, u] as const)
    );

    // 為每個使用者取得公司和角色資訊
    const users = await Promise.all(
      userIds.map(async (userId) => {
        const authUser = authUserMap.get(userId);

        // 取得使用者的公司
        const companiesResult = await db.query<{
          company_id: string;
          company_name: string;
          role_name: string;
          is_owner: number;
        }>(`
          SELECT
            cm.company_id,
            c.name as company_name,
            r.name as role_name,
            cm.is_owner
          FROM company_members cm
          JOIN companies c ON cm.company_id = c.id
          JOIN roles r ON cm.role_id = r.id
          WHERE cm.user_id = ? AND cm.is_active = 1
        `, [userId]);

        const companies = companiesResult.map(row => ({
          company_id: row.company_id,
          company_name: typeof row.company_name === 'string'
            ? JSON.parse(row.company_name)
            : row.company_name,
          role: row.role_name,
          is_owner: row.is_owner === 1
        }));

        // 取得使用者的全域角色
        const rolesResult = await db.query<{
          role_name: string;
          name_zh: string;
          name_en: string;
        }>(`
          SELECT
            r.name as role_name,
            r.name_zh,
            r.name_en
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = ?
        `, [userId]);

        const globalRoles = rolesResult.map(row => ({
          name: row.role_name,
          display_name: row.name_zh
        }));

        return {
          user_id: userId,
          full_name: authUser?.user_metadata?.full_name || authUser?.email || 'Unknown',
          display_name: authUser?.user_metadata?.display_name || authUser?.user_metadata?.full_name || authUser?.email || 'Unknown',
          phone: authUser?.user_metadata?.phone || authUser?.phone || null,
          avatar_url: authUser?.user_metadata?.avatar_url || null,
          is_active: !(authUser as User & { banned_until?: string })?.banned_until,
          last_login_at: authUser?.last_sign_in_at || null,
          companies,
          global_roles: globalRoles
        };
      })
    );

    return NextResponse.json({
      users,
      total: users.length
    });

  } catch (error: unknown) {
    console.error('Error fetching users:', error);

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
