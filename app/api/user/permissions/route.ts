import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserPermissions, isSuperAdmin } from '@/lib/services/rbac';
import { getUserCompanies } from '@/lib/services/company';

/**
 * GET /api/user/permissions
 * 取得當前使用者的權限資訊
 * 包含：全域角色、公司角色、權限列表
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

    // 檢查是否為超級管理員
    const isAdmin = await isSuperAdmin(user.id);

    // 取得使用者權限
    const permissions = await getUserPermissions(user.id);

    // 取得使用者所屬公司
    const companies = await getUserCompanies(user.id);

    // 為每個公司取得權限
    const companiesWithPermissions = companies.map(company => ({
      company_id: company.company_id,
      company_name: company.company_name,
      role_name: company.role_name,
      is_owner: company.is_owner,
      logo_url: company.logo_url,
      // 根據角色取得權限（這裡簡化處理，實際應從資料庫查詢）
      permissions: permissions ? Array.from(permissions.permissions) : []
    }));

    return NextResponse.json({
      user_id: user.id,
      is_super_admin: isAdmin,
      global_permissions: permissions ? Array.from(permissions.permissions) : [],
      role_name: permissions?.role_name,
      role_level: permissions?.role_level,
      companies: companiesWithPermissions
    });

  } catch (error: any) {
    console.error('Error fetching user permissions:', error);

    return NextResponse.json(
      { error: 'Failed to fetch user permissions' },
      { status: 500 }
    );
  }
}
