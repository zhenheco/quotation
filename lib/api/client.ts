/**
 * 統一 API 客戶端
 *
 * 封裝 fetch 邏輯，提供：
 * - CSRF token 處理
 * - 統一錯誤處理
 * - 請求/回應攔截器
 * - 自動重試機制
 * - 超時處理
 * - TypeScript 型別支援
 */

import type {
  ApiResponse,
  ApiRequestConfig,
  ApiInterceptor,
  HttpMethod,
} from '@/types/api'
import {
  ApiError,
  NetworkError,
  TimeoutError,
  createErrorFromResponse,
  isRetryableError,
  handleError,
} from './errors'

// ============================================================================
// 常數定義
// ============================================================================

const DEFAULT_TIMEOUT = 30000 // 30 秒
const DEFAULT_RETRIES = 3
const DEFAULT_RETRY_DELAY = 1000 // 1 秒
const API_BASE_URL = '/api'

// ============================================================================
// CSRF Token 管理
// ============================================================================

let csrfToken: string | null = null

/**
 * 取得 CSRF Token
 */
async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken
  }

  try {
    const response = await fetch('/api/csrf-token')
    const data = await response.json()
    csrfToken = data.token
    return csrfToken
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error)
    return ''
  }
}

/**
 * 重設 CSRF Token
 */
export function resetCsrfToken(): void {
  csrfToken = null
}

// ============================================================================
// 攔截器管理
// ============================================================================

const interceptors: ApiInterceptor[] = []

/**
 * 註冊攔截器
 */
export function registerInterceptor(interceptor: ApiInterceptor): () => void {
  interceptors.push(interceptor)

  // 返回取消註冊函數
  return () => {
    const index = interceptors.indexOf(interceptor)
    if (index > -1) {
      interceptors.splice(index, 1)
    }
  }
}

/**
 * 執行請求攔截器
 */
async function runRequestInterceptors(
  config: ApiRequestConfig
): Promise<ApiRequestConfig> {
  let modifiedConfig = config

  for (const interceptor of interceptors) {
    if (interceptor.onRequest) {
      modifiedConfig = await interceptor.onRequest(modifiedConfig)
    }
  }

  return modifiedConfig
}

/**
 * 執行回應攔截器
 */
async function runResponseInterceptors<T>(
  response: ApiResponse<T>
): Promise<ApiResponse<T>> {
  let modifiedResponse = response

  for (const interceptor of interceptors) {
    if (interceptor.onResponse) {
      modifiedResponse = await interceptor.onResponse(modifiedResponse)
    }
  }

  return modifiedResponse
}

/**
 * 執行錯誤攔截器
 */
async function runErrorInterceptors(error: ApiError): Promise<void> {
  for (const interceptor of interceptors) {
    if (interceptor.onError) {
      await interceptor.onError(error)
    }
  }
}

// ============================================================================
// 請求建構
// ============================================================================

/**
 * 建構完整的 URL
 */
function buildUrl(endpoint: string, params?: Record<string, unknown>): string {
  const url = new URL(endpoint, window.location.origin)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  return url.toString()
}

/**
 * 建構請求標頭
 */
async function buildHeaders(
  method: HttpMethod,
  config?: ApiRequestConfig
): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...config?.headers,
  }

  // 新增 CSRF Token（POST、PUT、DELETE 請求）
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = await getCsrfToken()
    if (token) {
      headers['X-CSRF-Token'] = token
    }
  }

  return headers
}

// ============================================================================
// 超時處理
// ============================================================================

/**
 * 建立超時 Promise
 */
function createTimeoutPromise(timeout: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError())
    }, timeout)
  })
}

/**
 * 帶超時的 fetch
 */
async function fetchWithTimeout(
  url: string,
  config: RequestInit,
  timeout: number
): Promise<Response> {
  try {
    return await Promise.race([
      fetch(url, config),
      createTimeoutPromise(timeout),
    ])
  } catch (error) {
    if (error instanceof TimeoutError) {
      throw error
    }
    throw new NetworkError()
  }
}

// ============================================================================
// 重試邏輯
// ============================================================================

/**
 * 延遲函數
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 帶重試的請求
 */
