/**
 * 訂單資料存取層 (DAL)
 * Orders Data Access Layer
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================================================
// 類型定義
// ============================================================================

export type OrderStatus = 'draft' | 'confirmed' | 'shipped' | 'completed' | 'cancelled'

export interface Order {
  id: string
  company_id: string
  quotation_id: string | null
  customer_id: string
  created_by: string | null
  order_number: string
  status: OrderStatus
  order_date: string
  expected_delivery_date: string | null
  currency: string
  exchange_rate: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  discount_description: string | null
  total_amount: number
  notes: string | null
  terms: string | null
  shipping_address: string | null
  billing_address: string | null
  show_tax: boolean
  created_at: string
  updated_at: string
}

export interface OrderWithCustomer extends Order {
  customer: {
    id: string
    name: { zh: string; en: string }
    email: string
    phone: string | null
    tax_id: string | null
  } | null
  quotation: {
    id: string
    quotation_number: string
  } | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  quotation_item_id: string | null
  product_name: { zh: string; en: string } | null
  description: string | null
  sku: string | null
  quantity: number
  unit: string | null
  unit_price: number
  discount: number
  amount: number
  quantity_shipped: number
  quantity_remaining: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface OrderQueryOptions {
  companyId: string
  status?: OrderStatus
  customerId?: string
  quotationId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export interface CreateOrderData {
  company_id: string
  quotation_id?: string
  customer_id: string
  created_by?: string
  order_number?: string
  order_date?: string
  expected_delivery_date?: string
  currency?: string
  exchange_rate?: number
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  discount_amount?: number
  discount_description?: string
  total_amount?: number
  notes?: string
  terms?: string
  shipping_address?: string
  billing_address?: string
  show_tax?: boolean
}

export interface CreateOrderItemData {
  order_id: string
  product_id?: string
  quotation_item_id?: string
  product_name?: { zh: string; en: string }
  description?: string
  sku?: string
  quantity: number
  unit?: string
  unit_price: number
  discount?: number
  amount: number
  sort_order?: number
}

// ============================================================================
// 訂單查詢函數
// ============================================================================

/**
 * 取得訂單列表
 */
export async function getOrders(
  db: SupabaseClient,
  options: OrderQueryOptions
): Promise<OrderWithCustomer[]> {
  const { companyId, status, customerId, quotationId, dateFrom, dateTo, limit = 50, offset = 0 } = options

  let query = db
    .from('orders')
    .select(`
      *,
      customer:customers (
        id,
        name,
        email,
        phone,
        tax_id
      ),
      quotation:quotations (
        id,
        quotation_number
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  if (quotationId) {
    query = query.eq('quotation_id', quotationId)
  }

  if (dateFrom) {
    query = query.gte('order_date', dateFrom)
  }

  if (dateTo) {
    query = query.lte('order_date', dateTo)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get orders: ${error.message}`)
  }

  return (data || []) as OrderWithCustomer[]
}

/**
 * 取得訂單詳情
 */
