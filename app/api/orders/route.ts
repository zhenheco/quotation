import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCompanyIdFromRequest } from '@/lib/utils/company-context'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import {
  getOrders,
  createOrder,
  createOrderItems,
  recalculateOrderTotals,
  OrderQueryOptions,
  CreateOrderData,
  CreateOrderItemData,
} from '@/lib/dal/orders'

/**
 * 訂單項目輸入類型
 */
interface OrderItemInput {
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
 * 建立訂單請求類型
 */
interface CreateOrderBody {
  company_id: string
  customer_id: string
  quotation_id?: string
  order_date?: string
  expected_delivery_date?: string
  currency?: string
  exchange_rate?: number
  subtotal?: number | string
  tax_rate?: number | string
  tax_amount?: number | string
  discount_amount?: number | string
  discount_description?: string
  total_amount?: number | string
  notes?: string
  terms?: string
  shipping_address?: string
  billing_address?: string
  show_tax?: boolean
  items?: OrderItemInput[]
}

/**
 * GET /api/orders - 取得訂單列表
 */
export const GET = withAuth('orders:read')(async (request, { db }) => {
  // 取得公司 ID
  const companyId = getCompanyIdFromRequest(request)
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  // 取得查詢參數
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as 'draft' | 'confirmed' | 'shipped' | 'completed' | 'cancelled' | null
  const customerId = searchParams.get('customer_id')
  const quotationId = searchParams.get('quotation_id')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const limit = searchParams.get('limit')
  const offset = searchParams.get('offset')

  // 建立查詢選項
  const options: OrderQueryOptions = {
    companyId,
    status: status || undefined,
    customerId: customerId || undefined,
    quotationId: quotationId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: limit ? parseInt(limit, 10) : 50,
    offset: offset ? parseInt(offset, 10) : 0,
  }

  // 取得訂單列表
  const orders = await getOrders(db, options)

  // 設定快取
  const response = NextResponse.json(orders)
  response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
  return response
})

/**
 * POST /api/orders - 建立新訂單
 */
export const POST = withAuth('orders:write')(async (request, { user, db }) => {
  const body = await request.json() as CreateOrderBody
  const {
    company_id,
    customer_id,
    quotation_id,
    order_date,
    expected_delivery_date,
    currency,
    exchange_rate,
    subtotal,
    tax_rate,
    tax_amount,
    discount_amount,
    discount_description,
    total_amount,
    notes,
    terms,
    shipping_address,
    billing_address,
    show_tax,
    items,
  } = body

  // 驗證必填欄位
  if (!company_id || !customer_id) {
    return NextResponse.json({ error: 'Missing required fields: company_id and customer_id' }, { status: 400 })
  }

  // 查詢 user_profiles.id（orders.created_by 外鍵參考 user_profiles.id）
  const adminDb = getSupabaseClient()
  const { data: userProfile } = await adminDb
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // 準備訂單資料
  const orderData: CreateOrderData = {
    company_id,
    customer_id,
    quotation_id: quotation_id || undefined,
    created_by: userProfile?.id ?? undefined,
    order_date: order_date || new Date().toISOString().split('T')[0],
    expected_delivery_date: expected_delivery_date || undefined,
    currency: currency || 'TWD',
    exchange_rate: exchange_rate || 1,
    subtotal: subtotal ? parseFloat(String(subtotal)) : 0,
    tax_rate: tax_rate ? parseFloat(String(tax_rate)) : 5,
    tax_amount: tax_amount ? parseFloat(String(tax_amount)) : 0,
    discount_amount: discount_amount ? parseFloat(String(discount_amount)) : 0,
    discount_description: discount_description || undefined,
    total_amount: total_amount ? parseFloat(String(total_amount)) : 0,
    notes: notes || undefined,
    terms: terms || undefined,
    shipping_address: shipping_address || undefined,
    billing_address: billing_address || undefined,
    show_tax: show_tax !== false,
  }

  // 建立訂單
  const order = await createOrder(db, orderData)

  // 建立訂單項目
  if (items && items.length > 0) {
    const orderItems: CreateOrderItemData[] = items.map((item, index) => ({
      order_id: order.id,
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

    // 重新計算訂單金額
    const updatedOrder = await recalculateOrderTotals(db, company_id, order.id)
    return NextResponse.json(updatedOrder, { status: 201 })
  }

  return NextResponse.json(order, { status: 201 })
})
