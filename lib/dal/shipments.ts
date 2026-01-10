/**
 * 出貨單資料存取層 (DAL)
 * Shipments Data Access Layer
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================================================
// 類型定義
// ============================================================================

export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled'

export interface Shipment {
  id: string
  company_id: string
  order_id: string
  customer_id: string | null
  created_by: string | null
  shipment_number: string
  status: ShipmentStatus
  shipped_date: string | null
  expected_delivery: string | null
  actual_delivery: string | null
  carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  shipping_address: string | null
  recipient_name: string | null
  recipient_phone: string | null
  currency: string
  subtotal: number
  shipping_fee: number
  total_amount: number
  notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
}

export interface ShipmentWithRelations extends Shipment {
  order: {
    id: string
    order_number: string
    status: string
  } | null
  customer: {
    id: string
    name: { zh: string; en: string }
    email: string
    phone: string | null
  } | null
}

export interface ShipmentItem {
  id: string
  shipment_id: string
  order_item_id: string | null
  product_id: string | null
  product_name: { zh: string; en: string } | null
  description: string | null
  sku: string | null
  quantity_shipped: number
  unit: string | null
  unit_price: number
  amount: number
  sort_order: number
  created_at: string
}

export interface ShipmentQueryOptions {
  companyId: string
  status?: ShipmentStatus
  orderId?: string
  customerId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export interface CreateShipmentData {
  company_id: string
  order_id: string
  customer_id?: string
  created_by?: string
  shipment_number?: string
  shipped_date?: string
  expected_delivery?: string
  carrier?: string
  tracking_number?: string
  tracking_url?: string
  shipping_address?: string
  recipient_name?: string
  recipient_phone?: string
  currency?: string
  subtotal?: number
  shipping_fee?: number
  total_amount?: number
  notes?: string
  internal_notes?: string
}

export interface CreateShipmentItemData {
  shipment_id: string
  order_item_id?: string
  product_id?: string
  product_name?: { zh: string; en: string }
  description?: string
  sku?: string
  quantity_shipped: number
  unit?: string
  unit_price?: number
  amount?: number
  sort_order?: number
}

// ============================================================================
// 出貨單查詢函數
// ============================================================================

/**
 * 取得出貨單列表
 */
export async function getShipments(
  db: SupabaseClient,
  options: ShipmentQueryOptions
): Promise<ShipmentWithRelations[]> {
  const { companyId, status, orderId, customerId, dateFrom, dateTo, limit = 50, offset = 0 } = options

  let query = db
    .from('shipments')
    .select(`
      *,
      order:orders (
        id,
        order_number,
        status
      ),
      customer:customers (
        id,
        name,
        email,
        phone
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  if (orderId) {
    query = query.eq('order_id', orderId)
  }

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  if (dateFrom) {
    query = query.gte('shipped_date', dateFrom)
  }

  if (dateTo) {
    query = query.lte('shipped_date', dateTo)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get shipments: ${error.message}`)
  }

  return (data || []) as ShipmentWithRelations[]
}

/**
 * 取得出貨單詳情
 */
export async function getShipmentById(
  db: SupabaseClient,
  companyId: string,
  shipmentId: string
): Promise<ShipmentWithRelations | null> {
  const { data, error } = await db
    .from('shipments')
    .select(`
      *,
      order:orders (
        id,
        order_number,
        status,
        customer_id,
        total_amount
      ),
      customer:customers (
        id,
        name,
        email,
        phone,
        address
      )
    `)
    .eq('id', shipmentId)
    .eq('company_id', companyId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get shipment: ${error.message}`)
  }

  return data as ShipmentWithRelations | null
}

/**
 * 計算出貨單統計
 */
export async function getShipmentStats(
  db: SupabaseClient,
  companyId: string
): Promise<{
  total: number
  pending: number
  in_transit: number
  delivered: number
  cancelled: number
}> {
  const { data, error } = await db
    .from('shipments')
    .select('status')
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`Failed to get shipment stats: ${error.message}`)
  }

  const stats = {
    total: data?.length || 0,
    pending: 0,
    in_transit: 0,
    delivered: 0,
    cancelled: 0
  }

  data?.forEach(shipment => {
    const status = shipment.status as ShipmentStatus
    if (status in stats) {
      stats[status]++
    }
  })

  return stats
}

/**
 * 取得訂單的所有出貨單
 */
export async function getShipmentsByOrderId(
  db: SupabaseClient,
  orderId: string
): Promise<Shipment[]> {
  const { data, error } = await db
    .from('shipments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get shipments by order: ${error.message}`)
  }

  return data || []
}

// ============================================================================
// 出貨單 CRUD 函數
// ============================================================================

/**
 * 建立出貨單
 */
