'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Database } from '@/types/database.types'
import type { QuotationWithCustomer } from '@/types/extended.types'

// ============================================================================
// Types
// ============================================================================

export type Quotation = Database['public']['Tables']['quotations']['Row']
export type QuotationItem = Database['public']['Tables']['quotation_items']['Row']
export type CreateQuotationData = Database['public']['Tables']['quotations']['Insert']
export type UpdateQuotationData = Database['public']['Tables']['quotations']['Update']

export type QuotationStatus = 'draft' | 'sent' | 'signed' | 'expired'
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
  amount: number
}

export interface CreateQuotationInput {
  customer_id: string
  issue_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
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
  total?: number
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

  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch quotations')
  }

  const data = await response.json()
  return data.data || data
}

async function fetchQuotation(id: string): Promise<QuotationWithCustomer> {
  const response = await fetch(`/api/quotations/${id}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch quotation')
  }

  const data = await response.json()
  return data.data || data
}

async function createQuotation(input: CreateQuotationInput): Promise<Quotation> {
  const response = await fetch('/api/quotations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create quotation')
  }

  const data = await response.json()
  return data.data || data
}

async function updateQuotation(id: string, input: UpdateQuotationInput): Promise<Quotation> {
  const response = await fetch(`/api/quotations/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update quotation')
  }

  const data = await response.json()
  return data.data || data
}

async function deleteQuotation(id: string): Promise<void> {
  const response = await fetch(`/api/quotations/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete quotation')
  }
}

async function sendQuotation(id: string): Promise<Quotation> {
  return updateQuotation(id, { status: 'sent' })
}

async function convertToContract(id: string): Promise<void> {
  const response = await fetch('/api/contracts/from-quotation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quotation_id: id }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to convert to contract')
  }
}

async function exportQuotationPDF(id: string, locale: 'zh' | 'en'): Promise<Blob> {
  const response = await fetch(`/api/quotations/${id}/pdf?locale=${locale}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to export PDF')
  }

  return await response.blob()
}

async function batchDeleteQuotations(params: BatchDeleteParams): Promise<{ deleted: number }> {
  const response = await fetch('/api/quotations/batch/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to batch delete')
  }

  return await response.json()
}

async function batchUpdateStatus(params: BatchStatusUpdateParams): Promise<{ updated: number }> {
  const response = await fetch('/api/quotations/batch/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to batch update status')
  }

  return await response.json()
}

async function batchExportPDFs(params: BatchExportParams): Promise<Blob> {
  const response = await fetch('/api/quotations/batch/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to batch export')
  }

  return await response.blob()
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
 * 發送報價單（更新狀態為 sent）
 *
 * @example
 * ```tsx
 * function QuotationActions({ quotation }: { quotation: Quotation }) {
 *   const sendQuotation = useSendQuotation(quotation.id)
 *
 *   const handleSend = async () => {
 *     try {
 *       await sendQuotation.mutateAsync()
 *       toast.success('報價單已發送')
 *     } catch (error) {
 *       toast.error('發送失敗')
 *     }
 *   }
 *
 *   return <Button onClick={handleSend}>發送報價單</Button>
 * }
 * ```
 */
export function useSendQuotation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => sendQuotation(id),
    onSuccess: (updatedQuotation) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.setQueryData(['quotations', id], updatedQuotation)
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
 * 匯出 PDF
 *
 * @param id - 報價單 ID
 *
 * @example
 * ```tsx
 * function ExportButton({ quotationId }: { quotationId: string }) {
 *   const exportPDF = useExportQuotationPDF(quotationId)
 *
 *   const handleExport = async (locale: 'zh' | 'en') => {
 *     try {
 *       await exportPDF.mutateAsync(locale)
 *     } catch (error) {
 *       toast.error('匯出失敗')
 *     }
 *   }
 *
 *   return (
 *     <>
 *       <Button onClick={() => handleExport('zh')}>匯出中文PDF</Button>
 *       <Button onClick={() => handleExport('en')}>匯出英文PDF</Button>
 *     </>
 *   )
 * }
 * ```
 */
export function useExportQuotationPDF(id: string) {
  return useMutation({
    mutationFn: (locale: 'zh' | 'en') => exportQuotationPDF(id, locale),
    onSuccess: (blob, locale) => {
      // 下載檔案
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${id}-${locale}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
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

/**
 * 批次匯出 PDF
 */
export function useBatchExportPDFs() {
  return useMutation({
    mutationFn: batchExportPDFs,
    onSuccess: (blob, variables) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotations-${variables.locale}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
  })
}
