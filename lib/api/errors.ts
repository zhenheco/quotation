/**
 * API 錯誤處理系統
 *
 * 提供統一的錯誤處理、錯誤訊息格式化和錯誤邊界整合
 */

import type { ApiErrorType } from '@/types/api'

// ============================================================================
// 自訂錯誤類別
// ============================================================================

/**
 * API 錯誤基礎類別
 */
export class ApiError extends Error {
  type: ApiErrorType
  status?: number
  code?: string
  details?: Record<string, unknown>

  constructor(
    message: string,
    type: ApiErrorType = 'UNKNOWN_ERROR',
    status?: number,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
    this.type = type
    this.status = status
    this.details = details

    // 維持正確的 prototype chain
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

/**
 * 網路錯誤
 */
export class NetworkError extends ApiError {
  constructor(message = '網路連線失敗，請檢查您的網路連線') {
    super(message, 'NETWORK_ERROR')
    this.name = 'NetworkError'
  }
}

/**
 * 超時錯誤
 */
export class TimeoutError extends ApiError {
  constructor(message = '請求超時，請稍後再試') {
    super(message, 'TIMEOUT_ERROR')
    this.name = 'TimeoutError'
  }
}

/**
 * 驗證錯誤
 */
export class ValidationError extends ApiError {
  constructor(
    message = '資料驗證失敗',
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * 認證錯誤
 */
export class AuthenticationError extends ApiError {
  constructor(message = '未登入或登入已過期，請重新登入') {
    super(message, 'AUTHENTICATION_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

/**
 * 授權錯誤
 */
export class AuthorizationError extends ApiError {
  constructor(message = '您沒有權限執行此操作') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

/**
 * 找不到資源錯誤
 */
export class NotFoundError extends ApiError {
  constructor(message = '找不到請求的資源') {
    super(message, 'NOT_FOUND_ERROR', 404)
    this.name = 'NotFoundError'
  }
}

/**
 * 衝突錯誤
 */
export class ConflictError extends ApiError {
  constructor(message = '資料衝突，該資源可能已被修改') {
    super(message, 'CONFLICT_ERROR', 409)
    this.name = 'ConflictError'
  }
}

/**
 * 伺服器錯誤
 */
export class ServerError extends ApiError {
  constructor(message = '伺服器發生錯誤，請稍後再試') {
    super(message, 'SERVER_ERROR', 500)
    this.name = 'ServerError'
  }
}

// ============================================================================
// 錯誤工廠函數
// ============================================================================

/**
 * 根據 HTTP 狀態碼建立對應的錯誤
 */
export function createErrorFromStatus(
  status: number,
  message?: string,
  details?: Record<string, unknown>
): ApiError {
  switch (status) {
    case 400:
      return new ValidationError(message, details)
    case 401:
      return new AuthenticationError(message)
    case 403:
      return new AuthorizationError(message)
    case 404:
      return new NotFoundError(message)
    case 409:
      return new ConflictError(message)
    case 408:
      return new TimeoutError(message)
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(message)
    default:
      return new ApiError(
        message || '發生未知錯誤',
        'UNKNOWN_ERROR',
        status,
        details
      )
  }
}

/**
 * 從 Response 物件建立錯誤
 */
export async function createErrorFromResponse(response: Response): Promise<ApiError> {
  let errorData: unknown
  let message = response.statusText

  try {
    errorData = await response.json()
    const data = errorData as { error?: string; message?: string; details?: unknown }
    message = data.error || data.message || message
  } catch {
    // 無法解析 JSON，使用 statusText
  }

  const details = (errorData as { details?: Record<string, unknown> })?.details;
  return createErrorFromStatus(
    response.status,
    message,
    details && typeof details === 'object' ? details as Record<string, unknown> : undefined
  )
}

// ============================================================================
// 錯誤訊息格式化
// ============================================================================

/**
 * 格式化錯誤訊息（支援國際化）
 */
export function formatErrorMessage(
  error: Error | ApiError,
  locale: 'zh' | 'en' = 'zh'
): string {
  if (error instanceof ApiError) {
    // 使用預定義的錯誤訊息
    return error.message
  }

  // 一般錯誤
  if (locale === 'zh') {
    return error.message || '發生未知錯誤'
  }

  return error.message || 'An unknown error occurred'
}

/**
 * 取得使用者友善的錯誤訊息
 */
export function getUserFriendlyMessage(error: Error | ApiError): string {
  if (error instanceof NetworkError) {
    return '網路連線有問題，請檢查您的網路設定'
  }

  if (error instanceof TimeoutError) {
    return '請求時間過長，請稍後再試'
  }

  if (error instanceof AuthenticationError) {
    return '請重新登入以繼續使用'
  }

  if (error instanceof AuthorizationError) {
    return '您沒有權限執行此操作，請聯絡管理員'
  }

  if (error instanceof ValidationError) {
    return '輸入的資料有誤，請檢查後重試'
  }

  if (error instanceof NotFoundError) {
    return '找不到您要查看的內容'
  }

  if (error instanceof ConflictError) {
    return '資料已被其他人修改，請重新載入後再試'
  }

  if (error instanceof ServerError) {
    return '系統暫時無法處理您的請求，請稍後再試'
  }

  return '發生錯誤，請稍後再試'
}

// ============================================================================
// 錯誤分類
// ============================================================================

/**
 * 判斷是否為網路錯誤
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

/**
 * 判斷是否為認證錯誤
 */
export function isAuthError(error: unknown): error is AuthenticationError | AuthorizationError {
  return error instanceof AuthenticationError || error instanceof AuthorizationError
}

/**
 * 判斷是否為驗證錯誤
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

/**
 * 判斷是否為伺服器錯誤
 */
export function isServerError(error: unknown): error is ServerError {
  return error instanceof ServerError
}

/**
 * 判斷錯誤是否可重試
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) return true
  if (error instanceof TimeoutError) return true
  if (error instanceof ServerError) return true
  return false
}

// ============================================================================
// 錯誤處理器
// ============================================================================

/**
 * 全域錯誤處理器
 */
export interface ErrorHandler {
  (error: Error | ApiError): void
}

const errorHandlers: ErrorHandler[] = []

/**
 * 註冊全域錯誤處理器
 */
export function registerErrorHandler(handler: ErrorHandler): () => void {
  errorHandlers.push(handler)

  // 返回取消註冊函數
  return () => {
    const index = errorHandlers.indexOf(handler)
    if (index > -1) {
      errorHandlers.splice(index, 1)
    }
  }
}

/**
 * 觸發全域錯誤處理器
 */
export function handleError(error: Error | ApiError): void {
  // 呼叫所有註冊的錯誤處理器
  errorHandlers.forEach(handler => {
    try {
      handler(error)
    } catch (err) {
      console.error('Error in error handler:', err)
    }
  })

  // 記錄錯誤到 console
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error)
  }
}

// ============================================================================
// 錯誤邊界輔助函數
// ============================================================================

/**
 * 錯誤邊界狀態
 */
export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * 重設錯誤邊界
 */
export function resetErrorBoundary(
  setState: (state: ErrorBoundaryState) => void
): void {
  setState({ hasError: false, error: null })
}

// ============================================================================
// 錯誤記錄
// ============================================================================

/**
 * 記錄錯誤到外部服務（如 Sentry）
 */
export function logError(
  error: Error | ApiError,
  context?: Record<string, unknown>
): void {
  // 開發環境直接輸出
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', error, context)
    return
  }

  // 生產環境可整合 Sentry 或其他錯誤追蹤服務
  // TODO: 整合 Sentry
  // Sentry.captureException(error, { extra: context })
}

// ============================================================================
// 錯誤轉換
// ============================================================================

/**
 * 將未知錯誤轉換為 ApiError
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 'UNKNOWN_ERROR')
  }

  if (typeof error === 'string') {
    return new ApiError(error, 'UNKNOWN_ERROR')
  }

  return new ApiError('發生未知錯誤', 'UNKNOWN_ERROR')
}
