'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CustomerContract,
  CustomerContractWithCustomer,
  ContractPaymentProgress,
  ContractStatus,
  PaymentFrequency,
} from '@/types/extended.types'

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

  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch contracts')
  }

  const data = await response.json()
  return data.contracts || data.data || []
}

async function fetchContract(id: string): Promise<CustomerContractWithCustomer> {
  const response = await fetch(`/api/contracts/${id}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch contract')
  }

  const data = await response.json()
  return data.contract || data.data
}

async function fetchContractProgress(id: string): Promise<ContractPaymentProgress> {
  const response = await fetch(`/api/contracts/${id}/payment-progress`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch payment progress')
  }

  const data = await response.json()
  return data.progress || data.data
}

async function fetchOverdueContracts(): Promise<CustomerContractWithCustomer[]> {
  const response = await fetch('/api/contracts/overdue')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch overdue contracts')
  }

  const data = await response.json()
  return data.contracts || data.data || []
}

async function createContractFromQuotation(
  params: CreateContractParams
): Promise<CustomerContract> {
  const response = await fetch('/api/contracts/from-quotation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create contract')
  }

  const data = await response.json()
  return data.contract || data.data
}

async function updateNextCollection(
  contractId: string,
  next_collection_date: string,
  next_collection_amount: number
): Promise<CustomerContract> {
  const response = await fetch(`/api/contracts/${contractId}/next-collection`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      next_collection_date,
      next_collection_amount,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update next collection')
  }

  const data = await response.json()
  return data.contract || data.data
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
