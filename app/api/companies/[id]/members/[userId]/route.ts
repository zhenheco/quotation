import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { updateCompanyMemberRole, removeCompanyMember } from '@/lib/services/company';

/**
 * PUT /api/companies/[id]/members/[userId]
 * Update a member's role
 * Body: { role_id: string }
 */
export const PUT = withAuth(async (request, { userId: currentUserId, params }) => {
  try {
    const { id, userId: targetUserId } = await params;
    const body = await request.json();
    const { role_id } = body;

    if (!role_id) {
      return NextResponse.json({ error: 'role_id is required' }, { status: 400 });
    }

    const member = await updateCompanyMemberRole(id, currentUserId, targetUserId, role_id);
    return NextResponse.json(member);
  } catch (error: any) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
});

/**
 * DELETE /api/companies/[id]/members/[userId]
 * Remove a member from a company
 */
export const DELETE = withAuth(async (request, { userId: currentUserId, params }) => {
  try {
    const { id, userId: targetUserId } = await params;
    await removeCompanyMember(id, currentUserId, targetUserId);
    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
});
