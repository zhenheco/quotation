import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdmin } from '@/lib/dal/rbac';
import { getSupabaseClient } from '@/lib/db/supabase-client';
import type { User } from '@supabase/supabase-js';

// Note: Edge runtime removed for OpenNext compatibility;

/**
 * GET /api/admin/users
 * 取得所有使用者列表（僅超級管理員）
 */
export async function GET(request: NextRequest) {
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

    const db = getSupabaseClient();

    // 檢查是否為超管
    const isAdmin = await isSuperAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // 取得所有使用者 ID（從 user_roles 獲取唯一的 user_id）
    const { data: userRolesData } = await db
      .from('user_roles')
      .select('user_id')
      .order('user_id', { ascending: true });

    const userIds = Array.from(new Set(userRolesData?.map(r => r.user_id) || []));

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
        const { data: companyMemberships } = await db
          .from('company_members')
          .select(`
            company_id,
            is_owner,
            companies (
              id,
              name
            ),
            roles (
              name
            )
          `)
          .eq('user_id', userId)
          .eq('is_active', true);

        const companies = (companyMemberships || []).map((cm: {
          company_id: string;
          is_owner: boolean;
          companies: { id: string; name: string }[] | null;
          roles: { name: string }[] | null;
        }) => {
          const company = Array.isArray(cm.companies) ? cm.companies[0] : null;
          const role = Array.isArray(cm.roles) ? cm.roles[0] : null;

          return {
            company_id: cm.company_id,
            company_name: company?.name
              ? (typeof company.name === 'string' ? JSON.parse(company.name) : company.name)
              : null,
            role: role?.name || '',
            is_owner: cm.is_owner
          };
        });

        // 取得使用者的全域角色
        const { data: userRolesWithRoles } = await db
          .from('user_roles')
          .select(`
            roles (
              name,
              name_zh,
              name_en
            )
          `)
          .eq('user_id', userId);

        const globalRoles = (userRolesWithRoles || []).map((ur: {
          roles: { name: string; name_zh: string; name_en: string }[] | null;
        }) => {
          const role = Array.isArray(ur.roles) ? ur.roles[0] : null;
          return {
            name: role?.name || '',
            display_name: role?.name_zh || ''
          };
        }).filter(r => r.name);

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