export async function getOrderById(
  db: SupabaseClient,
  companyId: string,
  orderId: string
): Promise<OrderWithCustomer | null> {
  const { data, error } = await db
    .from('orders')
    .select(`
      *,
      customer:customers (
        id,
        name,
        email,
        phone,
        tax_id,
        address
      ),
      quotation:quotations (
        id,
        quotation_number
      )
    `)
    .eq('id', orderId)
    .eq('company_id', companyId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get order: ${error.message}`)
  }

  return data as OrderWithCustomer | null
}

/**
 * 計算訂單統計
 */
export async function getOrderStats(
  db: SupabaseClient,
  companyId: string
): Promise<{
  total: number
  draft: number
  confirmed: number
  shipped: number
  completed: number
  cancelled: number
}> {
  const { data, error } = await db
    .from('orders')
    .select('status')
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`Failed to get order stats: ${error.message}`)
  }

  const stats = {
    total: data?.length || 0,
    draft: 0,
    confirmed: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0
  }

  data?.forEach(order => {
    const status = order.status as OrderStatus
    if (status in stats) {
      stats[status]++
    }
  })

  return stats
}

// ============================================================================
// 訂單 CRUD 函數
// ============================================================================

/**
 * 建立訂單
 */
export async function createOrder(
  db: SupabaseClient,
  data: CreateOrderData
): Promise<Order> {
  const now = new Date().toISOString()

  const { data: order, error } = await db
    .from('orders')
    .insert({
      company_id: data.company_id,
      quotation_id: data.quotation_id || null,
      customer_id: data.customer_id,
      created_by: data.created_by || null,
      order_number: data.order_number || null, // 會由 trigger 自動產生
      status: 'draft',
      order_date: data.order_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: data.expected_delivery_date || null,
      currency: data.currency || 'TWD',
      exchange_rate: data.exchange_rate || 1,
      subtotal: data.subtotal || 0,
      tax_rate: data.tax_rate || 5,
      tax_amount: data.tax_amount || 0,
      discount_amount: data.discount_amount || 0,
      discount_description: data.discount_description || null,
      total_amount: data.total_amount || 0,
      notes: data.notes || null,
      terms: data.terms || null,
      shipping_address: data.shipping_address || null,
      billing_address: data.billing_address || null,
      show_tax: data.show_tax !== false,
      created_at: now,
      updated_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`)
  }

  return order
}

/**
 * 從報價單建立訂單（使用資料庫函數）
 */
export async function createOrderFromQuotation(
  db: SupabaseClient,
  quotationId: string,
  createdBy?: string
): Promise<string> {
  const { data, error } = await db.rpc('create_order_from_quotation', {
    p_quotation_id: quotationId,
    p_created_by: createdBy || null
  })

  if (error) {
    throw new Error(`Failed to create order from quotation: ${error.message}`)
  }

  return data as string
}

/**
 * 更新訂單
 */
export async function updateOrder(
  db: SupabaseClient,
  companyId: string,
  orderId: string,
  data: Partial<Omit<Order, 'id' | 'company_id' | 'created_at' | 'updated_at'>>
): Promise<Order> {
  const { data: order, error } = await db
    .from('orders')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update order: ${error.message}`)
  }

  return order
}

/**
 * 確認訂單
 */
export async function confirmOrder(
  db: SupabaseClient,
  companyId: string,
  orderId: string
): Promise<Order> {
  // 先檢查訂單狀態
  const { data: existing, error: checkError } = await db
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('company_id', companyId)
    .single()

  if (checkError) {
    throw new Error(`Order not found: ${checkError.message}`)
  }

  if (existing.status !== 'draft') {
    throw new Error(`Only draft orders can be confirmed. Current status: ${existing.status}`)
  }

  return updateOrder(db, companyId, orderId, { status: 'confirmed' })
}

/**
 * 取消訂單
 */
export async function cancelOrder(
  db: SupabaseClient,
  companyId: string,
  orderId: string
): Promise<Order> {
  // 先檢查訂單狀態
  const { data: existing, error: checkError } = await db
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('company_id', companyId)
    .single()

  if (checkError) {
    throw new Error(`Order not found: ${checkError.message}`)
  }

  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw new Error(`Cannot cancel order with status: ${existing.status}`)
  }

  return updateOrder(db, companyId, orderId, { status: 'cancelled' })
}

/**
 * 刪除訂單（僅限草稿）
 */
export async function deleteOrder(
  db: SupabaseClient,
  companyId: string,
  orderId: string
): Promise<void> {
  // 先檢查訂單狀態
  const { data: existing, error: checkError } = await db
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('company_id', companyId)
    .single()

  if (checkError) {
    throw new Error(`Order not found: ${checkError.message}`)
  }

  if (existing.status !== 'draft') {
    throw new Error('Only draft orders can be deleted')
  }

  const { error } = await db
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`Failed to delete order: ${error.message}`)
  }
}

// ============================================================================
// 訂單明細函數
// ============================================================================

/**
 * 取得訂單明細
 */
export async function getOrderItems(
  db: SupabaseClient,
  orderId: string
): Promise<OrderItem[]> {
  const { data, error } = await db
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('sort_order')

  if (error) {
    throw new Error(`Failed to get order items: ${error.message}`)
  }

  return data || []
}

/**
 * 建立訂單明細
 */
export async function createOrderItem(
  db: SupabaseClient,
  data: CreateOrderItemData
): Promise<OrderItem> {
  const now = new Date().toISOString()

  const { data: item, error } = await db
    .from('order_items')
    .insert({
      order_id: data.order_id,
      product_id: data.product_id || null,
      quotation_item_id: data.quotation_item_id || null,
      product_name: data.product_name || null,
      description: data.description || null,
      sku: data.sku || null,
      quantity: data.quantity,
      unit: data.unit || null,
      unit_price: data.unit_price,
      discount: data.discount || 0,
      amount: data.amount,
      sort_order: data.sort_order || 0,
      created_at: now,
      updated_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create order item: ${error.message}`)
  }

  return item
}

