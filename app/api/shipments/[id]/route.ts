import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCompanyIdFromRequest } from '@/lib/utils/company-context'
import {
  getShipmentById,
  getShipmentItems,
  updateShipment,
  deleteShipment,
  deleteShipmentItems,
  createShipmentItems,
  recalculateShipmentTotals,
  CreateShipmentItemData,
} from '@/lib/dal/shipments'

/**
 * 出貨明細輸入類型
 */
interface ShipmentItemInput {
  id?: string
  order_item_id?: string
  product_id?: string | null
  product_name?: { zh: string; en: string }
  description?: string
  sku?: string
  quantity_shipped: number | string
  unit?: string
  unit_price?: number | string
  amount?: number | string
  sort_order?: number
}

/**
 * 更新出貨單請求類型
 */
interface UpdateShipmentBody {
  shipped_date?: string | null
  expected_delivery?: string | null
  carrier?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  shipping_address?: string | null
  recipient_name?: string | null
  recipient_phone?: string | null
  currency?: string
  subtotal?: number | string
  shipping_fee?: number | string
  total_amount?: number | string
  notes?: string | null
  internal_notes?: string | null
  items?: ShipmentItemInput[]
}

/**
 * GET /api/shipments/[id] - 取得出貨單詳情
 */
export const GET = withAuth('shipments:read')<{ id: string }>(async (request, { db }, { id }) => {
  // 取得公司 ID
  const companyId = getCompanyIdFromRequest(request)
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  // 取得出貨單
  const shipment = await getShipmentById(db, companyId, id)
  if (!shipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
  }

  // 取得出貨明細
  const items = await getShipmentItems(db, id)

  // 合併回傳
  const response = NextResponse.json({ ...shipment, items })
  response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
  return response
})

/**
 * PUT /api/shipments/[id] - 更新出貨單
 */
export const PUT = withAuth('shipments:write')<{ id: string }>(async (request, { db }, { id }) => {
  // 取得公司 ID
  const companyId = getCompanyIdFromRequest(request)
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  // 檢查出貨單是否存在
  const existingShipment = await getShipmentById(db, companyId, id)
  if (!existingShipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
  }

  // 只有待處理狀態可以編輯
  if (existingShipment.status !== 'pending') {
    return NextResponse.json(
      { error: `Cannot modify shipment with status: ${existingShipment.status}. Only pending shipments can be modified.` },
      { status: 400 }
    )
  }

  const body = await request.json() as UpdateShipmentBody

  // 準備更新資料
  const updateData: Record<string, unknown> = {}

  if (body.shipped_date !== undefined) updateData.shipped_date = body.shipped_date
  if (body.expected_delivery !== undefined) updateData.expected_delivery = body.expected_delivery
  if (body.carrier !== undefined) updateData.carrier = body.carrier
  if (body.tracking_number !== undefined) updateData.tracking_number = body.tracking_number
  if (body.tracking_url !== undefined) updateData.tracking_url = body.tracking_url
  if (body.shipping_address !== undefined) updateData.shipping_address = body.shipping_address
  if (body.recipient_name !== undefined) updateData.recipient_name = body.recipient_name
  if (body.recipient_phone !== undefined) updateData.recipient_phone = body.recipient_phone
  if (body.currency !== undefined) updateData.currency = body.currency
  if (body.subtotal !== undefined) updateData.subtotal = parseFloat(String(body.subtotal))
  if (body.shipping_fee !== undefined) updateData.shipping_fee = parseFloat(String(body.shipping_fee))
  if (body.total_amount !== undefined) updateData.total_amount = parseFloat(String(body.total_amount))
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.internal_notes !== undefined) updateData.internal_notes = body.internal_notes

  // 更新出貨單
  let shipment = await updateShipment(db, companyId, id, updateData)

  // 更新出貨明細（如果提供）
  if (body.items !== undefined) {
    // 簡化處理：刪除所有舊項目，建立新項目
    await deleteShipmentItems(db, id)

    if (body.items.length > 0) {
      const shipmentItems: CreateShipmentItemData[] = body.items.map((item, index) => ({
        shipment_id: id,
        order_item_id: item.order_item_id || undefined,
        product_id: item.product_id || undefined,
        product_name: item.product_name,
        description: item.description,
        sku: item.sku,
        quantity_shipped: parseFloat(String(item.quantity_shipped)),
        unit: item.unit,
        unit_price: item.unit_price ? parseFloat(String(item.unit_price)) : 0,
        amount: item.amount ? parseFloat(String(item.amount)) : 0,
        sort_order: item.sort_order ?? index,
      }))

      await createShipmentItems(db, shipmentItems)
    }

    // 重新計算出貨單金額
    shipment = await recalculateShipmentTotals(db, companyId, id)
  }

  // 取得更新後的出貨明細
  const items = await getShipmentItems(db, id)

  return NextResponse.json({ ...shipment, items })
})

/**
 * DELETE /api/shipments/[id] - 刪除出貨單
 */
export const DELETE = withAuth('shipments:delete')<{ id: string }>(async (request, { db }, { id }) => {
  // 取得公司 ID
  const companyId = getCompanyIdFromRequest(request)
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  // 刪除出貨單（只有待處理可以刪除，由 DAL 檢查）
  await deleteShipment(db, companyId, id)

  return NextResponse.json({ success: true })
})
