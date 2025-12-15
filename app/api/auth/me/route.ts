import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'

/**
 * GET /api/auth/me
 * 取得當前登入用戶資訊
 */
export async function GET(request: NextRequest) {
  const supabase = createApiClient(request)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    created_at: user.created_at
  })
}
