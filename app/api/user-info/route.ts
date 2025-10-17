import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 獲取當前登入用戶的資訊
 * 主要用於獲取 User ID 以建立測試數據
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // 獲取當前用戶
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Not authenticated. Please login first.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      metadata: user.user_metadata,
      message: 'User ID retrieved successfully'
    })
  } catch (error) {
    console.error('User info error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
