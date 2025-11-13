import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { createApiClient } from '@/lib/supabase/api';
import { getUserCompanies, getCompanyById, createCompany, updateCompany, type Company } from '@/lib/dal/companies';
import { checkPermission } from '@/lib/dal/rbac';
import { getD1Client } from '@/lib/db/d1-client';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

type CompanyFormData = Omit<Company, 'id' | 'created_at' | 'updated_at'>;

interface UpdateCompanySettingsBody {
  companyId?: string;
  [key: string]: unknown;
}

/**
 * GET /api/company-settings
 * 取得當前用戶的公司設定
 */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext();

  try {
    const supabase = createApiClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env);
    const companies = await getUserCompanies(db, user.id);

    if (!companies || companies.length === 0) {
      return NextResponse.json({ error: 'No companies found' }, { status: 404 });
    }

    const companyId = companies[0].id;
    const companySettings = await getCompanyById(db, companyId);

    return NextResponse.json(companySettings);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * POST /api/company-settings
 * 建立新公司
 */
export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext();

  try {
    const supabase = createApiClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env);

    // 檢查權限
    const hasAccess = await checkPermission(db, user.id, 'company_settings', 'write');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions: company_settings:write' },
        { status: 403 }
      );
    }

    const body = await request.json() as Partial<CompanyFormData>;
    const company = await createCompany(db, body as CompanyFormData);

    return NextResponse.json(company, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * PUT /api/company-settings
 * 更新公司設定
 */
export async function PUT(request: NextRequest) {
  const { env } = await getCloudflareContext();

  try {
    const supabase = createApiClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env);

    // 檢查權限
    const hasAccess = await checkPermission(db, user.id, 'company_settings', 'write');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions: company_settings:write' },
        { status: 403 }
      );
    }

    const body = await request.json() as UpdateCompanySettingsBody;
    const { companyId, ...data } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const company = await updateCompany(db, companyId, data as Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>);
    return NextResponse.json(company);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
