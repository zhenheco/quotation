import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCompanyIdFromRequest } from '@/lib/utils/company-context'
import {
  getOrderById,
  getOrderItems,
  updateOrder,
  deleteOrder,
  deleteOrderItems,
  createOrderItems,
  recalculateOrderTotals,
  CreateOrderItemData,
} from '@/lib/dal/orders'

/**
 * 訂單項目輸入類型
 */
interface OrderItemInput {
  id?: string  // 如果有 id 表示更新，沒有表示新增
  product_id?: string | null
  product_name?: { zh: string; en: string }
  description?: string
  sku?: string
  quantity: number | string
  unit?: string
  unit_price: number | string
  discount?: number | string
  amount: number | string
  sort_order?: number
}

/**
 * 更新訂單請求類型
 */
interface UpdateOrderBody {
  order_date?: string
  expected_delivery_date?: string | null
  currency?: string
  exchange_rate?: number
  subtotal?: number | string
  tax_rate?: number | string
  tax_amount?: number | string
  discount_amount?: number | string
  discount_description?: string | null
  total_amount?: number | string
  notes?: string | null
  terms?: string | null
  shipping_address?: string | null
  billing_address?: string | null
  show_tax?: boolean
  items?: OrderItemInput[]
}

/**
 * GET /api/orders/[id] - 取得訂單詳情
 */
export const GET = withAuth('orders:read')<{ id: string }>(async (request, { db }, { id }) => {
  // 取得公司 ID
  const companyId = getCompanyIdFromRequest(request)
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  // 取得訂單
  const order = await getOrderById(db, companyId, id)
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // 取得訂單項目
  const items = await getOrderItems(db, id)

  // 合併回傳
  const response = NextResponse.json({ ...order, items })
  response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
  return response
})

/**
 * PUT /api/orders/[id] - 更新訂單
 */
export const PUT = withAuth('orders:write')<{ id: string }>(async (request, { db }, { id }) => {
  // 取得公司 ID
  const companyId = getCompanyIdFromRequest(request)
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  // 檢查訂單是否存在
  const existingOrder = await getOrderById(db, companyId, id)
  if (!existingOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // 只有草稿狀態可以編輯
  if (existingOrder.status !== 'draft') {
    return NextResponse.json(
      { error: `Cannot modify order with status: ${existingOrder.status}. Only draft orders can be modified.` },
      { status: 400 }
    )
  }

  const body = await request.json() as UpdateOrderBody

  // 準備更新資料
  const updateData: Record<string, unknown> = {}

  if (body.order_date !== undefined) updateData.order_date = body.order_date
  if (body.expected_delivery_date !== undefined) updateData.expected_delivery_date = body.expected_delivery_date
  if (body.currency !== undefined) updateData.currency = body.currency
  if (body.exchange_rate !== undefined) updateData.exchange_rate = body.exchange_rate
  if (body.subtotal !== undefined) updateData.subtotal = parseFloat(String(body.subtotal))
  if (body.tax_rate !== undefined) updateData.tax_rate = parseFloat(String(body.tax_rate))
  if (body.tax_amount !== undefined) updateData.tax_amount = parseFloat(String(body.tax_amount))
  if (body.discount_amount !== undefined) updateData.discount_amount = parseFloat(String(body.discount_amount))
  if (body.discount_description !== undefined) updateData.discount_description = body.discount_description
  if (body.total_amount !== undefined) updateData.total_amount = parseFloat(String(body.total_amount))
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.terms !== undefined) updateData.terms = body.terms
  if (body.shipping_address !== undefined) updateData.shipping_address = body.shipping_address
  if (body.billing_address !== undefined) updateData.billing_address = body.billing_address
  if (body.show_tax !== undefined) updateData.show_tax = body.show_tax

  // 更新訂單
  let order = await updateOrder(db, companyId, id, updateData)

  // 更新訂單項目（如果提供）
  if (body.items !== undefined) {
    // 簡化處理：刪除所有舊項目，建立新項目
    await deleteOrderItems(db, id)

    if (body.items.length > 0) {
      const orderItems: CreateOrderItemData[] = body.items.map((item, index) => ({
        order_id: id,
        product_id: item.product_id || undefined,
        product_name: item.product_name,
        description: item.description,
        sku: item.sku,
        quantity: parseFloat(String(item.quantity)),
        unit: item.unit,
        unit_price: parseFloat(String(item.unit_price)),
        discount: item.discount ? parseFloat(String(item.discount)) : 0,
        amount: parseFloat(String(item.amount)),
        sort_order: item.sort_order ?? index,
      }))

      await createOrderItems(db, orderItems)
    }

    // 重新計算訂單金額
    order = await recalculateOrderTotals(db, companyId, id)
  }

  // 取得更新後的訂單項目
  const items = await getOrderItems(db, id)

  return NextResponse.json({ ...order, items })
})

/**
 * DELETE /api/orders/[id] - 刪除訂單
 */
export const DELETE = withAuth('orders:delete')<{ id: string }>(async (request, { db }, { id }) => {
  // 取得公司 ID
  const companyId = getCompanyIdFromRequest(request)
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  // 刪除訂單（只有草稿可以刪除，由 DAL 檢查）
  await deleteOrder(db, companyId, id)

  return NextResponse.json({ success: true })
})
