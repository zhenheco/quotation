'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

// ============================================================================
// Types
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

export interface ShipmentWithItems extends ShipmentWithRelations {
  items: ShipmentItem[]
}

export interface ShipmentStats {
  total: number
  pending: number
  in_transit: number
  delivered: number
  cancelled: number
}

export interface ShipmentFilters {
  status?: ShipmentStatus
  order_id?: string
  customer_id?: string
  date_from?: string
  date_to?: string
}

export interface CreateShipmentParams {
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
  subtotal?: number
  shipping_fee?: number
  total_amount?: number
  notes?: string
  internal_notes?: string
  items?: CreateShipmentItemParams[]
}

export interface CreateShipmentItemParams {
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

export interface UpdateShipmentParams {
  shipped_date?: string | null
  expected_delivery?: string | null
  carrier?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  shipping_address?: string | null
  recipient_name?: string | null
  recipient_phone?: string | null
  currency?: string
  subtotal?: number
  shipping_fee?: number
  total_amount?: number
  notes?: string | null
  internal_notes?: string | null
  items?: CreateShipmentItemParams[]
}

export interface ShipParams {
  shipped_date?: string
  carrier?: string
  tracking_number?: string
}

export interface DeliverParams {
  actual_delivery?: string
}

export interface CreateInvoiceParams {
  invoice_date?: string
  due_date?: string
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchShipments(companyId: string, filters?: ShipmentFilters): Promise<ShipmentWithRelations[]> {
  const params = new URLSearchParams()
  params.append('company_id', companyId)

  if (filters?.status) params.append('status', filters.status)
  if (filters?.order_id) params.append('order_id', filters.order_id)
  if (filters?.customer_id) params.append('customer_id', filters.customer_id)
  if (filters?.date_from) params.append('date_from', filters.date_from)
  if (filters?.date_to) params.append('date_to', filters.date_to)

  return apiGet<ShipmentWithRelations[]>(`/api/shipments?${params.toString()}`)
}

async function fetchShipment(companyId: string, shipmentId: string): Promise<ShipmentWithItems> {
  return apiGet<ShipmentWithItems>(`/api/shipments/${shipmentId}?company_id=${companyId}`)
}

async function fetchShipmentStats(companyId: string): Promise<ShipmentStats> {
  return apiGet<ShipmentStats>(`/api/shipments/stats?company_id=${companyId}`)
}

async function createShipment(params: CreateShipmentParams): Promise<Shipment> {
  return apiPost<Shipment>('/api/shipments', params)
}

async function createShipmentFromOrder(orderId: string, shipAll: boolean = true): Promise<Shipment> {
  return apiPost<Shipment>('/api/shipments/from-order', { order_id: orderId, ship_all: shipAll })
}

async function updateShipment(companyId: string, shipmentId: string, params: UpdateShipmentParams): Promise<ShipmentWithItems> {
  return apiPut<ShipmentWithItems>(`/api/shipments/${shipmentId}?company_id=${companyId}`, params)
}

async function shipShipment(companyId: string, shipmentId: string, params?: ShipParams): Promise<Shipment> {
  return apiPost<Shipment>(`/api/shipments/${shipmentId}/ship?company_id=${companyId}`, params || {})
}

async function deliverShipment(companyId: string, shipmentId: string, params?: DeliverParams): Promise<Shipment> {
  return apiPost<Shipment>(`/api/shipments/${shipmentId}/deliver?company_id=${companyId}`, params || {})
}

async function cancelShipment(companyId: string, shipmentId: string): Promise<Shipment> {
  return apiPost<Shipment>(`/api/shipments/${shipmentId}/cancel?company_id=${companyId}`, {})
}

async function deleteShipment(companyId: string, shipmentId: string): Promise<void> {
  await apiDelete(`/api/shipments/${shipmentId}?company_id=${companyId}`)
}

async function createInvoiceFromShipment(companyId: string, shipmentId: string, params?: CreateInvoiceParams): Promise<{ invoice_id: string }> {
  return apiPost<{ invoice_id: string }>(`/api/shipments/${shipmentId}/invoice?company_id=${companyId}`, params || {})
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * 取得出貨單列表
 */
export function useShipments(companyId: string, filters?: ShipmentFilters) {
  return useQuery({
    queryKey: ['shipments', companyId, filters],
    queryFn: () => fetchShipments(companyId, filters),
    enabled: !!companyId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * 取得單一出貨單詳情
 */
export function useShipment(companyId: string, shipmentId: string) {
  return useQuery({
    queryKey: ['shipment', companyId, shipmentId],
    queryFn: () => fetchShipment(companyId, shipmentId),
    enabled: !!companyId && !!shipmentId,
    staleTime: 30 * 1000,
  })
}

/**
 * 取得出貨單統計
 */
export function useShipmentStats(companyId: string) {
  return useQuery({
    queryKey: ['shipmentStats', companyId],
    queryFn: () => fetchShipmentStats(companyId),
    enabled: !!companyId,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * 建立出貨單
 */
export function useCreateShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipmentStats'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] }) // 出貨會影響訂單狀態
    },
  })
}

/**
 * 從訂單建立出貨單
 */
export function useCreateShipmentFromOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, shipAll = true }: { orderId: string; shipAll?: boolean }) =>
      createShipmentFromOrder(orderId, shipAll),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipmentStats'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/**
 * 更新出貨單
 */
export function useUpdateShipment(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shipmentId, params }: { shipmentId: string; params: UpdateShipmentParams }) =>
      updateShipment(companyId, shipmentId, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', companyId, variables.shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['shipmentStats'] })
    },
  })
}

/**
 * 標記出貨
 */
export function useShipShipment(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shipmentId, params }: { shipmentId: string; params?: ShipParams }) =>
      shipShipment(companyId, shipmentId, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', companyId, variables.shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['shipmentStats'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/**
 * 標記送達
 */
export function useDeliverShipment(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shipmentId, params }: { shipmentId: string; params?: DeliverParams }) =>
      deliverShipment(companyId, shipmentId, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', companyId, variables.shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['shipmentStats'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/**
 * 取消出貨單
 */
export function useCancelShipment(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (shipmentId: string) => cancelShipment(companyId, shipmentId),
    onSuccess: (_, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', companyId, shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['shipmentStats'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/**
 * 刪除出貨單
 */
export function useDeleteShipment(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (shipmentId: string) => deleteShipment(companyId, shipmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipmentStats'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/**
 * 從出貨單建立發票
 */
export function useCreateInvoiceFromShipment(companyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shipmentId, params }: { shipmentId: string; params?: CreateInvoiceParams }) =>
      createInvoiceFromShipment(companyId, shipmentId, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', companyId, variables.shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
