/**
 * 通用 API Hooks
 *
 * 提供可重用的 React Query hooks，包含：
 * - useApi - 通用資料取用 hook
 * - useMutation - 通用變更 hook
 * - 自動快取失效
 * - Loading/Error/Success 狀態管理
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query'
import { apiClient } from './client'
import { buildCsrfHeaders } from '@/lib/security/csrf'
import { queryKeys, invalidateResource, invalidateResourceList, invalidateResourceDetail, type OptimisticUpdateContext, optimisticUpdate, rollbackOptimisticUpdate } from './queryClient'
import type { ApiError } from './errors'

// ============================================================================
// 通用 Query Hook
// ============================================================================

/**
 * 通用資料取用 Hook
 *
 * @example
 * const { data, isLoading, error } = useApi('/customers', ['customers'])
 */
export function useApi<T>(
  endpoint: string,
  queryKey: readonly unknown[],
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, ApiError>({
    queryKey,
    queryFn: () => apiClient.get<T>(endpoint),
    ...options,
  })
}

// ============================================================================
// 通用 Mutation Hook
// ============================================================================

/**
 * Mutation 配置選項
 */
export interface MutationConfig<TData, TVariables> {
  invalidateKeys?: readonly unknown[][] | ((data: TData, variables: TVariables) => readonly unknown[][])
  onSuccessMessage?: string | ((data: TData, variables: TVariables) => string)
  onErrorMessage?: string | ((error: ApiError) => string)
  optimisticUpdate?: {
    queryKey: readonly unknown[]
    updateFn: (old: TData | undefined, variables: TVariables) => TData
  }
}

/**
 * 通用變更 Hook（POST/PUT/DELETE）
 *
 * @example
 * const createCustomer = useMutationApi<Customer, CreateCustomerData>(
 *   (data) => apiClient.post('/customers', data),
 *   { invalidateKeys: [queryKeys.customers.all] }
 * )
 */
export function useMutationApi<TData = unknown, TVariables = unknown, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  config?: MutationConfig<TData, TVariables> & Omit<UseMutationOptions<TData, ApiError, TVariables, TContext>, 'mutationFn'>
) {
  const queryClient = useQueryClient()

  return useMutation<TData, ApiError, TVariables, TContext>({
    mutationFn,
    ...config,
    onMutate: async (variables) => {
      // 執行使用者定義的 onMutate
      let userContext: TContext | undefined
      if (config?.onMutate) {
        // @ts-expect-error - TanStack Query onMutate argument type compatibility
        userContext = await config.onMutate(variables)
      }

      // 執行樂觀更新
      let optimisticContext: OptimisticUpdateContext<TData> | undefined
      if (config?.optimisticUpdate) {
        optimisticContext = await optimisticUpdate(
          queryClient,
          config.optimisticUpdate.queryKey,
          config.optimisticUpdate.updateFn,
          variables
        )
      }

      return { userContext, optimisticContext } as TContext
    },
    onSuccess: (data, variables, context) => {
      // 使快取失效
      if (config?.invalidateKeys) {
        const keys = typeof config.invalidateKeys === 'function'
          ? config.invalidateKeys(data, variables)
          : config.invalidateKeys

        keys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key })
        })
      }

      // 執行使用者定義的 onSuccess
      if (config?.onSuccess) {
        // @ts-expect-error - TanStack Query onSuccess argument count compatibility
        config.onSuccess(data, variables, context)
      }

      // 顯示成功訊息（如果有整合 toast）
      if (config?.onSuccessMessage) {
        const message = typeof config.onSuccessMessage === 'function'
          ? config.onSuccessMessage(data, variables)
          : config.onSuccessMessage
        // TODO: 整合 toast
        console.log('Success:', message)
      }
    },
    onError: (error, variables, context) => {
      // 回滾樂觀更新
      if (config?.optimisticUpdate && context) {
        const ctx = context as unknown
        rollbackOptimisticUpdate(
          queryClient,
          config.optimisticUpdate.queryKey,
          // @ts-expect-error - Context type compatibility
          ctx.optimisticContext
        )
      }

      // 執行使用者定義的 onError
      if (config?.onError) {
        // @ts-expect-error - TanStack Query onError argument count compatibility
        config.onError(error, variables, context)
      }

      // 顯示錯誤訊息（如果有整合 toast）
      if (config?.onErrorMessage) {
        const message = typeof config.onErrorMessage === 'function'
          ? config.onErrorMessage(error)
          : config.onErrorMessage
        // TODO: 整合 toast
        console.error('Error:', message)
      }
    },
  })
}

// ============================================================================
// 資源特定 Hooks
// ============================================================================

/**
 * 取得列表 Hook
 */
