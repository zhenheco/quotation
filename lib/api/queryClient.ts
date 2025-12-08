/**
 * React Query 客戶端配置
 *
 * 配置 QueryClient，包含：
 * - 預設快取策略
 * - 錯誤處理
 * - 重試邏輯
 * - 樂觀更新支援
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query'
import { ApiError, isRetryableError } from './errors'

// ============================================================================
// 快取時間常數（統一管理）
// ============================================================================

/**
 * 標準化的 staleTime 設定
 * - STATIC: 靜態資料（產品、客戶）- 變動少
 * - DYNAMIC: 動態資料（報價單、付款、合約）- 適中
 * - REALTIME: 即時資料（分析數據）- 需要較新
 */
export const STALE_TIME = {
  STATIC: 10 * 60 * 1000,   // 10 分鐘 - 產品、客戶等少變動資料
  DYNAMIC: 5 * 60 * 1000,   // 5 分鐘 - 報價單、付款、合約等
  REALTIME: 2 * 60 * 1000,  // 2 分鐘 - 分析數據、即時統計
} as const

// ============================================================================
// 預設配置
// ============================================================================

/**
 * React Query 預設選項
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // 快取策略
    staleTime: 5 * 60 * 1000,        // 5 分鐘內視為新鮮
    gcTime: 10 * 60 * 1000,          // 10 分鐘後清除未使用的快取（原 cacheTime）

    // 重新取得策略
    refetchOnWindowFocus: false,     // 視窗聚焦時不自動重新取得
    refetchOnReconnect: true,        // 重新連線時重新取得
    refetchOnMount: true,            // 元件掛載時重新取得

    // 重試策略
    retry: (failureCount, error) => {
      // 如果是認證錯誤，不重試
      if (error instanceof ApiError) {
        if (error.type === 'AUTHENTICATION_ERROR' || error.type === 'AUTHORIZATION_ERROR') {
          return false
        }

        // 如果是可重試的錯誤，最多重試 3 次
        if (isRetryableError(error)) {
          return failureCount < 3
        }
      }

      return false
    },

    retryDelay: (attemptIndex) => {
      // 指數退避：1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 30000)
    },
  },

  mutations: {
    // Mutation 不重試（避免重複提交）
    retry: false,

    // 錯誤處理
    onError: (error) => {
      console.error('Mutation error:', error)

      // 認證錯誤時，重定向到登入頁
      if (error instanceof ApiError && error.type === 'AUTHENTICATION_ERROR') {
        window.location.href = '/login'
      }
    },
  },
}

// ============================================================================
// Query Client
// ============================================================================

/**
 * 建立 Query Client 實例
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions,
  })
}

/**
 * 全域 Query Client（僅在客戶端使用）
 */
let browserQueryClient: QueryClient | undefined = undefined

/**
 * 取得 Query Client（確保在瀏覽器環境中單例）
 */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // 伺服器端：每次建立新實例
    return createQueryClient()
  } else {
    // 瀏覽器端：使用單例
    if (!browserQueryClient) {
      browserQueryClient = createQueryClient()
    }
    return browserQueryClient
  }
}

// ============================================================================
// Query Keys 工廠
// ============================================================================

/**
 * Query Key 建構函數
 *
 * 統一管理所有的 query keys，避免重複和衝突
 */
