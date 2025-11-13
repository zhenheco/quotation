import { createApiClient } from '@/lib/supabase/api';
import { isSuperAdmin } from '@/lib/dal/rbac';
import { NextRequest, NextResponse } from 'next/server';
import { getD1Client } from '@/lib/db/d1-client';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext();

  const supabase = createApiClient(request);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({
      success: false,
      message: '未登入',
      user: null,
      isAdmin: false
    });
  }

  const db = getD1Client(env);
  const isAdmin = await isSuperAdmin(db, user.id);

  return NextResponse.json({
    success: true,
    message: '已登入',
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name
    },
    isAdmin
  });
}
