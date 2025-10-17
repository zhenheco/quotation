import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/quotations/[id]/share
 * 生成報價單分享連結
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (quotationError || !quotation) {
      return NextResponse.json(
        { error: 'Quotation not found or access denied' },
        { status: 404 }
      )
    }

    // 檢查是否已存在有效的分享令牌
    const { data: existingToken, error: existingTokenError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('quotation_id', id)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .single()

    // 如果已存在有效的令牌，直接返回
    if (existingToken && !existingTokenError) {
      return NextResponse.json({
        success: true,
        token: existingToken.token,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/share/${existingToken.token}`,
        expiresAt: existingToken.expires_at,
      })
    }

    // 生成新的分享令牌
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'generate_share_token'
    )

    if (tokenError || !tokenData) {
      console.error('Failed to generate share token:', tokenError)
      return NextResponse.json(
        { error: 'Failed to generate share token' },
        { status: 500 }
      )
    }

    const token = tokenData

    // 計算過期時間
    let expiresAt = null
    if (expiresInDays && expiresInDays > 0) {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + expiresInDays)
      expiresAt = expiryDate.toISOString()
    }

    // 儲存分享令牌
    const { data: newToken, error: insertError } = await supabase
      .from('share_tokens')
      .insert({
        quotation_id: id,
        token,
        is_active: true,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (insertError || !newToken) {
      console.error('Failed to create share token:', insertError)
      return NextResponse.json(
        { error: 'Failed to create share token' },
        { status: 500 }
      )
    }

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
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (quotationError || !quotation) {
      return NextResponse.json(
        { error: 'Quotation not found or access denied' },
        { status: 404 }
      )
    }

    // 停用所有該報價單的分享令牌
    const { error: updateError } = await supabase
      .from('share_tokens')
      .update({ is_active: false })
      .eq('quotation_id', id)
      .eq('is_active', true)

    if (updateError) {
      console.error('Failed to deactivate share token:', updateError)
      return NextResponse.json(
        { error: 'Failed to deactivate share token' },
        { status: 500 }
      )
    }

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
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (quotationError || !quotation) {
      return NextResponse.json(
        { error: 'Quotation not found or access denied' },
        { status: 404 }
      )
    }

    // 查詢有效的分享令牌
    const { data: shareToken, error: tokenError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('quotation_id', id)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .single()

    if (tokenError && tokenError.code !== 'PGRST116') {
      // PGRST116 是 "沒有找到資料" 的錯誤代碼
      console.error('Failed to fetch share token:', tokenError)
      return NextResponse.json(
        { error: 'Failed to fetch share token' },
        { status: 500 }
      )
    }

    if (!shareToken) {
      return NextResponse.json({
        isShared: false,
      })
    }

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
