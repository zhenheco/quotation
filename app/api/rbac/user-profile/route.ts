import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { createApiClient } from '@/lib/supabase/api';

// Note: Edge runtime removed for OpenNext compatibility;

/**
 * GET /api/rbac/user-profile
 * 取得當前用戶的 profile 資訊（從 Supabase Auth user_metadata）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 從 user metadata 返回 profile 資訊（支援 Google OAuth 的 name/picture 欄位）
    const profile = {
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      display_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || null,
      phone: user.user_metadata?.phone || user.phone || null,
      department: user.user_metadata?.department || null,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    };

    return NextResponse.json(profile || {});
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * PUT /api/rbac/user-profile
 * 更新當前用戶的 profile 資訊（更新 Supabase Auth user_metadata）
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createApiClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as Partial<{
      full_name: string;
      display_name: string;
      phone: string;
      department: string;
      avatar_url: string;
    }>;

    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // 更新 user metadata
    const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        ...body
      }
    });

    if (updateError) {
      throw updateError;
    }

    // 返回更新後的 profile（支援 Google OAuth 的 name/picture 欄位）
    const profile = {
      user_id: updatedUser.user.id,
      email: updatedUser.user.email,
      full_name: updatedUser.user.user_metadata?.full_name || updatedUser.user.user_metadata?.name || null,
      display_name: updatedUser.user.user_metadata?.display_name || updatedUser.user.user_metadata?.full_name || updatedUser.user.user_metadata?.name || null,
      phone: updatedUser.user.user_metadata?.phone || updatedUser.user.phone || null,
      department: updatedUser.user.user_metadata?.department || null,
      avatar_url: updatedUser.user.user_metadata?.avatar_url || updatedUser.user.user_metadata?.picture || null,
    };

    return NextResponse.json(profile);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
