'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Payment,
  CollectedPaymentRecord,
  UnpaidPaymentRecord,
  PaymentType,
  PaymentMethod,
  PaymentFrequency,
  PaymentTransactionStatus,
} from '@/types/extended.types'
import { apiGet, apiPost } from '@/lib/api-client'

// ============================================================================
// Types
// ============================================================================

export interface CreatePaymentInput {
  customer_id: string
  quotation_id?: string
  contract_id?: string
  payment_type: PaymentType
  payment_date: string
  amount: number
  currency: string
  payment_frequency?: PaymentFrequency
  payment_method?: PaymentMethod
  reference_number?: string
  notes?: string
}

export interface PaymentFilters {
  customer_id?: string
  quotation_id?: string
  contract_id?: string
  status?: PaymentTransactionStatus
  payment_type?: PaymentType
  start_date?: string
  end_date?: string
}

export interface PaymentStatistics {
  current_month: {
    total_collected: number
    total_pending: number
    total_overdue: number
    currency: string
  }
  current_year: {
    total_collected: number
    total_pending: number
    total_overdue: number
    currency: string
  }
  overdue: {
    count: number
    total_amount: number
    average_days: number
  }
}

export interface NextCollectionReminder {
  contract_id: string
  customer_name: string
  next_collection_date: string
  next_collection_amount: number
  days_until_due: number
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchPayments(filters?: PaymentFilters): Promise<Payment[]> {
  const params = new URLSearchParams()

  if (filters?.customer_id) params.append('customer_id', filters.customer_id)
  if (filters?.quotation_id) params.append('quotation_id', filters.quotation_id)
  if (filters?.contract_id) params.append('contract_id', filters.contract_id)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.payment_type) params.append('payment_type', filters.payment_type)
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  const queryString = params.toString()
  const url = `/api/payments${queryString ? `?${queryString}` : ''}`

  return apiGet<Payment[]>(url)
}

async function fetchCollectedPayments(): Promise<CollectedPaymentRecord[]> {
  return apiGet<CollectedPaymentRecord[]>('/api/payments/collected')
}

async function fetchUnpaidPayments(): Promise<UnpaidPaymentRecord[]> {
  return apiGet<UnpaidPaymentRecord[]>('/api/payments/unpaid')
}

async function fetchPaymentReminders(): Promise<NextCollectionReminder[]> {
  return apiGet<NextCollectionReminder[]>('/api/payments/reminders')
}

async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  return apiPost<Payment>('/api/payments', input)
}

async function markPaymentAsOverdue(paymentId: string): Promise<void> {
  await apiPost(`/api/payments/${paymentId}/mark-overdue`)
}

