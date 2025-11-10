'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CustomerContract,
  CustomerContractWithCustomer,
  ContractPaymentProgress,
  ContractStatus,
  PaymentFrequency,
} from '@/types/extended.types'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

// ============================================================================
// Types
// ============================================================================

export interface CreateContractParams {
  quotation_id: string
  signed_date: string
  start_date: string
  end_date: string
  payment_terms: PaymentFrequency
  next_collection_date?: string
  next_collection_amount?: number
}

export interface UpdateContractParams {
  status?: ContractStatus
  next_collection_date?: string
  next_collection_amount?: number
  notes?: string
}

export interface ContractFilters {
  status?: ContractStatus
  customer_id?: string
  start_date?: string
  end_date?: string
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchContracts(filters?: ContractFilters): Promise<CustomerContractWithCustomer[]> {
  const params = new URLSearchParams()

  if (filters?.status) params.append('status', filters.status)
  if (filters?.customer_id) params.append('customer_id', filters.customer_id)
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  const queryString = params.toString()
  const url = `/api/contracts${queryString ? `?${queryString}` : ''}`

  return apiGet<CustomerContractWithCustomer[]>(url)
}

async function fetchContract(id: string): Promise<CustomerContractWithCustomer> {
  return apiGet<CustomerContractWithCustomer>(`/api/contracts/${id}`)
}

async function fetchContractProgress(id: string): Promise<ContractPaymentProgress> {
  return apiGet<ContractPaymentProgress>(`/api/contracts/${id}/payment-progress`)
}

async function fetchOverdueContracts(): Promise<CustomerContractWithCustomer[]> {
  return apiGet<CustomerContractWithCustomer[]>('/api/contracts/overdue')
}

async function createContractFromQuotation(
  params: CreateContractParams
): Promise<CustomerContract> {
  return apiPost<CustomerContract>('/api/contracts/from-quotation', params)
}

async function updateNextCollection(
  contractId: string,
  next_collection_date: string,
  next_collection_amount: number
): Promise<CustomerContract> {
  return apiPut<CustomerContract>(`/api/contracts/${contractId}/next-collection`, {
    next_collection_date,
    next_collection_amount,
  })
}

async function updateContract(
  contractId: string,
  params: UpdateContractParams
): Promise<CustomerContract> {
  return apiPut<CustomerContract>(`/api/contracts/${contractId}`, params)
}

async function deleteContract(contractId: string): Promise<void> {
  await apiDelete(`/api/contracts/${contractId}`)
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * 取得合約列表（含過濾）
 *
 * @param filters - 過濾條件
 *
 * @example
 * ```tsx
 * function ContractList() {
 *   const { data: contracts, isLoading, error } = useContracts({ status: 'active' })
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (error) return <ErrorMessage error={error} />
 *
 *   return (
 *     <div>
 *       {contracts?.map(contract => (
 *         <ContractCard key={contract.id} contract={contract} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => fetchContracts(filters),
    staleTime: 5 * 60 * 1000, // 5 分鐘
  })
}

/**
 * 取得單一合約詳情（含付款進度）
 *
 * @param contractId - 合約 ID
 *
 * @example
 * ```tsx
 * function ContractDetail({ id }: { id: string }) {
 *   const { data, isLoading, error } = useContractDetail(id)
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (error) return <ErrorMessage error={error} />
 *   if (!data) return <NotFound />
 *
 *   const { contract, progress } = data
 *
 *   return (
 *     <div>
 *       <ContractInfo contract={contract} />
 *       <PaymentProgress progress={progress} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useContractDetail(contractId: string) {
  const contractQuery = useQuery({
    queryKey: ['contracts', contractId],
    queryFn: () => fetchContract(contractId),
    enabled: !!contractId,
    staleTime: 5 * 60 * 1000,
  })

  const progressQuery = useQuery({
    queryKey: ['contracts', contractId, 'progress'],
    queryFn: () => fetchContractProgress(contractId),
    enabled: !!contractId,
    staleTime: 2 * 60 * 1000, // 付款進度更新較頻繁，2 分鐘
  })

  return {
    contract: contractQuery.data,
    progress: progressQuery.data,
    isLoading: contractQuery.isLoading || progressQuery.isLoading,
    error: contractQuery.error || progressQuery.error,
    refetch: () => {
      contractQuery.refetch()
      progressQuery.refetch()
    },
  }
}

/**
 * 取得逾期合約列表
 *
 * @example
 * ```tsx
 * function OverdueAlert() {
 *   const { data: overdueContracts, isLoading } = useOverdueContracts()
 *
 *   if (isLoading) return null
 *   if (!overdueContracts?.length) return null
 *
 *   return (
 *     <Alert variant="warning">
 *       有 {overdueContracts.length} 個合約逾期未收款
 *     </Alert>
 *   )
 * }
 * ```
 */
export function useOverdueContracts() {
  return useQuery({
    queryKey: ['contracts', 'overdue'],
    queryFn: fetchOverdueContracts,
    staleTime: 2 * 60 * 1000,
    // 自動定時重新取得（每 5 分鐘）
    refetchInterval: 5 * 60 * 1000,
  })
}

/**
 * 從報價單建立合約
 *
 * @example
 * ```tsx
 * function ConvertToContractDialog({ quotation }: { quotation: Quotation }) {
 *   const createContract = useCreateContractFromQuotation()
 *   const router = useRouter()
 *
 *   const onSubmit = async (data: CreateContractParams) => {
 *     try {
 *       const contract = await createContract.mutateAsync({
 *         quotation_id: quotation.id,
 *         ...data
 *       })
 *       toast.success('合約建立成功')
 *       router.push(`/contracts/${contract.id}`)
 *     } catch (error) {
 *       toast.error('建立失敗')
 *     }
 *   }
 *
 *   return <form onSubmit={handleSubmit(onSubmit)}>...</form>
 * }
 * ```
 */
export function useCreateContractFromQuotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createContractFromQuotation,
    onSuccess: (newContract) => {
      // 使合約列表失效
      queryClient.invalidateQueries({ queryKey: ['contracts'] })

      // 更新報價單列表（報價單已轉為合約）
      queryClient.invalidateQueries({ queryKey: ['quotations'] })

      // 如果有報價單 ID，更新該報價單
      if (newContract.quotation_id) {
        queryClient.invalidateQueries({
          queryKey: ['quotations', newContract.quotation_id],
        })
      }

      // 設定新合約的快取
      queryClient.setQueryData(['contracts', newContract.id], newContract)
    },
  })
}

/**
 * 更新合約
 *
 * @param contractId - 合約 ID
 *
 * @example
 * ```tsx
 * function ContractEditForm({ contract }: { contract: CustomerContract }) {
 *   const updateContract = useUpdateContract(contract.id)
 *
 *   const onSubmit = async (data: UpdateContractParams) => {
 *     try {
 *       await updateContract.mutateAsync(data)
 *       toast.success('合約更新成功')
 *     } catch (error) {
 *       toast.error('更新失敗')
 *     }
 *   }
 *
 *   return <form onSubmit={handleSubmit(onSubmit)}>...</form>
 * }
 * ```
 */
export function useUpdateContract(contractId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: UpdateContractParams) => updateContract(contractId, params),
    onSuccess: (updatedContract) => {
      // 更新合約列表
      queryClient.invalidateQueries({ queryKey: ['contracts'] })

      // 更新單一合約快取
      queryClient.setQueryData(['contracts', contractId], updatedContract)

      // 更新付款進度
      queryClient.invalidateQueries({ queryKey: ['contracts', contractId, 'progress'] })
    },
  })
}

