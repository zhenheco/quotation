import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createShipmentFromOrder, getShipmentById } from '@/lib/dal/shipments'
import { getSupabaseClient } from '@/lib/db/supabase-client'

/**
 * 從訂單建立出貨單請求類型
 */
interface CreateFromOrderBody {
  order_id: string
  ship_all?: boolean  // 是否出貨全部剩餘數量，預設 true
}

/**
 * POST /api/shipments/from-order - 從訂單建立出貨單
 *
 * 從已確認的訂單建立出貨單
 * 可選擇出貨全部剩餘數量或建立空白出貨單
 */
export const POST = withAuth('shipments:write')(async (request, { user, db }) => {
  const body = await request.json() as CreateFromOrderBody
  const { order_id, ship_all = true } = body

  // 驗證必填欄位
  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
  }

  // 使用 admin client 呼叫 RPC 函數（因為函數內部需要查詢 user_profiles）
  const adminDb = getSupabaseClient()
  const shipmentId = await createShipmentFromOrder(adminDb, order_id, user.id, ship_all)

  // 取得建立的出貨單詳情
  const { data: shipmentData } = await adminDb
    .from('shipments')
    .select('company_id')
    .eq('id', shipmentId)
    .single()

  if (!shipmentData) {
    return NextResponse.json({ error: 'Shipment created but could not retrieve details' }, { status: 500 })
  }

  const shipment = await getShipmentById(db, shipmentData.company_id, shipmentId)

  return NextResponse.json(shipment, { status: 201 })
})