export async function createShipment(
  db: SupabaseClient,
  data: CreateShipmentData
): Promise<Shipment> {
  const now = new Date().toISOString()

  const { data: shipment, error } = await db
    .from('shipments')
    .insert({
      company_id: data.company_id,
      order_id: data.order_id,
      customer_id: data.customer_id || null,
      created_by: data.created_by || null,
      shipment_number: data.shipment_number || null, // 會由 trigger 自動產生
      status: 'pending',
      shipped_date: data.shipped_date || null,
      expected_delivery: data.expected_delivery || null,
      carrier: data.carrier || null,
      tracking_number: data.tracking_number || null,
      tracking_url: data.tracking_url || null,
      shipping_address: data.shipping_address || null,
      recipient_name: data.recipient_name || null,
      recipient_phone: data.recipient_phone || null,
      currency: data.currency || 'TWD',
      subtotal: data.subtotal || 0,
      shipping_fee: data.shipping_fee || 0,
      total_amount: data.total_amount || 0,
      notes: data.notes || null,
      internal_notes: data.internal_notes || null,
      created_at: now,
      updated_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create shipment: ${error.message}`)
  }

  return shipment
}

/**
 * 從訂單建立出貨單（使用資料庫函數）
 */
export async function createShipmentFromOrder(
  db: SupabaseClient,
  orderId: string,
  createdBy?: string,
  shipAll: boolean = true
): Promise<string> {
  const { data, error } = await db.rpc('create_shipment_from_order', {
    p_order_id: orderId,
    p_created_by: createdBy || null,
    p_ship_all: shipAll
  })

  if (error) {
    throw new Error(`Failed to create shipment from order: ${error.message}`)
  }

  return data as string
}

/**
 * 更新出貨單
 */
export async function updateShipment(
  db: SupabaseClient,
  companyId: string,
  shipmentId: string,
  data: Partial<Omit<Shipment, 'id' | 'company_id' | 'created_at' | 'updated_at'>>
): Promise<Shipment> {
  const { data: shipment, error } = await db
    .from('shipments')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', shipmentId)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update shipment: ${error.message}`)
  }

  return shipment
}

/**
 * 標記出貨（更新為運送中）
 */
export async function shipShipment(
  db: SupabaseClient,
  companyId: string,
  shipmentId: string,
  shippedDate?: string,
  carrier?: string,
  trackingNumber?: string
): Promise<Shipment> {
  // 先檢查出貨單狀態
  const { data: existing, error: checkError } = await db
    .from('shipments')
    .select('status')
    .eq('id', shipmentId)
    .eq('company_id', companyId)
    .single()

  if (checkError) {
    throw new Error(`Shipment not found: ${checkError.message}`)
  }

  if (existing.status !== 'pending') {
    throw new Error(`Only pending shipments can be shipped. Current status: ${existing.status}`)
  }

  return updateShipment(db, companyId, shipmentId, {
    status: 'in_transit',
    shipped_date: shippedDate || new Date().toISOString().split('T')[0],
    carrier: carrier || null,
    tracking_number: trackingNumber || null
  })
}

/**
 * 標記送達
 */
export async function deliverShipment(
  db: SupabaseClient,
  companyId: string,
  shipmentId: string,
  actualDelivery?: string
): Promise<Shipment> {
  // 先檢查出貨單狀態
  const { data: existing, error: checkError } = await db
    .from('shipments')
    .select('status')
    .eq('id', shipmentId)
    .eq('company_id', companyId)
    .single()

  if (checkError) {
    throw new Error(`Shipment not found: ${checkError.message}`)
  }

  if (existing.status !== 'in_transit' && existing.status !== 'pending') {
    throw new Error(`Only in-transit or pending shipments can be delivered. Current status: ${existing.status}`)
  }

  return updateShipment(db, companyId, shipmentId, {
    status: 'delivered',
    actual_delivery: actualDelivery || new Date().toISOString().split('T')[0]
  })
}

/**
 * 取消出貨單
 */
export async function cancelShipment(
  db: SupabaseClient,
  companyId: string,
  shipmentId: string
): Promise<Shipment> {
  // 先檢查出貨單狀態
  const { data: existing, error: checkError } = await db
    .from('shipments')
    .select('status')
    .eq('id', shipmentId)
    .eq('company_id', companyId)
    .single()

  if (checkError) {
    throw new Error(`Shipment not found: ${checkError.message}`)
  }

  if (existing.status === 'delivered' || existing.status === 'cancelled') {
    throw new Error(`Cannot cancel shipment with status: ${existing.status}`)
  }

  return updateShipment(db, companyId, shipmentId, { status: 'cancelled' })
}

/**
 * 刪除出貨單（僅限待處理狀態）
 */
export async function deleteShipment(
  db: SupabaseClient,
  companyId: string,
  shipmentId: string
): Promise<void> {
  // 先檢查出貨單狀態
  const { data: existing, error: checkError } = await db
    .from('shipments')
    .select('status')
    .eq('id', shipmentId)
    .eq('company_id', companyId)
    .single()

  if (checkError) {
    throw new Error(`Shipment not found: ${checkError.message}`)
  }

  if (existing.status !== 'pending') {
    throw new Error('Only pending shipments can be deleted')
  }

  const { error } = await db
    .from('shipments')
    .delete()
    .eq('id', shipmentId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`Failed to delete shipment: ${error.message}`)
  }
}

