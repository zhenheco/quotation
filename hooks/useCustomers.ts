'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Customer,
  CreateCustomerData,
  UpdateCustomerData
} from '@/types/models'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

// ============================================================================
// Types
// ============================================================================

export type { Customer, CreateCustomerData, UpdateCustomerData }

export interface BilingualText {
  zh: string
  en: string
}

export interface CreateCustomerInput {
  name: BilingualText
  email: string
  phone?: string
  fax?: string
  address?: BilingualText
  tax_id?: string
  contact_person?: BilingualText
  owner_id?: string
  customer_number?: string
  company_id?: string
}

export interface UpdateCustomerInput {
  name?: BilingualText
  email?: string
  phone?: string
  fax?: string
  address?: BilingualText
  tax_id?: string
  contact_person?: BilingualText
  owner_id?: string
  customer_number?: string
  company_id?: string
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchCustomers(): Promise<Customer[]> {
  return apiGet<Customer[]>('/api/customers')
}

async function fetchCustomer(id: string): Promise<Customer> {
  return apiGet<Customer>(`/api/customers/${id}`)
}

async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  return apiPost<Customer>('/api/customers', input)
}

async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
  return apiPut<Customer>(`/api/customers/${id}`, input)
}

async function deleteCustomer(id: string): Promise<void> {
  await apiDelete(`/api/customers/${id}`)
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * 取得所有客戶列表
 *
 * @example
 * ```tsx
 * function CustomerList() {
 *   const { data: customers, isLoading, error } = useCustomers()
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (error) return <ErrorMessage error={error} />
 *
 *   return (
 *     <div>
 *       {customers?.map(customer => (
 *         <CustomerCard key={customer.id} customer={customer} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  })
}

/**
 * 取得單一客戶資料
 *
 * @param id - 客戶 ID
 *
 * @example
 * ```tsx
 * function CustomerDetail({ id }: { id: string }) {
 *   const { data: customer, isLoading } = useCustomer(id)
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (!customer) return <NotFound />
 *
 *   return <CustomerInfo customer={customer} />
 * }
 * ```
 */
export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => fetchCustomer(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * 建立新客戶
 *
 * @example
 * ```tsx
 * function CreateCustomerForm() {
 *   const createCustomer = useCreateCustomer()
 *   const router = useRouter()
 *
 *   const onSubmit = async (data: CreateCustomerInput) => {
 *     try {
 *       await createCustomer.mutateAsync(data)
 *       toast.success('客戶建立成功')
 *       router.push('/customers')
 *     } catch (error) {
 *       toast.error('建立失敗')
 *     }
 *   }
 *
 *   return <form onSubmit={handleSubmit(onSubmit)}>...</form>
 * }
 * ```
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: (newCustomer) => {
      // 使快取失效以重新取得列表
      queryClient.invalidateQueries({ queryKey: ['customers'] })

      // 可選：直接更新快取
      queryClient.setQueryData(['customers', newCustomer.id], newCustomer)
    },
  })
}

/**
 * 更新客戶資料
 *
 * @example
 * ```tsx
 * function EditCustomerForm({ customer }: { customer: Customer }) {
 *   const updateCustomer = useUpdateCustomer(customer.id)
 *
 *   const onSubmit = async (data: UpdateCustomerInput) => {
 *     try {
 *       await updateCustomer.mutateAsync(data)
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
export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateCustomerInput) => updateCustomer(id, input),
    onSuccess: (updatedCustomer) => {
      // 更新列表快取
      queryClient.invalidateQueries({ queryKey: ['customers'] })

      // 更新單一客戶快取
      queryClient.setQueryData(['customers', id], updatedCustomer)

      // 讓報價單快取失效，因為報價單包含客戶資料（email等）
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })
}

/**
 * 刪除客戶（含樂觀更新）
 *
 * @example
 * ```tsx
 * function CustomerCard({ customer }: { customer: Customer }) {
 *   const deleteCustomer = useDeleteCustomer()
 *
 *   const handleDelete = async () => {
 *     if (!confirm('確定要刪除此客戶？')) return
 *
 *     try {
 *       await deleteCustomer.mutateAsync(customer.id)
 *       toast.success('刪除成功')
 *     } catch (error) {
 *       toast.error('刪除失敗')
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       <Button onClick={handleDelete}>刪除</Button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCustomer,

    // 樂觀更新：立即從 UI 移除
    onMutate: async (id) => {
      // 取消進行中的查詢
      await queryClient.cancelQueries({ queryKey: ['customers'] })

      // 備份當前資料
      const previousCustomers = queryClient.getQueryData<Customer[]>(['customers'])

      // 樂觀更新：從列表中移除
      queryClient.setQueryData<Customer[]>(['customers'], (old) =>
        old?.filter((c) => c.id !== id) ?? []
      )

      return { previousCustomers }
    },

    // 如果失敗，還原資料
    onError: (err, id, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(['customers'], context.previousCustomers)
      }
    },

    // 完成後重新取得資料
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * 搜尋客戶（前端過濾）
 *
 * @param searchTerm - 搜尋關鍵字
 *
 * @example
 * ```tsx
 * function CustomerSearch() {
 *   const [search, setSearch] = useState('')
 *   const { data: customers } = useSearchCustomers(search)
 *
 *   return (
 *     <div>
 *       <Input
 *         value={search}
 *         onChange={(e) => setSearch(e.target.value)}
 *         placeholder="搜尋客戶..."
 *       />
 *       {customers?.map(c => <CustomerCard key={c.id} customer={c} />)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSearchCustomers(searchTerm: string) {
  const { data: customers, ...rest } = useCustomers()

  const filteredCustomers = customers?.filter((customer) => {
    if (!searchTerm) return true

    const search = searchTerm.toLowerCase()
    const name = customer.name as BilingualText
    const address = customer.address as BilingualText | null
    const contactPerson = customer.contact_person as BilingualText | null

    return (
      name.zh.toLowerCase().includes(search) ||
      name.en.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search) ||
      customer.tax_id?.toLowerCase().includes(search) ||
      address?.zh.toLowerCase().includes(search) ||
      address?.en.toLowerCase().includes(search) ||
      contactPerson?.zh.toLowerCase().includes(search) ||
      contactPerson?.en.toLowerCase().includes(search)
    )
  })

  return {
    data: filteredCustomers,
    ...rest,
  }
}