export function useList<T>(
  endpoint: string,
  queryKey: readonly unknown[],
  options?: Omit<UseQueryOptions<T[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useApi<T[]>(endpoint, queryKey, options)
}

/**
 * 取得單一項目 Hook
 */
export function useDetail<T>(
  endpoint: string,
  queryKey: readonly unknown[],
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useApi<T>(endpoint, queryKey, {
    ...options,
    enabled: options?.enabled ?? !!endpoint, // 如果沒有 endpoint，不執行查詢
  })
}

/**
 * 建立項目 Hook
 */
export function useCreate<TData, TVariables>(
  endpoint: string,
  config?: MutationConfig<TData, TVariables>
) {
  return useMutationApi<TData, TVariables>(
    (data) => apiClient.post<TData>(endpoint, data),
    config
  )
}

/**
 * 更新項目 Hook
 */
export function useUpdate<TData, TVariables>(
  getEndpoint: (id: string) => string,
  config?: MutationConfig<TData, TVariables & { id: string }>
) {
  return useMutationApi<TData, TVariables & { id: string }>(
    ({ id, ...data }) => apiClient.put<TData>(getEndpoint(id), data),
    config
  )
}

/**
 * 刪除項目 Hook
 */
export function useDelete<TData = { message: string }>(
  getEndpoint: (id: string) => string,
  config?: MutationConfig<TData, string>
) {
  return useMutationApi<TData, string>(
    (id) => apiClient.delete<TData>(getEndpoint(id)),
    config
  )
}

// ============================================================================
// 批次操作 Hooks
// ============================================================================

/**
 * 批次刪除 Hook
 */
export function useBatchDelete<TData = { deleted: number }>(
  endpoint: string,
  config?: MutationConfig<TData, string[]>
) {
  return useMutationApi<TData, string[]>(
    (ids) => apiClient.post<TData>(endpoint, { ids }),
    config
  )
}

/**
 * 批次更新 Hook
 */
export function useBatchUpdate<TData, TVariables>(
  endpoint: string,
  config?: MutationConfig<TData, TVariables>
) {
  return useMutationApi<TData, TVariables>(
    (data) => apiClient.post<TData>(endpoint, data),
    config
  )
}

// ============================================================================
// 分頁 Hooks
// ============================================================================

/**
 * 分頁參數
 */
export interface PaginationParams {
  page?: number
  limit?: number
}

/**
 * 分頁回應
 */
export interface PaginatedData<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * 分頁列表 Hook
 */
export function usePaginatedList<T>(
  endpoint: string,
  queryKey: readonly unknown[],
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<PaginatedData<T>, ApiError>, 'queryKey' | 'queryFn'>
) {
  const queryParams = new URLSearchParams()
  if (params?.page) queryParams.set('page', params.page.toString())
  if (params?.limit) queryParams.set('limit', params.limit.toString())

  const fullEndpoint = queryParams.toString()
    ? `${endpoint}?${queryParams.toString()}`
    : endpoint

  return useApi<PaginatedData<T>>(fullEndpoint, [...queryKey, params], options)
}

// ============================================================================
// 搜尋 Hooks
// ============================================================================

/**
 * 搜尋參數
 */
export interface SearchParams extends PaginationParams {
  search?: string
  sort?: {
    field: string
    order: 'asc' | 'desc'
  }
}

/**
 * 搜尋列表 Hook
 */
export function useSearchList<T>(
  endpoint: string,
  queryKey: readonly unknown[],
  params?: SearchParams,
  options?: Omit<UseQueryOptions<PaginatedData<T>, ApiError>, 'queryKey' | 'queryFn'>
) {
  const queryParams = new URLSearchParams()
  if (params?.page) queryParams.set('page', params.page.toString())
  if (params?.limit) queryParams.set('limit', params.limit.toString())
  if (params?.search) queryParams.set('search', params.search)
  if (params?.sort) {
    queryParams.set('sortField', params.sort.field)
    queryParams.set('sortOrder', params.sort.order)
  }

  const fullEndpoint = queryParams.toString()
    ? `${endpoint}?${queryParams.toString()}`
    : endpoint

  return useApi<PaginatedData<T>>(fullEndpoint, [...queryKey, params], options)
}

// ============================================================================
// 檔案上傳 Hook
// ============================================================================

/**
 * 檔案上傳回應
 */
export interface FileUploadResponse {
  url: string
  filename: string
  size: number
  mimeType: string
}

/**
 * 檔案上傳 Hook
 */
export function useFileUpload(
  endpoint: string,
  config?: MutationConfig<FileUploadResponse, File>
) {
  return useMutationApi<FileUploadResponse, File>(
    async (file) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: buildCsrfHeaders({ includeContentType: false }),
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      return response.json()
    },
    config
  )
}

// ============================================================================
// 輪詢 Hook
// ============================================================================

/**
 * 輪詢資料 Hook
 */
export function usePolling<T>(
  endpoint: string,
  queryKey: readonly unknown[],
  intervalMs: number = 5000,
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn' | 'refetchInterval'>
) {
  return useApi<T>(endpoint, queryKey, {
    ...options,
    refetchInterval: intervalMs,
  })
}

// ============================================================================
// 匯出
// ============================================================================

export {
  queryKeys,
  invalidateResource,
  invalidateResourceList,
  invalidateResourceDetail,
}
