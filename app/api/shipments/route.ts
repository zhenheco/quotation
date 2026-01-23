import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCompanyIdFromRequest } from '@/lib/utils/company-context'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import {
  getShipments,
  createShipment,
  createShipmentItems,
  recalculateShipmentTotals,
  ShipmentQueryOptions,
  CreateShipmentData,
  CreateShipmentItemData,
} from '@/lib/dal/shipments'

/**
 * 出貨明細輸入類型
 */
interface ShipmentItemInput {
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
 * 建立出貨單請求類型
 */
interface CreateShipmentBody {
  company_id: string
  order_id: string
  customer_id?: string
  shipped_date?: string
  expected_delivery?: string
  carrier?: string
  tracking_number?: string
  tracking_url?: string
  shipping_address?: string
  recipient_name?: string
  recipient_phone?: string
  currency?: string
  subtotal?: number | string
  shipping_fee?: number | string
  total_amount?: number | string
  notes?: string
  internal_notes?: string
  items?: ShipmentItemInput[]
}

/**
 * GET /api/shipments - 取得出貨單列表
 */
export const GET = withAuth('shipments:read')(async (request, { db }) => {
  // 取得公司 ID
  const companyId = getCompanyIdFromRequest(request)
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  // 取得查詢參數
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as 'pending' | 'in_transit' | 'delivered' | 'cancelled' | null
  const orderId = searchParams.get('order_id')
  const customerId = searchParams.get('customer_id')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const limit = searchParams.get('limit')
  const offset = searchParams.get('offset')

  // 建立查詢選項
  const options: ShipmentQueryOptions = {
    companyId,
    status: status || undefined,
    orderId: orderId || undefined,
    customerId: customerId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: limit ? parseInt(limit, 10) : 50,
    offset: offset ? parseInt(offset, 10) : 0,
  }

  // 取得出貨單列表
  const shipments = await getShipments(db, options)

  // 設定快取
  const response = NextResponse.json(shipments)
  response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
  return response
})

/**
 * POST /api/shipments - 建立新出貨單
 */
export const POST = withAuth('shipments:write')(async (request, { user, db }) => {
  const body = await request.json() as CreateShipmentBody
  const {
    company_id,
    order_id,
    customer_id,
    shipped_date,
    expected_delivery,
    carrier,
    tracking_number,
    tracking_url,
    shipping_address,
    recipient_name,
    recipient_phone,
    currency,
    subtotal,
    shipping_fee,
    total_amount,
    notes,
    internal_notes,
    items,
  } = body

  // 驗證必填欄位
  if (!company_id || !order_id) {
    return NextResponse.json({ error: 'Missing required fields: company_id and order_id' }, { status: 400 })
  }

  // 查詢 user_profiles.id（shipments.created_by 外鍵參考 user_profiles.id）
  const adminDb = getSupabaseClient()
  const { data: userProfile } = await adminDb
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // 準備出貨單資料
  const shipmentData: CreateShipmentData = {
    company_id,
    order_id,
    customer_id: customer_id || undefined,
    created_by: userProfile?.id ?? undefined,
    shipped_date: shipped_date || undefined,
    expected_delivery: expected_delivery || undefined,
    carrier: carrier || undefined,
    tracking_number: tracking_number || undefined,
    tracking_url: tracking_url || undefined,
    shipping_address: shipping_address || undefined,
    recipient_name: recipient_name || undefined,
    recipient_phone: recipient_phone || undefined,
    currency: currency || 'TWD',
    subtotal: subtotal ? parseFloat(String(subtotal)) : 0,
    shipping_fee: shipping_fee ? parseFloat(String(shipping_fee)) : 0,
    total_amount: total_amount ? parseFloat(String(total_amount)) : 0,
    notes: notes || undefined,
    internal_notes: internal_notes || undefined,
  }

  // 建立出貨單
  const shipment = await createShipment(db, shipmentData)

  // 建立出貨明細
  if (items && items.length > 0) {
    const shipmentItems: CreateShipmentItemData[] = items.map((item, index) => ({
      shipment_id: shipment.id,
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

    // 重新計算出貨單金額
    const updatedShipment = await recalculateShipmentTotals(db, company_id, shipment.id)
    return NextResponse.json(updatedShipment, { status: 201 })
  }

  return NextResponse.json(shipment, { status: 201 })
})
