import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createOrderFromQuotation, getOrderById } from '@/lib/dal/orders'
import { getSupabaseClient } from '@/lib/db/supabase-client'

/** 建立訂單請求類型 */
interface CreateFromQuotationBody {
  quotation_id: string
}

/**
 * POST /api/orders/from-quotation - 從報價單建立訂單
 *
 * 將已接受的報價單轉換為訂單
 * 會複製報價單的所有項目到訂單
 */
export const POST = withAuth('orders:write')(async (request, { user, db }) => {
  try {
    const body = await request.json() as CreateFromQuotationBody
    const { quotation_id } = body

    // 驗證必填欄位
    if (!quotation_id) {
      return NextResponse.json({ error: 'quotation_id is required' }, { status: 400 })
    }

    // 查詢報價單狀態
    const adminDb = getSupabaseClient()
    const { data: quotationCheck } = await adminDb
      .from('quotations')
      .select('id, status, company_id')
      .eq('id', quotation_id)
      .single()

    // 檢查報價單是否存在
    if (!quotationCheck) {
      return NextResponse.json({ error: '找不到報價單' }, { status: 404 })
    }

    // 檢查報價單狀態
    if (quotationCheck.status !== 'accepted') {
      return NextResponse.json({
        error: `報價單狀態必須為「已接受」才能建立訂單。目前狀態：${quotationCheck.status}`
      }, { status: 400 })
    }

    // 檢查 company_id
    if (!quotationCheck.company_id) {
      return NextResponse.json({
        error: '報價單缺少公司資訊，無法建立訂單。請聯繫系統管理員。'
      }, { status: 400 })
    }

    // 查詢 user_profiles.id（orders.created_by 外鍵參考 user_profiles.id，而非 auth.users.id）
    const { data: userProfile } = await adminDb
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // 如果找不到 user_profile，使用 null（created_by 允許 NULL）
    const userProfileId = userProfile?.id || null

    // 使用資料庫函數建立訂單
    const orderId = await createOrderFromQuotation(db, quotation_id, userProfileId)

    // 取得建立的訂單詳情
    // 先從訂單取得 company_id
    const { data: orderData } = await adminDb
      .from('orders')
      .select('company_id')
      .eq('id', orderId)
      .single()

    if (!orderData) {
      return NextResponse.json({ error: 'Order created but could not retrieve details' }, { status: 500 })
    }

    const order = await getOrderById(db, orderData.company_id, orderId)

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '建立訂單失敗'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
