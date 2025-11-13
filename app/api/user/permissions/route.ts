import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { getUserPermissions, isSuperAdmin, getUserRoles } from '@/lib/dal/rbac';
import { getUserCompanies } from '@/lib/dal/companies';
import { getD1Client } from '@/lib/db/d1-client';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Note: Edge runtime removed for OpenNext compatibility;

/**
 * GET /api/user/permissions
 * 取得當前使用者的權限資訊
 * 包含：全域角色、公司角色、權限列表
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

    // 檢查是否為超級管理員
    const isAdmin = await isSuperAdmin(db, user.id);

    // 取得使用者權限
    const permissions = await getUserPermissions(db, user.id);

    // 取得使用者角色
    const roles = await getUserRoles(db, user.id);

    // 取得使用者所屬公司
    const companies = await getUserCompanies(db, user.id);

    // 為每個公司準備資料
    const companiesWithPermissions = companies.map(company => ({
      company_id: company.id,
      company_name: company.name,
      logo_url: company.logo_url,
      permissions: permissions.map(p => p.name)
    }));

    const primaryRole = roles[0];

    return NextResponse.json({
      user_id: user.id,
      is_super_admin: isAdmin,
      global_permissions: permissions.map(p => p.name),
      role_name: primaryRole?.name || null,
      role_level: primaryRole?.level || null,
      companies: companiesWithPermissions
    });

  } catch (error: unknown) {
    console.error('Error fetching user permissions:', error);

    return NextResponse.json(
      { error: 'Failed to fetch user permissions' },
      { status: 500 }
    );
  }
}
