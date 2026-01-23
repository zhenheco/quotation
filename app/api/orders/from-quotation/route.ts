import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createOrderFromQuotation, getOrderById } from '@/lib/dal/orders'
import { getSupabaseClient } from '@/lib/db/supabase-client'

// 強制動態渲染，禁止快取
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/orders/from-quotation - 從報價單建立訂單
 *
 * 將已接受的報價單轉換為訂單，會複製報價單的所有項目到訂單
 */
export const POST = withAuth('orders:write')(async (request, { user }) => {
  const body = await request.json() as { quotation_id?: string }
  const { quotation_id } = body

  if (!quotation_id) {
    return NextResponse.json({ error: 'quotation_id is required' }, { status: 400 })
  }

  const adminDb = getSupabaseClient()

  // 同時查詢報價單和使用者資料（減少資料庫往返）
  const [quotationResult, userProfileResult] = await Promise.all([
    adminDb
      .from('quotations')
      .select('id, status, company_id')
      .eq('id', quotation_id)
      .single(),
    adminDb
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
  ])

  const quotation = quotationResult.data

  if (!quotation) {
    return NextResponse.json({ error: '找不到報價單' }, { status: 404 })
  }

  if (quotation.status !== 'accepted') {
    return NextResponse.json({
      error: `報價單狀態必須為「已接受」才能建立訂單。目前狀態：${quotation.status}`
    }, { status: 400 })
  }

  if (!quotation.company_id) {
    return NextResponse.json({
      error: '報價單缺少公司資訊，無法建立訂單。請聯繫系統管理員。'
    }, { status: 400 })
  }

  // created_by 允許 NULL，找不到 user_profile 時使用 null
  const userProfileId = userProfileResult.data?.id ?? null

  // Debug: 記錄傳入的值（可在錯誤時幫助診斷）
  // API Version: 2026-01-23-v3 (用於確認部署)
  console.log('[from-quotation] API v2026-01-23-v3 Creating order:', {
    quotation_id,
    user_id: user.id,
    userProfileId,
    userProfileFound: !!userProfileResult.data
  })

  try {
    // 使用 adminDb 呼叫 RPC，確保繞過任何 RLS 限制
    const orderId = await createOrderFromQuotation(adminDb, quotation_id, userProfileId)

    // 使用報價單的 company_id 查詢訂單（已驗證存在）
    const order = await getOrderById(adminDb, quotation.company_id, orderId)

    if (!order) {
      return NextResponse.json({ error: '訂單建立成功但無法取得詳情' }, { status: 500 })
    }

    const successResponse = NextResponse.json(order, { status: 201 })
    successResponse.headers.set('Cache-Control', 'no-store')
    successResponse.headers.set('X-API-Version', 'v5')
    return successResponse
  } catch (error) {
    const message = error instanceof Error ? error.message : '建立訂單失敗'
    const timestamp = new Date().toISOString()
    console.error('[from-quotation] API v4 Error:', {
      timestamp,
      error: message,
      quotation_id,
      userProfileId,
      user_id: user.id
    })
    // 強制在錯誤訊息前加入版本號，確認部署
    const errorWithVersion = `[API-v5-${timestamp}] ${message}`
    const response = NextResponse.json({
      error: errorWithVersion,
      _debug: {
        apiVersion: 'v5',
        deployTime: '2026-01-23T07:00',
        timestamp,
        userProfileId,
        userProfileFound: !!userProfileId,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30)
      }
    }, { status: 500 })
    // 防止任何快取
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('X-API-Version', 'v5')
    return response
  }
})
