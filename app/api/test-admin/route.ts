import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/services/rbac';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({
      success: false,
      message: '未登入',
      user: null,
      isAdmin: false
    });
  }

  const isAdmin = await isSuperAdmin(user.id);

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
