import { createApiClient } from '@/lib/supabase/api';
import { isSuperAdmin } from '@/lib/dal/rbac';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/supabase-client';

// Note: Edge runtime removed for OpenNext compatibility;

export async function GET(request: NextRequest) {
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

  const db = getSupabaseClient();
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
