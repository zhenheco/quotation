import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { getManageableCompanies } from '@/lib/dal/companies';
import { getSupabaseClient } from '@/lib/db/supabase-client';

// Note: Edge runtime removed for OpenNext compatibility;

/**
 * GET /api/company/manageable
 * 取得使用者可以管理的公司列表
 * 超級管理員：所有公司
 * 一般使用者：所屬公司（且為 owner 才能管理成員）
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

    // 取得可管理的公司列表
    const companies = await getManageableCompanies(db, user.id);

    return NextResponse.json({
      companies,
      total: companies.length
    });

  } catch (error: unknown) {
    console.error('Error fetching manageable companies:', error);

    return NextResponse.json(
      { error: 'Failed to fetch manageable companies' },
      { status: 500 }
    );
  }
}
