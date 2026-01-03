/**
 * 發票 React Query Hooks
 * Account-system → quotation-system 整合
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type {
  AccInvoice,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceType,
  InvoiceStatus,
} from '@/lib/dal/accounting'
import type { InvoiceListResult, InvoiceSummary } from '@/lib/services/accounting/invoice.service'

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

  return apiClient.get<InvoiceListResult>(`/api/accounting/invoices?${searchParams}`)
}

async function fetchInvoice(id: string): Promise<AccInvoice> {
  return apiClient.get<AccInvoice>(`/api/accounting/invoices/${id}`)
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

  return apiClient.get<InvoiceSummary>(`/api/accounting/invoices?${searchParams}`)
}

async function createInvoice(input: CreateInvoiceInput): Promise<AccInvoice> {
  return apiClient.post<AccInvoice>('/api/accounting/invoices', input)
}

async function updateInvoice(id: string, input: UpdateInvoiceInput): Promise<AccInvoice> {
  return apiClient.put<AccInvoice>(`/api/accounting/invoices/${id}`, input)
}

async function deleteInvoice(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/accounting/invoices/${id}`)
}

async function verifyInvoice(id: string): Promise<AccInvoice> {
  return apiClient.post<AccInvoice>(`/api/accounting/invoices/${id}/verify`)
}

async function postInvoice(id: string): Promise<{ invoice_id: string; journal_entry_id: string; status: string }> {
  return apiClient.post<{ invoice_id: string; journal_entry_id: string; status: string }>(
    `/api/accounting/invoices/${id}/post`
  )
}

async function voidInvoice(id: string, reason: string): Promise<{ invoice_id: string; status: string }> {
  return apiClient.post<{ invoice_id: string; status: string }>(
    `/api/accounting/invoices/${id}/void`,
    { reason }
  )
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
  return apiClient.post<{ invoice_id: string; total_paid: number; payment_status: string }>(
    `/api/accounting/invoices/${input.id}/payment`,
    {
      amount: input.amount,
      payment_date: input.paymentDate,
      payment_method: input.paymentMethod,
      reference: input.reference,
    }
  )
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