/**
 * 更新訂單明細
 */
export async function updateOrderItem(
  db: SupabaseClient,
  itemId: string,
  data: Partial<Omit<OrderItem, 'id' | 'order_id' | 'created_at' | 'updated_at'>>
): Promise<OrderItem> {
  const { data: item, error } = await db
    .from('order_items')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update order item: ${error.message}`)
  }

  return item
}

/**
 * 刪除訂單明細
 */
export async function deleteOrderItem(
  db: SupabaseClient,
  itemId: string
): Promise<void> {
  const { error } = await db
    .from('order_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    throw new Error(`Failed to delete order item: ${error.message}`)
  }
}

/**
 * 批次建立訂單明細
 */
export async function createOrderItems(
  db: SupabaseClient,
  items: CreateOrderItemData[]
): Promise<OrderItem[]> {
  if (items.length === 0) return []

  const now = new Date().toISOString()

  const insertData = items.map((item, index) => ({
    order_id: item.order_id,
    product_id: item.product_id || null,
    quotation_item_id: item.quotation_item_id || null,
    product_name: item.product_name || null,
    description: item.description || null,
    sku: item.sku || null,
    quantity: item.quantity,
    unit: item.unit || null,
    unit_price: item.unit_price,
    discount: item.discount || 0,
    amount: item.amount,
    sort_order: item.sort_order ?? index,
    created_at: now,
    updated_at: now
  }))

  const { data, error } = await db
    .from('order_items')
    .insert(insertData)
    .select()

  if (error) {
    throw new Error(`Failed to create order items: ${error.message}`)
  }

  return data || []
}

/**
 * 刪除訂單所有明細
 */
export async function deleteOrderItems(
  db: SupabaseClient,
  orderId: string
): Promise<void> {
  const { error } = await db
    .from('order_items')
    .delete()
    .eq('order_id', orderId)

  if (error) {
    throw new Error(`Failed to delete order items: ${error.message}`)
  }
}

// ============================================================================
// 重新計算訂單金額
// ============================================================================

/**
 * 重新計算訂單金額
 */
export async function recalculateOrderTotals(
  db: SupabaseClient,
  companyId: string,
  orderId: string
): Promise<Order> {
  // 取得訂單明細
  const items = await getOrderItems(db, orderId)

  // 取得訂單資訊
  const { data: order, error: orderError } = await db
    .from('orders')
    .select('tax_rate, discount_amount')
    .eq('id', orderId)
    .single()

  if (orderError) {
    throw new Error(`Order not found: ${orderError.message}`)
  }

  // 計算小計
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0)

  // 計算稅額
  const taxRate = Number(order.tax_rate) || 5
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100

  // 計算總金額
  const discountAmount = Number(order.discount_amount) || 0
  const totalAmount = subtotal + taxAmount - discountAmount

  // 更新訂單
  return updateOrder(db, companyId, orderId, {
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount
  })
}
