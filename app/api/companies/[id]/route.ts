import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { withAuth } from '@/lib/middleware/withAuth';
import { updateCompany, deleteCompany } from '@/lib/services/company';
import { createApiClient } from '@/lib/supabase/api';

/**
 * GET /api/companies/[id]
 * Get a specific company by ID
 */
export const GET = withAuth(async (request, { userId, params }) => {
  try {
    const { id } = await params;
    const supabase = createApiClient(request);

    // Check if user is member of this company
    const { data: membership, error: memberError } = await supabase
      .from('company_members')
      .select('id')
      .eq('company_id', id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'You do not have access to this company' }, { status: 403 });
    }

    // Fetch company data
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error('Error fetching company:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

/**
 * PUT /api/companies/[id]
 * Update a company
 */
export const PUT = withAuth(async (request, { userId, params }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const company = await updateCompany(id, userId, body);
    return NextResponse.json(company);
  } catch (error: unknown) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 403 });
  }
});

/**
 * DELETE /api/companies/[id]
 * Delete a company (owner only)
 */
export const DELETE = withAuth(async (_request, { userId, params }) => {
  try {
    const { id } = await params;
    await deleteCompany(id, userId);
    return NextResponse.json({ message: 'Company deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 403 });
  }
});
