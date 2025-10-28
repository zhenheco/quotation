import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { isSuperAdmin } from '@/lib/services/rbac';
import { getCompanyById, getCompanyMembersDetailed, getCompanyStats } from '@/lib/services/company';

/**
 * GET /api/admin/companies/[id]
 * 取得公司詳細資訊（僅超級管理員）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 檢查是否為超管
    const isAdmin = await isSuperAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    const { id: companyId } = await params;

    // 取得公司資訊（超管可以存取任何公司）
    const company = await getCompanyById(companyId, user.id);
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // 取得公司成員
    const members = await getCompanyMembersDetailed(companyId, user.id);

    // 取得統計資訊
    const stats = await getCompanyStats(companyId, user.id);

    return NextResponse.json({
      company,
      members,
      stats
    });

  } catch (error: unknown) {
    console.error('Error fetching company details:', error);

    if (getErrorMessage(error)?.includes('do not have access')) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch company details' },
      { status: 500 }
    );
  }
}
