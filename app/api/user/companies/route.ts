import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { getUserCompanies } from '@/lib/dal/companies';
import { getSupabaseClient } from '@/lib/db/supabase-client';

// Note: Edge runtime removed for OpenNext compatibility;

/**
 * GET /api/user/companies
 * 取得使用者所屬的公司列表
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

    // 取得使用者所屬公司
    const companies = await getUserCompanies(db, user.id);

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
