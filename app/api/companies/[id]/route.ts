import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getCompanyById, updateCompany, deleteCompany } from '@/lib/services/company';

/**
 * GET /api/companies/[id]
 * Get a specific company by ID
 */
export const GET = withAuth(async (request, { userId, params }) => {
  try {
    const { id } = await params;
    const company = await getCompanyById(id, userId);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error: any) {
    console.error('Error fetching company:', error);
    return NextResponse.json({ error: error.message }, { status: 403 });
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
  } catch (error: any) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
});

/**
 * DELETE /api/companies/[id]
 * Delete a company (owner only)
 */
export const DELETE = withAuth(async (request, { userId, params }) => {
  try {
    const { id } = await params;
    await deleteCompany(id, userId);
    return NextResponse.json({ message: 'Company deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
});
