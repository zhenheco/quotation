import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { isSuperAdmin } from '@/lib/dal/rbac';
import { getSupabaseClient } from '@/lib/db/supabase-client';

// Note: Edge runtime removed for OpenNext compatibility;

/**
 * GET /api/admin/companies
 * 取得所有公司列表（僅超級管理員）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request);

    // 驗證用戶
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getSupabaseClient();

    // 檢查是否為超管
    const isAdmin = await isSuperAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // 取得所有公司
    const { data: companies, error: companiesError } = await db
      .from('companies')
      .select('id, name, logo_url, created_at')
      .order('created_at', { ascending: false });

    if (companiesError) {
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }

    // 為每個公司取得額外統計資訊
    const companiesWithStats = await Promise.all(
      (companies || []).map(async (company) => {
        // 取得公司統計資料
        const [
          { count: activeMembers = 0 } = {},
          { count: totalCustomers = 0 } = {},
          { count: totalQuotations = 0 } = {}
        ] = await Promise.all([
          db.from('company_members').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('is_active', true),
          db.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
          db.from('quotations').select('*', { count: 'exact', head: true }).eq('company_id', company.id)
        ]).then(results => results.map(r => ({ count: r.count || 0 })));

        const stats = {
          active_members: activeMembers,
          total_customers: totalCustomers,
          total_quotations: totalQuotations
        };

        // 解析 JSON 格式的 name 欄位
        const companyName = typeof company.name === 'string'
          ? JSON.parse(company.name)
          : company.name;

        return {
          id: company.id,
          name: companyName,
          logo_url: company.logo_url,
          member_count: stats.active_members,
          created_at: company.created_at,
          stats
        };
      })
    );

    return NextResponse.json({
      success: true,
      companies: companiesWithStats,
      total: companiesWithStats.length
    });

  } catch (error: unknown) {
    console.error('Error fetching companies:', error);

    // 檢查是否為權限錯誤
    if (getErrorMessage(error)?.includes('Only super admin')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
