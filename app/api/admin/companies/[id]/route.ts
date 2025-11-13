import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { isSuperAdmin } from '@/lib/dal/rbac';
import { getCompanyById, getCompanyMembers, getCompanyStats } from '@/lib/dal/companies';
import { getD1Client } from '@/lib/db/d1-client';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { User } from '@supabase/supabase-js';

export const runtime = 'edge';

/**
 * GET /api/admin/companies/[id]
 * 取得公司詳細資訊（僅超級管理員）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 檢查是否為超管
    const isAdmin = await isSuperAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    const { id: companyId } = await params;

    // 取得公司資訊
    const company = await getCompanyById(db, companyId);
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // 取得公司成員
    const dbMembers = await getCompanyMembers(db, companyId);

    // 從 Supabase Auth 取得使用者資訊
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
    }

    const authUserMap = new Map<string, User>(
      authUsers?.map(u => [u.id, u] as const) || []
    );

    const members = dbMembers.map(member => {
      const authUser = authUserMap.get(member.user_id);
      return {
        ...member,
        full_name: authUser?.user_metadata?.full_name || authUser?.email || 'Unknown',
        display_name: authUser?.user_metadata?.display_name || authUser?.user_metadata?.full_name || authUser?.email || 'Unknown',
        phone: authUser?.user_metadata?.phone || authUser?.phone || null,
        avatar_url: authUser?.user_metadata?.avatar_url || null,
      };
    });

    // 取得統計資訊
    const stats = await getCompanyStats(db, companyId);

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
