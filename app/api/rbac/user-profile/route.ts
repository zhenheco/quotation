import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getUserProfile, updateUserProfile } from '@/lib/services/rbac';

export const GET = withAuth(async (request, { userId }) => {
  try {
    const profile = await getUserProfile(userId);
    return NextResponse.json(profile || {});
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withAuth(async (request, { userId }) => {
  try {
    const body = await request.json();
    const profile = await updateUserProfile(userId, body);
    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
