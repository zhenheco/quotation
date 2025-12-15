/**
 * POS 銷售交易 React Query Hooks
 * Account-system → quotation-system 整合
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SalesTransaction, SalesTransactionFull, SalesStatus, SalesSummary } from '@/lib/dal/pos'
import type { SalesListResult, CreateSalesRequest, DailySalesReport } from '@/lib/services/pos/sales.service'

// ============================================
// 類型定義
// ============================================

interface ApiError {
  error?: string
}

// ============================================
// Query Keys
// ============================================

export const salesKeys = {
  all: ['pos-sales'] as const,
  lists: () => [...salesKeys.all, 'list'] as const,
  list: (tenantId: string, filters?: object) =>
    [...salesKeys.lists(), tenantId, filters] as const,
  details: () => [...salesKeys.all, 'detail'] as const,
  detail: (id: string) => [...salesKeys.details(), id] as const,
  summary: (tenantId: string, branchId: string | null, date: string) =>
    [...salesKeys.all, 'summary', tenantId, branchId, date] as const,
  report: (tenantId: string, branchId: string, date: string) =>
    [...salesKeys.all, 'report', tenantId, branchId, date] as const,
}

// ============================================
// API 呼叫函數
// ============================================

interface ListSalesParams {
  tenantId: string
  branchId?: string
  memberId?: string
  status?: SalesStatus
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

async function fetchSales(params: ListSalesParams): Promise<SalesListResult> {
  const searchParams = new URLSearchParams({
    tenant_id: params.tenantId,
    ...(params.branchId && { branch_id: params.branchId }),
    ...(params.memberId && { member_id: params.memberId }),
    ...(params.status && { status: params.status }),
    ...(params.startDate && { start_date: params.startDate }),
    ...(params.endDate && { end_date: params.endDate }),
    page: String(params.page || 1),
    page_size: String(params.pageSize || 20),
  })

  const response = await fetch(`/api/pos/sales?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch sales')
  }
  return response.json()
}

async function fetchSale(id: string): Promise<SalesTransactionFull> {
  const response = await fetch(`/api/pos/sales/${id}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch sale')
  }
  return response.json()
}

async function fetchDailySummary(
  tenantId: string,
  branchId: string | null,
  date: string
): Promise<SalesSummary> {
  const searchParams = new URLSearchParams({
    tenant_id: tenantId,
    ...(branchId && { branch_id: branchId }),
    summary: 'true',
    summary_date: date,
  })

  const response = await fetch(`/api/pos/sales?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch sales summary')
  }
  return response.json()
}

async function fetchDailySalesReport(
  tenantId: string,
  branchId: string,
  date: string
): Promise<DailySalesReport> {
  const searchParams = new URLSearchParams({
    tenant_id: tenantId,
    branch_id: branchId,
    date,
  })

  const response = await fetch(`/api/pos/sales/report?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch sales report')
  }
  return response.json()
}

async function createSale(input: CreateSalesRequest): Promise<SalesTransactionFull> {
  const response = await fetch('/api/pos/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to create sale')
  }
  return response.json()
}

async function voidSale(id: string, reason: string): Promise<SalesTransaction> {
  const response = await fetch(`/api/pos/sales/${id}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to void sale')
  }
  return response.json()
}

async function refundSale(id: string, reason: string): Promise<SalesTransaction> {
  const response = await fetch(`/api/pos/sales/${id}/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to refund sale')
  }
  return response.json()
}

// ============================================
// React Query Hooks
// ============================================

/**
 * 取得銷售交易列表
 */
export function useSales(params: ListSalesParams, enabled = true) {
  return useQuery({
    queryKey: salesKeys.list(params.tenantId, params),
    queryFn: () => fetchSales(params),
    enabled: enabled && !!params.tenantId,
    staleTime: 10 * 1000, // 10 秒
  })
}

/**
 * 取得單一銷售交易
 */
export function useSale(id: string, enabled = true) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => fetchSale(id),
    enabled: enabled && !!id,
  })
}

/**
 * 取得日銷售統計
 */
export function useDailySummary(
  tenantId: string,
  branchId: string | null,
  date: string,
  enabled = true
) {
  return useQuery({
    queryKey: salesKeys.summary(tenantId, branchId, date),
    queryFn: () => fetchDailySummary(tenantId, branchId, date),
    enabled: enabled && !!tenantId && !!date,
    staleTime: 30 * 1000, // 30 秒
  })
}

/**
 * 取得日銷售報表
 */
export function useDailySalesReport(
  tenantId: string,
  branchId: string,
  date: string,
  enabled = true
) {
  return useQuery({
    queryKey: salesKeys.report(tenantId, branchId, date),
    queryFn: () => fetchDailySalesReport(tenantId, branchId, date),
    enabled: enabled && !!tenantId && !!branchId && !!date,
    staleTime: 60 * 1000, // 1 分鐘
  })
}

/**
 * 建立銷售交易（結帳）
 */
export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSale,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
      queryClient.setQueryData(salesKeys.detail(data.id), data)
    },
  })
}

/**
 * 作廢銷售交易
 */
export function useVoidSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => voidSale(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(id) })
    },
  })
}

/**
 * 退款銷售交易
 */
export function useRefundSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => refundSale(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(id) })
    },
  })
}
