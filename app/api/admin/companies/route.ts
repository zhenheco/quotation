import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getAllCompanies } from '@/lib/services/rbac';
import { query } from '@/lib/db/zeabur';

/**
 * GET /api/admin/companies
 * 取得所有公司列表（僅超級管理員）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 驗證用戶
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 取得所有公司（內部會檢查是否為超管）
    const companies = await getAllCompanies(user.id);

    // 為每個公司取得額外統計資訊
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const stats = await query(
          `SELECT
            (SELECT COUNT(*) FROM company_members WHERE company_id = $1 AND is_active = true) as active_members,
            (SELECT COUNT(*) FROM customers WHERE company_id = $1) as total_customers,
            (SELECT COUNT(*) FROM quotations WHERE company_id = $1) as total_quotations
          `,
          [company.id]
        );

        return {
          ...company,
          stats: {
            active_members: parseInt(stats.rows[0]?.active_members) || 0,
            total_customers: parseInt(stats.rows[0]?.total_customers) || 0,
            total_quotations: parseInt(stats.rows[0]?.total_quotations) || 0
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      companies: companiesWithStats,
      total: companiesWithStats.length
    });

  } catch (error: any) {
    console.error('Error fetching companies:', error);

    // 檢查是否為權限錯誤
    if (error.message?.includes('Only super admin')) {
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
