import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getUserCompanies, createCompany } from '@/lib/services/company';

/**
 * GET /api/companies
 * Get all companies for the authenticated user
 */
export const GET = withAuth(async (request, { userId }) => {
  try {
    const companies = await getUserCompanies(userId);
    return NextResponse.json(companies);
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

/**
 * POST /api/companies
 * Create a new company
 */
export const POST = withAuth(async (request, { userId }) => {
  try {
    const body = await request.json();
    const company = await createCompany(userId, body);
    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
