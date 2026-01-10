import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createOrderFromQuotation, getOrderById } from '@/lib/dal/orders'
import { getSupabaseClient } from '@/lib/db/supabase-client'

/**
 * 建立訂單請求類型
 */
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
  const body = await request.json() as CreateFromQuotationBody
  const { quotation_id } = body

  // 驗證必填欄位
  if (!quotation_id) {
    return NextResponse.json({ error: 'quotation_id is required' }, { status: 400 })
  }

  // 使用資料庫函數建立訂單
  const orderId = await createOrderFromQuotation(db, quotation_id, user.id)

  // 取得建立的訂單詳情
  // 先從訂單取得 company_id
  const adminDb = getSupabaseClient()
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
})