export const queryKeys = {
  // 客戶
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },

  // 產品
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },

  // 報價單
  quotations: {
    all: ['quotations'] as const,
    lists: () => [...queryKeys.quotations.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.quotations.lists(), filters] as const,
    details: () => [...queryKeys.quotations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.quotations.details(), id] as const,
  },

  // 合約
  contracts: {
    all: ['contracts'] as const,
    lists: () => [...queryKeys.contracts.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.contracts.lists(), filters] as const,
    details: () => [...queryKeys.contracts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contracts.details(), id] as const,
    overdue: () => [...queryKeys.contracts.all, 'overdue'] as const,
    paymentProgress: (id: string) =>
      [...queryKeys.contracts.all, 'payment-progress', id] as const,
  },

  // 付款
  payments: {
    all: ['payments'] as const,
    lists: () => [...queryKeys.payments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.payments.lists(), filters] as const,
    unpaid: () => [...queryKeys.payments.all, 'unpaid'] as const,
    collected: () => [...queryKeys.payments.all, 'collected'] as const,
    reminders: () => [...queryKeys.payments.all, 'reminders'] as const,
  },

  // 公司設定
  companySettings: {
    all: ['company-settings'] as const,
    current: () => [...queryKeys.companySettings.all, 'current'] as const,
  },

  // 匯率
  exchangeRates: {
    all: ['exchange-rates'] as const,
    current: (baseCurrency?: string) =>
      [...queryKeys.exchangeRates.all, baseCurrency || 'TWD'] as const,
  },

  // 使用者
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    permissions: () => [...queryKeys.user.all, 'permissions'] as const,
    companies: () => [...queryKeys.user.all, 'companies'] as const,
  },

  // 管理員
  admin: {
    all: ['admin'] as const,
    users: {
      all: () => [...queryKeys.admin.all, 'users'] as const,
      list: () => [...queryKeys.admin.users.all(), 'list'] as const,
      detail: (id: string) => [...queryKeys.admin.users.all(), id] as const,
    },
    companies: {
      all: () => [...queryKeys.admin.all, 'companies'] as const,
      list: () => [...queryKeys.admin.companies.all(), 'list'] as const,
      detail: (id: string) => [...queryKeys.admin.companies.all(), id] as const,
    },
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
  },
}

// ============================================================================
// 快取輔助函數
// ============================================================================

/**
 * 使特定資源的所有查詢失效
 */
export function invalidateResource(
  queryClient: QueryClient,
  resource: keyof typeof queryKeys
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: queryKeys[resource].all,
  })
}

/**
 * 使特定資源的列表查詢失效
 */
export function invalidateResourceList(
  queryClient: QueryClient,
  resource: keyof typeof queryKeys
): Promise<void> {
  const key = queryKeys[resource]
  if ('lists' in key && typeof key.lists === 'function') {
    return queryClient.invalidateQueries({
      queryKey: key.lists(),
    })
  }
  return Promise.resolve()
}

/**
 * 使特定資源的詳情查詢失效
 */
export function invalidateResourceDetail(
  queryClient: QueryClient,
  resource: keyof typeof queryKeys,
  id: string
): Promise<void> {
  const key = queryKeys[resource]
  if ('detail' in key && typeof key.detail === 'function') {
    return queryClient.invalidateQueries({
      queryKey: key.detail(id),
    })
  }
  return Promise.resolve()
}

/**
 * 預取資料
 */
export async function prefetchData<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
  })
}

/**
 * 設定快取資料
 */
export function setQueryData<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  data: T | ((old: T | undefined) => T)
): void {
  queryClient.setQueryData(queryKey, data)
}

/**
 * 取得快取資料
 */
export function getQueryData<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[]
): T | undefined {
  return queryClient.getQueryData<T>(queryKey)
}

/**
 * 移除快取資料
 */
export function removeQueryData(
  queryClient: QueryClient,
  queryKey: readonly unknown[]
): void {
  queryClient.removeQueries({ queryKey })
}

// ============================================================================
// 樂觀更新輔助函數
// ============================================================================

/**
 * 樂觀更新上下文
 */
export interface OptimisticUpdateContext<T> {
  previousData?: T
}

/**
 * 執行樂觀更新
 */
export async function optimisticUpdate<T, TVariables>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  updateFn: (old: T | undefined, variables: TVariables) => T,
  variables: TVariables
): Promise<OptimisticUpdateContext<T>> {
  // 取消進行中的查詢
  await queryClient.cancelQueries({ queryKey })

  // 保存舊資料
  const previousData = queryClient.getQueryData<T>(queryKey)

  // 樂觀更新
  queryClient.setQueryData<T>(queryKey, (old) => updateFn(old, variables))

  return { previousData }
}

/**
 * 回滾樂觀更新
 */
export function rollbackOptimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  context?: OptimisticUpdateContext<T>
): void {
  if (context?.previousData) {
    queryClient.setQueryData(queryKey, context.previousData)
  }
}

// ============================================================================
// 匯出
// ============================================================================

export default getQueryClient