async function fetchWithRetry(
  url: string,
  config: RequestInit,
  timeout: number,
  retries: number,
  retryDelay: number
): Promise<Response> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, config, timeout)

      // 如果成功，直接返回
      if (response.ok) {
        return response
      }

      // 如果是客戶端錯誤（4xx），不重試
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // 伺服器錯誤（5xx），可重試
      lastError = await createErrorFromResponse(response)
    } catch (error) {
      lastError = error as Error

      // 如果不是可重試的錯誤，立即拋出
      if (!isRetryableError(lastError)) {
        throw lastError
      }
    }

    // 如果不是最後一次嘗試，等待後重試
    if (attempt < retries) {
      await delay(retryDelay * (attempt + 1)) // 指數退避
    }
  }

  throw lastError || new NetworkError()
}

// ============================================================================
// 核心 API 客戶端
// ============================================================================

/**
 * 發送 API 請求
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  method: HttpMethod = 'GET',
  config?: ApiRequestConfig
): Promise<T> {
  try {
    // 執行請求攔截器
    const modifiedConfig = await runRequestInterceptors(config || {})

    // 建構 URL
    const url = buildUrl(
      endpoint.startsWith('/') ? endpoint : `${API_BASE_URL}/${endpoint}`,
      modifiedConfig.params
    )

    // 建構請求設定
    const requestConfig: RequestInit = {
      method,
      headers: await buildHeaders(method, modifiedConfig),
      credentials: 'include', // 包含 cookies
      ...modifiedConfig,
    }

    // 新增 body（如果有）
    if (modifiedConfig.body && method !== 'GET') {
      requestConfig.body = JSON.stringify(modifiedConfig.body)
    }

    // 發送請求（帶重試）
    const response = await fetchWithRetry(
      url,
      requestConfig,
      modifiedConfig.timeout || DEFAULT_TIMEOUT,
      modifiedConfig.retries ?? DEFAULT_RETRIES,
      modifiedConfig.retryDelay || DEFAULT_RETRY_DELAY
    )

    // 處理回應
    if (!response.ok) {
      const error = await createErrorFromResponse(response)
      await runErrorInterceptors(error)
      handleError(error)
      throw error
    }

    // 解析 JSON
    let data: ApiResponse<T>
    try {
      data = await response.json()
    } catch {
      // 如果無法解析 JSON，視為成功但無資料
      data = { success: true, data: undefined as T }
    }

    // 執行回應攔截器
    const modifiedResponse = await runResponseInterceptors(data)

    // 檢查業務邏輯錯誤
    if (!modifiedResponse.success && modifiedResponse.error) {
      const error = new ApiError(modifiedResponse.error)
      await runErrorInterceptors(error)
      handleError(error)
      throw error
    }

    return modifiedResponse.data as T
  } catch (error) {
    // 如果是 ApiError，直接拋出
    if (error instanceof ApiError) {
      throw error
    }

    // 轉換為 ApiError
    const apiError = error instanceof Error
      ? new ApiError(error.message)
      : new ApiError('發生未知錯誤')

    await runErrorInterceptors(apiError)
    handleError(apiError)
    throw apiError
  }
}

// ============================================================================
// 便利方法
// ============================================================================

/**
 * GET 請求
 */
export async function get<T = unknown>(
  endpoint: string,
  config?: ApiRequestConfig
): Promise<T> {
  return apiRequest<T>(endpoint, 'GET', config)
}

/**
 * POST 請求
 */
export async function post<T = unknown>(
  endpoint: string,
  data?: unknown,
  config?: ApiRequestConfig
): Promise<T> {
  return apiRequest<T>(endpoint, 'POST', {
    ...config,
    body: data,
  })
}

/**
 * PUT 請求
 */
export async function put<T = unknown>(
  endpoint: string,
  data?: unknown,
  config?: ApiRequestConfig
): Promise<T> {
  return apiRequest<T>(endpoint, 'PUT', {
    ...config,
    body: data,
  })
}

/**
 * PATCH 請求
 */
export async function patch<T = unknown>(
  endpoint: string,
  data?: unknown,
  config?: ApiRequestConfig
): Promise<T> {
  return apiRequest<T>(endpoint, 'PATCH', {
    ...config,
    body: data,
  })
}

/**
 * DELETE 請求
 */
export async function del<T = unknown>(
  endpoint: string,
  config?: ApiRequestConfig
): Promise<T> {
  return apiRequest<T>(endpoint, 'DELETE', config)
}

// ============================================================================
// 預設匯出
// ============================================================================

/**
 * API 客戶端
 */
export const apiClient = {
  request: apiRequest,
  get,
  post,
  put,
  patch,
  delete: del,
  registerInterceptor,
  resetCsrfToken,
}

export default apiClient
