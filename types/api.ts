/**
 * API 通用型別定義
 *
 * 定義所有 API 請求和回應的通用型別
 */

// 重新導出 ApiError 以確保單一來源
// 必須在檔案開頭 import，因為後面的介面會使用它
import { ApiError as ApiErrorClass } from '@/lib/api/errors'
export { ApiErrorClass as ApiError }
// 建立 local type alias 供檔案內部使用
type ApiError = ApiErrorClass

// ============================================================================
// HTTP 方法
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// ============================================================================
// API 回應型別
// ============================================================================

/**
 * 標準 API 回應格式
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * 成功回應
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
}

/**
 * 錯誤回應
 */
export interface ApiErrorResponse {
  success: false
  error: string
  message?: string
  details?: Record<string, unknown>
}

// ============================================================================
// 分頁型別
// ============================================================================

/**
 * 分頁參數
 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

/**
 * 分頁資訊
 */
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * 分頁回應
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
}

// ============================================================================
// 排序與篩選型別
// ============================================================================

/**
 * 排序方向
 */
export type SortOrder = 'asc' | 'desc'

/**
 * 排序參數
 */
export interface SortParams {
  field: string
  order: SortOrder
}

/**
 * 篩選運算子
 */
export type FilterOperator =
  | 'eq'       // 等於
  | 'ne'       // 不等於
  | 'gt'       // 大於
  | 'gte'      // 大於等於
  | 'lt'       // 小於
  | 'lte'      // 小於等於
  | 'in'       // 包含於
  | 'nin'      // 不包含於
  | 'contains' // 包含
  | 'startsWith' // 開頭為
  | 'endsWith'   // 結尾為

/**
 * 篩選參數
 */
export interface FilterParam {
  field: string
  operator: FilterOperator
  value: unknown
}

/**
 * 查詢參數
 */
export interface QueryParams extends PaginationParams {
  sort?: SortParams
  filters?: FilterParam[]
  search?: string
}

// ============================================================================
// 請求配置型別
// ============================================================================

/**
 * API 請求配置
 */
export interface ApiRequestConfig extends Omit<RequestInit, 'body'> {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  timeout?: number
  retries?: number
  retryDelay?: number
}

/**
 * API 攔截器
 */
export interface ApiInterceptor {
  onRequest?: (config: ApiRequestConfig) => ApiRequestConfig | Promise<ApiRequestConfig>
  onResponse?: <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>
  onError?: (error: ApiError) => void | Promise<void>
}

// ============================================================================
// 錯誤型別
// ============================================================================

/**
 * API 錯誤型別
 */
export type ApiErrorType =
  | 'NETWORK_ERROR'      // 網路錯誤
  | 'TIMEOUT_ERROR'      // 超時錯誤
  | 'VALIDATION_ERROR'   // 驗證錯誤
  | 'AUTHENTICATION_ERROR' // 認證錯誤
  | 'AUTHORIZATION_ERROR'  // 授權錯誤
  | 'NOT_FOUND_ERROR'    // 找不到資源
  | 'CONFLICT_ERROR'     // 衝突錯誤
  | 'SERVER_ERROR'       // 伺服器錯誤
  | 'UNKNOWN_ERROR'      // 未知錯誤

// ApiError 已在檔案開頭重新導出（確保單一來源）

// ============================================================================
// 快取型別
// ============================================================================

/**
 * 快取策略
 */
export type CacheStrategy =
  | 'no-cache'           // 不快取
  | 'cache-first'        // 快取優先
  | 'network-first'      // 網路優先
  | 'cache-only'         // 僅快取
  | 'network-only'       // 僅網路

/**
 * 快取配置
 */
export interface CacheConfig {
  strategy?: CacheStrategy
  ttl?: number           // Time to live (毫秒)
  key?: string           // 自訂快取鍵
}

// ============================================================================
// Hook 狀態型別
// ============================================================================

/**
 * API Hook 狀態
 */
export interface ApiHookState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  isSuccess: boolean
  isError: boolean
  isLoading: boolean
}

/**
 * Mutation Hook 狀態
 */
export interface MutationHookState<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>
  mutateAsync: (variables: TVariables) => Promise<TData>
  data: TData | null
  loading: boolean
  error: ApiError | null
  isSuccess: boolean
  isError: boolean
  isLoading: boolean
  reset: () => void
}

// ============================================================================
// 批次操作型別
// ============================================================================

/**
 * 批次操作結果
 */
export interface BatchResult<T = unknown> {
  success: T[]
  failed: {
    item: T
    error: string
  }[]
  total: number
  successCount: number
  failedCount: number
}

/**
 * 批次操作請求
 */
export interface BatchRequest<T> {
  items: T[]
  stopOnError?: boolean
}

// ============================================================================
// 上傳型別
// ============================================================================

/**
 * 上傳進度
 */
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * 檔案上傳回應
 */
export interface FileUploadResponse {
  url: string
  filename: string
  size: number
  mimeType: string
}

// ============================================================================
// Webhook 型別
// ============================================================================

/**
 * Webhook 事件
 */
export interface WebhookEvent<T = unknown> {
  event: string
  timestamp: string
  data: T
}

// ============================================================================
// 實用工具型別
// ============================================================================

/**
 * 提取 API 回應資料型別
 */
export type ExtractApiData<T> = T extends ApiResponse<infer U> ? U : never

/**
 * 提取分頁資料型別
 */
export type ExtractPaginatedData<T> = T extends PaginatedResponse<infer U> ? U : never

/**
 * 可空型別
 */
export type Nullable<T> = T | null

/**
 * 可選型別
 */
export type Optional<T> = T | undefined

/**
 * 深度部分型別
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