/**
 * 更新下次收款資訊
 *
 * @param contractId - 合約 ID
 *
 * @example
 * ```tsx
 * function NextCollectionForm({ contract }: { contract: CustomerContract }) {
 *   const updateCollection = useUpdateNextCollection(contract.id)
 *
 *   const onSubmit = async (data: { date: string; amount: number }) => {
 *     try {
 *       await updateCollection.mutateAsync({
 *         next_collection_date: data.date,
 *         next_collection_amount: data.amount,
 *       })
 *       toast.success('更新成功')
 *     } catch (error) {
 *       toast.error('更新失敗')
 *     }
 *   }
 *
 *   return <form onSubmit={handleSubmit(onSubmit)}>...</form>
 * }
 * ```
 */
export function useUpdateNextCollection(contractId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      next_collection_date,
      next_collection_amount,
    }: {
      next_collection_date: string
      next_collection_amount: number
    }) => updateNextCollection(contractId, next_collection_date, next_collection_amount),
    onSuccess: (updatedContract) => {
      // 更新合約列表
      queryClient.invalidateQueries({ queryKey: ['contracts'] })

      // 更新單一合約快取
      queryClient.setQueryData(['contracts', contractId], updatedContract)

      // 更新付款進度
      queryClient.invalidateQueries({ queryKey: ['contracts', contractId, 'progress'] })
    },
  })
}

/**
 * 刪除合約
 *
 * @example
 * ```tsx
 * function ContractActions({ contract }: { contract: CustomerContract }) {
 *   const deleteContract = useDeleteContract()
 *
 *   const handleDelete = async () => {
 *     if (!confirm('確定要刪除此合約？')) return
 *
 *     try {
 *       await deleteContract.mutateAsync(contract.id)
 *       toast.success('合約已刪除')
 *     } catch (error) {
 *       toast.error('刪除失敗')
 *     }
 *   }
 *
 *   return <button onClick={handleDelete}>刪除</button>
 * }
 * ```
 */
export function useDeleteContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteContract,
    onMutate: async (contractId) => {
      // 取消進行中的查詢
      await queryClient.cancelQueries({ queryKey: ['contracts'] })

      // 儲存前一個狀態
      const previousContracts = queryClient.getQueryData(['contracts'])

      // 樂觀更新：從列表中移除合約
      queryClient.setQueriesData({ queryKey: ['contracts'] }, (old: unknown) => {
        if (!old) return old
        if (Array.isArray(old)) {
          return old.filter((c: { id: string }) => c.id !== contractId)
        }
        return old
      })

      return { previousContracts }
    },
    onSuccess: () => {
      // 使所有合約相關查詢失效
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: (err, contractId, context) => {
      // 如果失敗，還原資料
      if (context?.previousContracts) {
        queryClient.setQueryData(['contracts'], context.previousContracts)
      }
    },
  })
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * 取得合約付款進度
 *
 * @param contractId - 合約 ID
 */
export function useContractProgress(contractId: string) {
  return useQuery({
    queryKey: ['contracts', contractId, 'progress'],
    queryFn: () => fetchContractProgress(contractId),
    enabled: !!contractId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * 取得即將到期的合約（未來 30 天內）
 */
export function useExpiringContracts() {
  const { data: contracts } = useContracts({ status: 'active' })

  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const expiringContracts = contracts?.filter((contract) => {
    const endDate = new Date(contract.end_date)
    return endDate >= now && endDate <= thirtyDaysLater
  })

  return {
    data: expiringContracts,
  }
}
