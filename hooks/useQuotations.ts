'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Quotation,
  QuotationItem,
  QuotationVersion,
  CreateQuotationData,
  UpdateQuotationData
} from '@/types/models'
import type { QuotationWithCustomer as QuotationWithCustomerType } from '@/types/extended.types'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

// ============================================================================
// Types
// ============================================================================

export type { Quotation, QuotationItem, CreateQuotationData, UpdateQuotationData }
export type QuotationWithCustomer = QuotationWithCustomerType

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'approved'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue'

export interface BilingualText {
  zh: string
  en: string
}

export interface CreateQuotationItemInput {
  product_id?: string
  description: BilingualText
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
}

export interface CreateQuotationInput {
  company_id: string
  customer_id: string
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes?: BilingualText
  items: CreateQuotationItemInput[]
}

export interface UpdateQuotationInput {
  customer_id?: string
  issue_date?: string
  valid_until?: string
  status?: QuotationStatus
  currency?: string
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total_amount?: number
  notes?: BilingualText
  items?: CreateQuotationItemInput[]
  payment_status?: PaymentStatus
  payment_due_date?: string
}

export interface QuotationFilters {
  status?: QuotationStatus
  customer_id?: string
  start_date?: string
  end_date?: string
  payment_status?: PaymentStatus
  search?: string
}

export interface BatchDeleteParams {
  ids: string[]
}

export interface BatchStatusUpdateParams {
  ids: string[]
  status: QuotationStatus
}

export interface BatchExportParams {
  ids: string[]
  locale: 'zh' | 'en'
}

export interface SendQuotationParams {
  id: string
  subject?: string
  content?: string
  locale?: 'zh' | 'en'
}

export interface BatchSendParams {
  ids: string[]
  subject?: string
  content?: string
  locale?: 'zh' | 'en'
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchQuotations(filters?: QuotationFilters): Promise<QuotationWithCustomer[]> {
  const params = new URLSearchParams()

  if (filters?.status) params.append('status', filters.status)
  if (filters?.customer_id) params.append('customer_id', filters.customer_id)
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.payment_status) params.append('payment_status', filters.payment_status)

  const queryString = params.toString()
  const url = `/api/quotations${queryString ? `?${queryString}` : ''}`

  return apiGet<QuotationWithCustomer[]>(url)
}

async function fetchQuotation(id: string): Promise<QuotationWithCustomer> {
  return apiGet<QuotationWithCustomer>(`/api/quotations/${id}`)
}

async function createQuotation(input: CreateQuotationInput): Promise<Quotation> {
  return apiPost<Quotation>('/api/quotations', input)
}

async function updateQuotation(id: string, input: UpdateQuotationInput): Promise<Quotation> {
  return apiPut<Quotation>(`/api/quotations/${id}`, input)
}

async function deleteQuotation(id: string): Promise<void> {
  await apiDelete(`/api/quotations/${id}`)
}

async function convertToContract(id: string): Promise<void> {
  await apiPost('/api/contracts/from-quotation', { quotation_id: id })
}

async function batchDeleteQuotations(params: BatchDeleteParams): Promise<{ deleted: number }> {
  return apiPost<{ deleted: number }>('/api/quotations/batch/delete', params)
}

async function batchUpdateStatus(params: BatchStatusUpdateParams): Promise<{ updated: number }> {
  return apiPost<{ updated: number }>('/api/quotations/batch/status', params)
}

async function sendQuotation(params: SendQuotationParams): Promise<{ success: boolean; message: string }> {
  const { id, ...body } = params
  return apiPost<{ success: boolean; message: string }>(`/api/quotations/${id}/send`, body)
}

async function batchSendQuotations(params: BatchSendParams): Promise<{
  success: boolean
  message: string
  data: {
    total: number
    sent: number
    failed: number
  }
}> {
  return apiPost('/api/quotations/batch/send', params)
}

