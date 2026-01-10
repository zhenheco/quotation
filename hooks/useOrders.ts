'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

// ============================================================================
// Types
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

export interface OrderWithItems extends OrderWithCustomer {
  items: OrderItem[]
}

export interface OrderStats {
  total: number
  draft: number
  confirmed: number
  shipped: number
  completed: number
  cancelled: number
}

export interface OrderFilters {
  status?: OrderStatus
  customer_id?: string
  quotation_id?: string
  date_from?: string
  date_to?: string
}

export interface CreateOrderParams {
  company_id: string
  customer_id: string
  quotation_id?: string
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
  items?: CreateOrderItemParams[]
}

export interface CreateOrderItemParams {
  product_id?: string
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

export interface UpdateOrderParams {
  order_date?: string
  expected_delivery_date?: string | null
  currency?: string
  exchange_rate?: number
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  discount_amount?: number
  discount_description?: string | null
  total_amount?: number
  notes?: string | null
  terms?: string | null
  shipping_address?: string | null
  billing_address?: string | null
  show_tax?: boolean
  items?: CreateOrderItemParams[]
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchOrders(companyId: string, filters?: OrderFilters): Promise<OrderWithCustomer[]> {
  const params = new URLSearchParams()
  params.append('company_id', companyId)

  if (filters?.status) params.append('status', filters.status)
  if (filters?.customer_id) params.append('customer_id', filters.customer_id)
  if (filters?.quotation_id) params.append('quotation_id', filters.quotation_id)
  if (filters?.date_from) params.append('date_from', filters.date_from)
  if (filters?.date_to) params.append('date_to', filters.date_to)

  return apiGet<OrderWithCustomer[]>(`/api/orders?${params.toString()}`)
}

async function fetchOrder(companyId: string, orderId: string): Promise<OrderWithItems> {
  return apiGet<OrderWithItems>(`/api/orders/${orderId}?company_id=${companyId}`)
}

async function fetchOrderStats(companyId: string): Promise<OrderStats> {
  return apiGet<OrderStats>(`/api/orders/stats?company_id=${companyId}`)
}

async function createOrder(params: CreateOrderParams): Promise<Order> {
  return apiPost<Order>('/api/orders', params)
}

async function createOrderFromQuotation(quotationId: string): Promise<Order> {
  return apiPost<Order>('/api/orders/from-quotation', { quotation_id: quotationId })
}

async function updateOrder(companyId: string, orderId: string, params: UpdateOrderParams): Promise<OrderWithItems> {
  return apiPut<OrderWithItems>(`/api/orders/${orderId}?company_id=${companyId}`, params)
}

async function confirmOrder(companyId: string, orderId: string): Promise<Order> {
  return apiPost<Order>(`/api/orders/${orderId}/confirm?company_id=${companyId}`, {})
}

async function cancelOrder(companyId: string, orderId: string): Promise<Order> {
  return apiPost<Order>(`/api/orders/${orderId}/cancel?company_id=${companyId}`, {})
}

async function deleteOrder(companyId: string, orderId: string): Promise<void> {
  await apiDelete(`/api/orders/${orderId}?company_id=${companyId}`)
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * 取得訂單列表
 */
export function useOrders(companyId: string, filters?: OrderFilters) {
  return useQuery({
    queryKey: ['orders', companyId, filters],
    queryFn: () => fetchOrders(companyId, filters),
    enabled: !!companyId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * 取得單一訂單詳情
 */
export function useOrder(companyId: string, orderId: string) {
  return useQuery({
    queryKey: ['order', companyId, orderId],
    queryFn: () => fetchOrder(companyId, orderId),
    enabled: !!companyId && !!orderId,
    staleTime: 30 * 1000,
  })
}

/**
 * 取得訂單統計
 */
export function useOrderStats(companyId: string) {
  return useQuery({
    queryKey: ['orderStats', companyId],
    queryFn: () => fetchOrderStats(companyId),
    enabled: !!companyId,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * 建立訂單
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orderStats'] })
    },
  })
}

/**
 * 從報價單建立訂單
 */
export function useCreateOrderFromQuotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createOrderFromQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orderStats'] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })
}

/**
 * 更新訂單
 */
export function useUpdateOrder(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, params }: { orderId: string; params: UpdateOrderParams }) =>
      updateOrder(companyId, orderId, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', companyId, variables.orderId] })
      queryClient.invalidateQueries({ queryKey: ['orderStats'] })
    },
  })
}

/**
 * 確認訂單
 */
export function useConfirmOrder(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) => confirmOrder(companyId, orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', companyId, orderId] })
      queryClient.invalidateQueries({ queryKey: ['orderStats'] })
    },
  })
}

/**
 * 取消訂單
 */
export function useCancelOrder(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) => cancelOrder(companyId, orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', companyId, orderId] })
      queryClient.invalidateQueries({ queryKey: ['orderStats'] })
    },
  })
}

/**
 * 刪除訂單
 */
export function useDeleteOrder(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) => deleteOrder(companyId, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orderStats'] })
    },
  })
}
