import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getZeaburPool } from '@/lib/db/zeabur'

/**
 * POST /api/quotations/[id]/share
 * 生成報價單分享連結
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pool = getZeaburPool()

  try {
    const { id } = await params
    const supabase = await createClient()

    // 驗證用戶身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 解析請求參數
    const body = await request.json()
    const { expiresInDays } = body // 可選：設定過期天數

    // 驗證報價單是否存在且屬於當前用戶
    const quotationResult = await pool.query(
      'SELECT id, user_id FROM quotations WHERE id = $1 AND user_id = $2',
      [id, user.id]
    )

    if (quotationResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Quotation not found or access denied' },
        { status: 404 }
      )
    }

    // 檢查是否已存在有效的分享令牌
    const now = new Date().toISOString()
    const existingTokenResult = await pool.query(
      `SELECT * FROM share_tokens
       WHERE quotation_id = $1
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > $2)
       LIMIT 1`,
      [id, now]
    )

    // 如果已存在有效的令牌，直接返回
    if (existingTokenResult.rows.length > 0) {
      const existingToken = existingTokenResult.rows[0]
      return NextResponse.json({
        success: true,
        token: existingToken.token,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/share/${existingToken.token}`,
        expiresAt: existingToken.expires_at,
      })
    }

    // 生成新的分享令牌
    const tokenResult = await pool.query('SELECT generate_share_token() as token')
    const token = tokenResult.rows[0].token

    // 計算過期時間
    let expiresAt = null
    if (expiresInDays && expiresInDays > 0) {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + expiresInDays)
      expiresAt = expiryDate.toISOString()
    }

    // 儲存分享令牌
    const insertResult = await pool.query(
      `INSERT INTO share_tokens (quotation_id, token, is_active, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, token, true, expiresAt]
    )

    const newToken = insertResult.rows[0]

    return NextResponse.json({
      success: true,
      token: newToken.token,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/share/${newToken.token}`,
      expiresAt: newToken.expires_at,
    })
  } catch (error) {
    console.error('Error in share endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/quotations/[id]/share
 * 停用報價單分享連結
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pool = getZeaburPool()

  try {
    const { id } = await params
    const supabase = await createClient()

    // 驗證用戶身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 驗證報價單是否存在且屬於當前用戶
    const quotationResult = await pool.query(
      'SELECT id, user_id FROM quotations WHERE id = $1 AND user_id = $2',
      [id, user.id]
    )

    if (quotationResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Quotation not found or access denied' },
        { status: 404 }
      )
    }

    // 停用所有該報價單的分享令牌
    await pool.query(
      'UPDATE share_tokens SET is_active = false WHERE quotation_id = $1 AND is_active = true',
      [id]
    )

    return NextResponse.json({
      success: true,
      message: 'Share link deactivated successfully',
    })
  } catch (error) {
    console.error('Error in delete share endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/quotations/[id]/share
 * 取得報價單的分享狀態
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pool = getZeaburPool()

  try {
    const { id } = await params
    const supabase = await createClient()

    // 驗證用戶身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 驗證報價單是否存在且屬於當前用戶
    const quotationResult = await pool.query(
      'SELECT id, user_id FROM quotations WHERE id = $1 AND user_id = $2',
      [id, user.id]
    )

    if (quotationResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Quotation not found or access denied' },
        { status: 404 }
      )
    }

    // 查詢有效的分享令牌
    const now = new Date().toISOString()
    const tokenResult = await pool.query(
      `SELECT * FROM share_tokens
       WHERE quotation_id = $1
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > $2)
       LIMIT 1`,
      [id, now]
    )

    if (tokenResult.rows.length === 0) {
      return NextResponse.json({
        isShared: false,
      })
    }

    const shareToken = tokenResult.rows[0]

    return NextResponse.json({
      isShared: true,
      token: shareToken.token,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/share/${shareToken.token}`,
      expiresAt: shareToken.expires_at,
      viewCount: shareToken.view_count,
      lastViewedAt: shareToken.last_viewed_at,
    })
  } catch (error) {
    console.error('Error in get share endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