async function fetchPaymentStatistics(): Promise<PaymentStatistics> {
  return apiGet<PaymentStatistics>('/api/payments/statistics')
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * 取得收款記錄列表（含過濾）
 *
 * @param filters - 過濾條件
 *
 * @example
 * ```tsx
 * function PaymentList() {
 *   const { data: payments, isLoading } = usePayments({ status: 'confirmed' })
 *
 *   if (isLoading) return <LoadingSpinner />
 *
 *   return (
 *     <div>
 *       {payments?.map(payment => (
 *         <PaymentCard key={payment.id} payment={payment} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => fetchPayments(filters),
    staleTime: 2 * 60 * 1000, // 2 分鐘
  })
}

/**
 * 取得已收款記錄
 *
 * @example
 * ```tsx
 * function CollectedPaymentsList() {
 *   const { data: payments, isLoading } = useCollectedPayments()
 *
 *   return (
 *     <div>
 *       <h2>已收款項目</h2>
 *       {payments?.map(payment => (
 *         <div key={payment.payment_id}>
 *           {payment.customer_name} - {payment.amount}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useCollectedPayments() {
  return useQuery({
    queryKey: ['payments', 'collected'],
    queryFn: fetchCollectedPayments,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * 取得未收款記錄（超過 30 天）
 *
 * @example
 * ```tsx
 * function UnpaidAlert() {
 *   const { data: unpaidPayments } = useUnpaidPayments()
 *
 *   if (!unpaidPayments?.length) return null
 *
 *   return (
 *     <Alert variant="warning">
 *       有 {unpaidPayments.length} 筆逾期未收款項目
 *     </Alert>
 *   )
 * }
 * ```
 */
export function useUnpaidPayments() {
  return useQuery({
    queryKey: ['payments', 'unpaid'],
    queryFn: fetchUnpaidPayments,
    staleTime: 2 * 60 * 1000,
    // 自動定時重新取得（每 5 分鐘）
    refetchInterval: 5 * 60 * 1000,
  })
}

/**
 * 取得收款提醒（未來 30 天內到期）
 *
 * @example
 * ```tsx
 * function PaymentReminders() {
 *   const { data: reminders } = usePaymentReminders()
 *
 *   return (
 *     <div>
 *       {reminders?.map(reminder => (
 *         <div key={reminder.contract_id}>
 *           {reminder.customer_name} 將於 {reminder.days_until_due} 天後到期
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function usePaymentReminders() {
  return useQuery({
    queryKey: ['payments', 'reminders'],
    queryFn: fetchPaymentReminders,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

/**
 * 記錄收款
 *
 * @example
 * ```tsx
 * function RecordPaymentForm({ contract }: { contract: CustomerContract }) {
 *   const recordPayment = useCreatePayment()
 *
 *   const onSubmit = async (data: CreatePaymentInput) => {
 *     try {
 *       await recordPayment.mutateAsync({
 *         ...data,
 *         contract_id: contract.id,
 *         customer_id: contract.customer_id,
 *       })
 *       toast.success('收款記錄已建立')
 *     } catch (error) {
 *       toast.error('記錄失敗')
 *     }
 *   }
 *
 *   return <form onSubmit={handleSubmit(onSubmit)}>...</form>
 * }
 * ```
 */
export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPayment,
    onSuccess: (newPayment) => {
      // 使收款列表失效
      queryClient.invalidateQueries({ queryKey: ['payments'] })

      // 更新相關的合約或報價單
      if (newPayment.contract_id) {
        queryClient.invalidateQueries({
          queryKey: ['contracts', newPayment.contract_id],
        })
        queryClient.invalidateQueries({
          queryKey: ['contracts', newPayment.contract_id, 'progress'],
        })
      }

      if (newPayment.quotation_id) {
        queryClient.invalidateQueries({
          queryKey: ['quotations', newPayment.quotation_id],
        })
      }

      // 更新統計資料
      queryClient.invalidateQueries({ queryKey: ['payments', 'statistics'] })
    },
  })
}

/**
 * 標記為逾期
 */
export function useMarkPaymentAsOverdue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markPaymentAsOverdue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payments', 'unpaid'] })
      queryClient.invalidateQueries({ queryKey: ['payments', 'statistics'] })
    },
  })
}

/**
 * 取得收款統計資料
 *
 * @example
 * ```tsx
 * function PaymentDashboard() {
 *   const { data: stats, isLoading } = usePaymentStatistics()
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (!stats) return null
 *
 *   return (
 *     <div>
 *       <h2>本月收款統計</h2>
 *       <p>已收: {stats.current_month.total_collected}</p>
 *       <p>待收: {stats.current_month.total_pending}</p>
 *       <p>逾期: {stats.current_month.total_overdue}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePaymentStatistics() {
  return useQuery({
    queryKey: ['payments', 'statistics'],
    queryFn: fetchPaymentStatistics,
    staleTime: 5 * 60 * 1000,
    // 定時更新統計
    refetchInterval: 10 * 60 * 1000, // 10 分鐘
  })
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * 取得特定客戶的收款記錄
 */
export function useCustomerPayments(customerId: string) {
  return usePayments({ customer_id: customerId })
}

/**
 * 取得特定合約的收款記錄
 */
export function useContractPayments(contractId: string) {
  return usePayments({ contract_id: contractId })
}

/**
 * 取得特定報價單的收款記錄
 */
export function useQuotationPayments(quotationId: string) {
  return usePayments({ quotation_id: quotationId })
}
