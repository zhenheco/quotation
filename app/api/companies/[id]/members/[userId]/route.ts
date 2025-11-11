import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { withAuth } from '@/lib/middleware/withAuth';
import { updateCompanyMemberRole, removeCompanyMember } from '@/lib/services/company';
import { UpdateMemberRoleRequest } from '@/app/api/types';

/**
 * PUT /api/companies/[id]/members/[userId]
 * Update a member's role
 * Body: { role_id: string }
 */
export const PUT = withAuth(async (request, { userId: currentUserId, params }) => {
  try {
    const resolvedParams = await params;
    const id = typeof resolvedParams.id === 'string' ? resolvedParams.id : resolvedParams.id[0];
    const targetUserId = typeof resolvedParams.userId === 'string' ? resolvedParams.userId : resolvedParams.userId[0];
    const body = await request.json() as UpdateMemberRoleRequest;
    const { role_id } = body;

    if (!role_id) {
      return NextResponse.json({ error: 'role_id is required' }, { status: 400 });
    }

    const member = await updateCompanyMemberRole(id, currentUserId, targetUserId, role_id);
    return NextResponse.json(member);
  } catch (error: unknown) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 403 });
  }
});

/**
 * DELETE /api/companies/[id]/members/[userId]
 * Remove a member from a company
 */
export const DELETE = withAuth(async (_request, { userId: currentUserId, params }) => {
  try {
    const resolvedParams = await params;
    const id = typeof resolvedParams.id === 'string' ? resolvedParams.id : resolvedParams.id[0];
    const targetUserId = typeof resolvedParams.userId === 'string' ? resolvedParams.userId : resolvedParams.userId[0];
    await removeCompanyMember(id, currentUserId, targetUserId);
    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error: unknown) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 403 });
  }
});