async function fetchQuotationVersions(quotationId: string): Promise<QuotationVersion[]> {
  return apiGet<QuotationVersion[]>(`/api/quotations/${quotationId}/versions`)
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * 取得報價單列表（含過濾）
 *
 * @param filters - 過濾條件
 *
 * @example
 * ```tsx
 * function QuotationList() {
 *   const [filters, setFilters] = useState<QuotationFilters>({ status: 'draft' })
 *   const { data: quotations, isLoading } = useQuotations(filters)
 *
 *   return (
 *     <div>
 *       {quotations?.map(q => <QuotationCard key={q.id} quotation={q} />)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useQuotations(filters?: QuotationFilters) {
  return useQuery({
    queryKey: ['quotations', filters],
    queryFn: () => fetchQuotations(filters),
    staleTime: 2 * 60 * 1000, // 2 分鐘
  })
}

/**
 * 取得單一報價單
 *
 * @param id - 報價單 ID
 */
export function useQuotation(id: string) {
  return useQuery({
    queryKey: ['quotations', id],
    queryFn: () => fetchQuotation(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * 建立新報價單
 *
 * @example
 * ```tsx
 * function CreateQuotationForm() {
 *   const createQuotation = useCreateQuotation()
 *   const router = useRouter()
 *
 *   const onSubmit = async (data: CreateQuotationInput) => {
 *     try {
 *       const quotation = await createQuotation.mutateAsync(data)
 *       toast.success(`報價單 ${quotation.quotation_number} 建立成功`)
 *       router.push(`/quotations/${quotation.id}`)
 *     } catch (error) {
 *       toast.error('建立失敗')
 *     }
 *   }
 *
 *   return <form onSubmit={handleSubmit(onSubmit)}>...</form>
 * }
 * ```
 */
export function useCreateQuotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createQuotation,
    onSuccess: (newQuotation) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.setQueryData(['quotations', newQuotation.id], newQuotation)
    },
  })
}

/**
 * 更新報價單
 */
export function useUpdateQuotation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateQuotationInput) => updateQuotation(id, input),
    onSuccess: (updatedQuotation) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.setQueryData(['quotations', id], updatedQuotation)
    },
  })
}

/**
 * 刪除報價單
 */
export function useDeleteQuotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteQuotation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['quotations'] })
      const previousQuotations = queryClient.getQueryData<Quotation[]>(['quotations'])

      queryClient.setQueryData<Quotation[]>(['quotations'], (old) =>
        old?.filter((q) => q.id !== id) ?? []
      )

      return { previousQuotations }
    },
    onError: (err, id, context) => {
      if (context?.previousQuotations) {
        queryClient.setQueryData(['quotations'], context.previousQuotations)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })
}

/**
 * 轉換為合約
 *
 * @example
 * ```tsx
 * function QuotationActions({ quotation }: { quotation: Quotation }) {
 *   const convertToContract = useConvertToContract(quotation.id)
 *
 *   const handleConvert = async () => {
 *     try {
 *       await convertToContract.mutateAsync()
 *       toast.success('已轉換為合約')
 *       router.push('/contracts')
 *     } catch (error) {
 *       toast.error('轉換失敗')
 *     }
 *   }
 *
 *   return <Button onClick={handleConvert}>轉換為合約</Button>
 * }
 * ```
 */
export function useConvertToContract(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => convertToContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['quotations', id] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}

/**
 * 批次刪除報價單
 *
 * @example
 * ```tsx
 * function BatchActions({ selectedIds }: { selectedIds: string[] }) {
 *   const batchDelete = useBatchDeleteQuotations()
 *
 *   const handleBatchDelete = async () => {
 *     if (!confirm(`確定要刪除 ${selectedIds.length} 個報價單？`)) return
 *
 *     try {
 *       const result = await batchDelete.mutateAsync({ ids: selectedIds })
 *       toast.success(`已刪除 ${result.deleted} 個報價單`)
 *     } catch (error) {
 *       toast.error('批次刪除失敗')
 *     }
 *   }
 *
 *   return <Button onClick={handleBatchDelete}>批次刪除</Button>
 * }
 * ```
 */
export function useBatchDeleteQuotations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: batchDeleteQuotations,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })
}

/**
 * 批次更新狀態
 */
export function useBatchUpdateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: batchUpdateStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })
}

export function useSendQuotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sendQuotation,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['quotations', variables.id] })
    },
  })
}

export function useBatchSendQuotations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: batchSendQuotations,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })
}

/**
 * 取得報價單版本歷史
 *
 * @param quotationId - 報價單 ID
 *
 * @example
 * ```tsx
 * function VersionHistory({ quotationId }: { quotationId: string }) {
 *   const { data: versions, isLoading } = useQuotationVersions(quotationId)
 *
 *   if (isLoading) return <div>載入中...</div>
 *
 *   return (
 *     <div>
 *       {versions?.map(v => (
 *         <div key={v.id}>
 *           版本 {v.version_number} - {v.changed_at}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useQuotationVersions(quotationId: string) {
  return useQuery({
    queryKey: ['quotation-versions', quotationId],
    queryFn: () => fetchQuotationVersions(quotationId),
    staleTime: 5 * 60 * 1000, // 5 分鐘
    enabled: !!quotationId, // 只在有 quotationId 時才執行
  })
}

// ============================================================================
// Payment Terms
// ============================================================================

export interface PaymentTerm {
  id: string
  quotation_id: string
  term_number: number
  term_name: string | null
  percentage: number
  amount: number
  due_date: string | null
  paid_amount: number
  paid_date: string | null
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  description: { zh: string; en: string } | null
  created_at: string
  updated_at: string
}

interface PaymentTermsResponse {
  payment_terms: PaymentTerm[]
}

async function fetchPaymentTerms(quotationId: string): Promise<PaymentTerm[]> {
  const response = await apiGet<PaymentTermsResponse>(`/api/quotations/${quotationId}/payment-terms`)
  return response.payment_terms
}

export function usePaymentTerms(quotationId: string) {
  return useQuery({
    queryKey: ['payment-terms', quotationId],
    queryFn: () => fetchPaymentTerms(quotationId),
    staleTime: 2 * 60 * 1000,
    enabled: !!quotationId,
  })
}