// ============================================================================
// 出貨明細函數
// ============================================================================

/**
 * 取得出貨明細
 */
export async function getShipmentItems(
  db: SupabaseClient,
  shipmentId: string
): Promise<ShipmentItem[]> {
  const { data, error } = await db
    .from('shipment_items')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('sort_order')

  if (error) {
    throw new Error(`Failed to get shipment items: ${error.message}`)
  }

  return data || []
}

/**
 * 建立出貨明細
 */
export async function createShipmentItem(
  db: SupabaseClient,
  data: CreateShipmentItemData
): Promise<ShipmentItem> {
  const now = new Date().toISOString()

  const { data: item, error } = await db
    .from('shipment_items')
    .insert({
      shipment_id: data.shipment_id,
      order_item_id: data.order_item_id || null,
      product_id: data.product_id || null,
      product_name: data.product_name || null,
      description: data.description || null,
      sku: data.sku || null,
      quantity_shipped: data.quantity_shipped,
      unit: data.unit || null,
      unit_price: data.unit_price || 0,
      amount: data.amount || 0,
      sort_order: data.sort_order || 0,
      created_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create shipment item: ${error.message}`)
  }

  return item
}

/**
 * 更新出貨明細
 */
export async function updateShipmentItem(
  db: SupabaseClient,
  itemId: string,
  data: Partial<Omit<ShipmentItem, 'id' | 'shipment_id' | 'created_at'>>
): Promise<ShipmentItem> {
  const { data: item, error } = await db
    .from('shipment_items')
    .update(data)
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update shipment item: ${error.message}`)
  }

  return item
}

/**
 * 刪除出貨明細
 */
export async function deleteShipmentItem(
  db: SupabaseClient,
  itemId: string
): Promise<void> {
  const { error } = await db
    .from('shipment_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    throw new Error(`Failed to delete shipment item: ${error.message}`)
  }
}

/**
 * 批次建立出貨明細
 */
export async function createShipmentItems(
  db: SupabaseClient,
  items: CreateShipmentItemData[]
): Promise<ShipmentItem[]> {
  if (items.length === 0) return []

  const now = new Date().toISOString()

  const insertData = items.map((item, index) => ({
    shipment_id: item.shipment_id,
    order_item_id: item.order_item_id || null,
    product_id: item.product_id || null,
    product_name: item.product_name || null,
    description: item.description || null,
    sku: item.sku || null,
    quantity_shipped: item.quantity_shipped,
    unit: item.unit || null,
    unit_price: item.unit_price || 0,
    amount: item.amount || 0,
    sort_order: item.sort_order ?? index,
    created_at: now
  }))

  const { data, error } = await db
    .from('shipment_items')
    .insert(insertData)
    .select()

  if (error) {
    throw new Error(`Failed to create shipment items: ${error.message}`)
  }

  return data || []
}

/**
 * 刪除出貨單所有明細
 */
export async function deleteShipmentItems(
  db: SupabaseClient,
  shipmentId: string
): Promise<void> {
  const { error } = await db
    .from('shipment_items')
    .delete()
    .eq('shipment_id', shipmentId)

  if (error) {
    throw new Error(`Failed to delete shipment items: ${error.message}`)
  }
}

// ============================================================================
// 重新計算出貨單金額
// ============================================================================

/**
 * 重新計算出貨單金額
 */
export async function recalculateShipmentTotals(
  db: SupabaseClient,
  companyId: string,
  shipmentId: string
): Promise<Shipment> {
  // 取得出貨明細
  const items = await getShipmentItems(db, shipmentId)

  // 取得出貨單資訊
  const { data: shipment, error: shipmentError } = await db
    .from('shipments')
    .select('shipping_fee')
    .eq('id', shipmentId)
    .single()

  if (shipmentError) {
    throw new Error(`Shipment not found: ${shipmentError.message}`)
  }

  // 計算小計
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0)

  // 計算總金額
  const shippingFee = Number(shipment.shipping_fee) || 0
  const totalAmount = subtotal + shippingFee

  // 更新出貨單
  return updateShipment(db, companyId, shipmentId, {
    subtotal,
    total_amount: totalAmount
  })
}

// ============================================================================
// 發票整合函數
// ============================================================================

/**
 * 從出貨單建立發票（使用資料庫函數）
 */
export async function createInvoiceFromShipment(
  db: SupabaseClient,
  shipmentId: string,
  invoiceDate?: string,
  dueDate?: string
): Promise<string> {
  const { data, error } = await db.rpc('create_invoice_from_shipment', {
    p_shipment_id: shipmentId,
    p_invoice_date: invoiceDate || null,
    p_due_date: dueDate || null
  })

  if (error) {
    throw new Error(`Failed to create invoice from shipment: ${error.message}`)
  }

  return data as string
}
