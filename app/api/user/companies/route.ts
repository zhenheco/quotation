import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getUserCompanies } from '@/lib/services/company';

/**
 * GET /api/user/companies
 * 取得使用者所屬的公司列表
 */
export async function GET(_request: NextRequest) {
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

    // 取得使用者所屬公司
    const companies = await getUserCompanies(user.id);

    return NextResponse.json({
      companies,
      total: companies.length
    });

  } catch (error: unknown) {
    console.error('Error fetching user companies:', error);

    return NextResponse.json(
      { error: 'Failed to fetch user companies' },
      { status: 500 }
    );
  }
}
