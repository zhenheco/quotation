import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getManageableCompanies } from '@/lib/services/rbac';

/**
 * GET /api/company/manageable
 * 取得使用者可以管理的公司列表
 * 超級管理員：所有公司
 * 一般使用者：所屬公司（且為 owner 才能管理成員）
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

    // 取得可管理的公司列表
    const companies = await getManageableCompanies(user.id);

    return NextResponse.json({
      companies,
      total: companies.length
    });

  } catch (error: any) {
    console.error('Error fetching manageable companies:', error);

    return NextResponse.json(
      { error: 'Failed to fetch manageable companies' },
      { status: 500 }
    );
  }
}
