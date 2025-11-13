import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { isSuperAdmin } from '@/lib/dal/rbac';
import { getD1Client } from '@/lib/db/d1-client';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Note: Edge runtime removed for OpenNext compatibility;

/**
 * GET /api/admin/companies
 * 取得所有公司列表（僅超級管理員）
 */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext();

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

    const db = getD1Client(env);

    // 檢查是否為超管
    const isAdmin = await isSuperAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // 取得所有公司
    const companies = await db.query<{
      id: string;
      name: string;
      logo_url: string | null;
      created_at: string;
    }>(`
      SELECT id, name, logo_url, created_at
      FROM companies
      ORDER BY created_at DESC
    `);

    // 為每個公司取得額外統計資訊
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        // 取得公司統計資料 - SQLite 語法
        const statsResult = await db.query<{
          active_members: number;
          total_customers: number;
          total_quotations: number;
        }>(`
          SELECT
            (SELECT COUNT(*) FROM company_members WHERE company_id = ? AND is_active = 1) as active_members,
            (SELECT COUNT(*) FROM customers WHERE company_id = ?) as total_customers,
            (SELECT COUNT(*) FROM quotations WHERE company_id = ?) as total_quotations
        `, [company.id, company.id, company.id]);

        const stats = statsResult[0] || {
          active_members: 0,
          total_customers: 0,
          total_quotations: 0
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
          stats: {
            active_members: stats.active_members,
            total_customers: stats.total_customers,
            total_quotations: stats.total_quotations
          }
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
