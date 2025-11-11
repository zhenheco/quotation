import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { withAuth, withPermission } from '@/lib/middleware/withAuth';
import { getUserCompanies, getCompanyById, createCompany, updateCompany, CompanyFormData } from '@/lib/services/company';

interface UpdateCompanySettingsBody {
  companyId?: string;
  [key: string]: unknown;
}

export const GET = withAuth(async (_request, { userId }) => {
  try {
    const companies = await getUserCompanies(userId);

    if (!companies || companies.length === 0) {
      return NextResponse.json({ error: 'No companies found' }, { status: 404 });
    }

    const companyId = companies[0].company_id;
    const companySettings = await getCompanyById(companyId, userId);

    return NextResponse.json(companySettings);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
});

export const POST = withPermission('company_settings', 'write', async (request, { userId }) => {
  try {
    const body = await request.json() as Record<string, unknown> as CompanyFormData;
    const company = await createCompany(userId, body);
    return NextResponse.json(company, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
});

export const PUT = withPermission('company_settings', 'write', async (request, { userId }) => {
  try {
    const body = await request.json() as Record<string, unknown> as UpdateCompanySettingsBody;
    const { companyId, ...data } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const company = await updateCompany(companyId, userId, data);
    return NextResponse.json(company);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
});
