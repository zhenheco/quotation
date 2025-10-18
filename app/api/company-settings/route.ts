import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withPermission } from '@/lib/middleware/withAuth';
import { getCompanySettings, createCompanySettings, updateCompanySettings } from '@/lib/services/company';

export const GET = withAuth(async (request, { userId }) => {
  try {
    const settings = await getCompanySettings(userId);

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withPermission('company_settings', 'write', async (request, { userId }) => {
  try {
    const body = await request.json();
    const settings = await createCompanySettings(userId, body);
    return NextResponse.json(settings, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withPermission('company_settings', 'write', async (request, { userId }) => {
  try {
    const body = await request.json();
    const settings = await updateCompanySettings(userId, body);
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
