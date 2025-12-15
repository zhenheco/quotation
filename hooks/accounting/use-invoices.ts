/**
 * 發票 React Query Hooks
 * Account-system → quotation-system 整合
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AccInvoice,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceType,
  InvoiceStatus,
} from '@/lib/dal/accounting'
import type { InvoiceListResult, InvoiceSummary } from '@/lib/services/accounting/invoice.service'

// ============================================
// 類型定義
// ============================================

interface ApiError {
  error?: string
}

// ============================================
// Query Keys
// ============================================

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (companyId: string, filters?: object) =>
    [...invoiceKeys.lists(), companyId, filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  summary: (companyId: string, startDate: string, endDate: string) =>
    [...invoiceKeys.all, 'summary', companyId, startDate, endDate] as const,
}

// ============================================
// API 呼叫函數
// ============================================

interface ListInvoicesParams {
  companyId: string
  type?: InvoiceType
  status?: InvoiceStatus
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

async function fetchInvoices(params: ListInvoicesParams): Promise<InvoiceListResult> {
  const searchParams = new URLSearchParams({
    company_id: params.companyId,
    ...(params.type && { type: params.type }),
    ...(params.status && { status: params.status }),
    ...(params.startDate && { start_date: params.startDate }),
    ...(params.endDate && { end_date: params.endDate }),
    page: String(params.page || 1),
    page_size: String(params.pageSize || 20),
  })

  const response = await fetch(`/api/accounting/invoices?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch invoices')
  }
  return response.json()
}

async function fetchInvoice(id: string): Promise<AccInvoice> {
  const response = await fetch(`/api/accounting/invoices/${id}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch invoice')
  }
  return response.json()
}

async function fetchInvoiceSummary(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<InvoiceSummary> {
  const searchParams = new URLSearchParams({
    company_id: companyId,
    start_date: startDate,
    end_date: endDate,
    summary: 'true',
  })

  const response = await fetch(`/api/accounting/invoices?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch invoice summary')
  }
  return response.json()
}

async function createInvoice(input: CreateInvoiceInput): Promise<AccInvoice> {
  const response = await fetch('/api/accounting/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to create invoice')
  }
  return response.json()
}

async function updateInvoice(id: string, input: UpdateInvoiceInput): Promise<AccInvoice> {
  const response = await fetch(`/api/accounting/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to update invoice')
  }
  return response.json()
}

async function deleteInvoice(id: string): Promise<void> {
  const response = await fetch(`/api/accounting/invoices/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to delete invoice')
  }
}

async function verifyInvoice(id: string): Promise<AccInvoice> {
  const response = await fetch(`/api/accounting/invoices/${id}/verify`, {
    method: 'POST',
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to verify invoice')
  }
  return response.json()
}

async function postInvoice(id: string): Promise<{ invoice_id: string; journal_entry_id: string; status: string }> {
  const response = await fetch(`/api/accounting/invoices/${id}/post`, {
    method: 'POST',
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to post invoice')
  }
  return response.json()
}

async function voidInvoice(id: string, reason: string): Promise<{ invoice_id: string; status: string }> {
  const response = await fetch(`/api/accounting/invoices/${id}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to void invoice')
  }
  return response.json()
}

interface RecordPaymentInput {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  reference?: string
}

async function recordPayment(
  input: RecordPaymentInput
): Promise<{ invoice_id: string; total_paid: number; payment_status: string }> {
  const response = await fetch(`/api/accounting/invoices/${input.id}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: input.amount,
      payment_date: input.paymentDate,
      payment_method: input.paymentMethod,
      reference: input.reference,
    }),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to record payment')
  }
  return response.json()
}

// ============================================
// React Query Hooks
// ============================================

/**
 * 取得發票列表
 */
export function useInvoices(params: ListInvoicesParams, enabled = true) {
  return useQuery({
    queryKey: invoiceKeys.list(params.companyId, params),
    queryFn: () => fetchInvoices(params),
    enabled: enabled && !!params.companyId,
    staleTime: 30 * 1000, // 30 秒
  })
}

/**
 * 取得單一發票
 */
export function useInvoice(id: string, enabled = true) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => fetchInvoice(id),
    enabled: enabled && !!id,
  })
}

/**
 * 取得發票統計摘要
 */
export function useInvoiceSummary(
  companyId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery({
    queryKey: invoiceKeys.summary(companyId, startDate, endDate),
    queryFn: () => fetchInvoiceSummary(companyId, startDate, endDate),
    enabled: enabled && !!companyId && !!startDate && !!endDate,
    staleTime: 60 * 1000, // 1 分鐘
  })
}

/**
 * 建立發票
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.setQueryData(invoiceKeys.detail(data.id), data)
    },
  })
}

/**
 * 更新發票
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInvoiceInput }) =>
      updateInvoice(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.setQueryData(invoiceKeys.detail(data.id), data)
    },
  })
}

/**
 * 刪除發票
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.removeQueries({ queryKey: invoiceKeys.detail(id) })
    },
  })
}

/**
 * 審核發票
 */
export function useVerifyInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: verifyInvoice,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.setQueryData(invoiceKeys.detail(data.id), data)
    },
  })
}

/**
 * 過帳發票
 */
export function usePostInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: postInvoice,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) })
    },
  })
}

/**
 * 作廢發票
 */
export function useVoidInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => voidInvoice(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) })
    },
  })
}

/**
 * 記錄付款
 */
export function useRecordPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: recordPayment,
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(input.id) })
    },
  })
}
