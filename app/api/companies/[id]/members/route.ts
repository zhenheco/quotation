import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { withAuth } from '@/lib/middleware/withAuth';
import { getCompanyMembers, addCompanyMember } from '@/lib/services/company';

interface AddMemberRequest {
  user_id: string;
  role_id: string;
}

/**
 * GET /api/companies/[id]/members
 * Get all members of a company
 */
export const GET = withAuth(async (_request, { userId, params }) => {
  try {
    const resolvedParams = await params;
    const id = typeof resolvedParams.id === 'string' ? resolvedParams.id : resolvedParams.id[0];
    const members = await getCompanyMembers(id, userId);
    return NextResponse.json(members);
  } catch (error: unknown) {
    console.error('Error fetching company members:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 403 });
  }
});

/**
 * POST /api/companies/[id]/members
 * Add a new member to a company
 * Body: { user_id: string, role_id: string }
 */
export const POST = withAuth(async (request, { userId, params }) => {
  try {
    const resolvedParams = await params;
    const id = typeof resolvedParams.id === 'string' ? resolvedParams.id : resolvedParams.id[0];
    const body = await request.json() as AddMemberRequest;
    const { user_id, role_id } = body;

    if (!user_id || !role_id) {
      return NextResponse.json(
        { error: 'user_id and role_id are required' },
        { status: 400 }
      );
    }

    const member = await addCompanyMember(id, userId, user_id, role_id);
    return NextResponse.json(member, { status: 201 });
  } catch (error: unknown) {
    console.error('Error adding company member:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 403 });
  }
});
