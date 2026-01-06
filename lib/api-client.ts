/**
 * 統一的 API Client
 *
 * 提供一致的 fetch 封裝，自動處理：
 * - Credentials (cookies)
 * - Content-Type headers
 * - CSRF Token（自動從 cookie 讀取並添加到 header）
 * - 錯誤處理
 * - 請求/回應日誌
 */

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/security/csrf'

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

interface ApiError {
  error: string
  details?: unknown
}

/**
 * 從 cookie 中獲取 CSRF token
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === CSRF_COOKIE_NAME) {
      return value
    }
  }

  return null
}

// HTTP 方法白名單（不需要 CSRF token）
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

/**
 * 統一的 fetch 函式
 * 自動包含 credentials、CSRF token 和正確的 headers
 */
async function apiFetch<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { body, headers = {}, ...restOptions } = options
  const method = (options.method || 'GET').toUpperCase()

  // 準備 headers
  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // 對於非安全方法，添加 CSRF token
  if (!SAFE_METHODS.includes(method)) {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      (finalHeaders as Record<string, string>)[CSRF_HEADER_NAME] = csrfToken
    }
  }

  // 準備 body
  const finalBody = body ? JSON.stringify(body) : undefined

  // 執行請求
  const response = await fetch(url, {
    ...restOptions,
    headers: finalHeaders,
    body: finalBody,
    credentials: 'include', // 🔑 關鍵：自動包含 cookies
  })

  // 處理回應
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as ApiError
    const fallbackError: ApiError = {
      error: `HTTP ${response.status}: ${response.statusText}`,
    }
    const finalError: ApiError = errorData.error ? errorData : fallbackError

    // 詳細的錯誤日誌
    console.error('[API Error]', {
      url,
      method: options.method || 'GET',
      status: response.status,
      error: finalError.error,
      details: finalError.details,
    })

    throw new Error(finalError.error || `Request failed with status ${response.status}`)
  }

  // 解析成功回應
  const data = await response.json() as T | { data: T }
  if (typeof data === 'object' && data !== null && 'data' in data) {
    return data.data
  }
  return data as T
}

/**
 * GET 請求
 */
export async function apiGet<T = unknown>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'GET' })
}

/**
 * POST 請求
 */
export async function apiPost<T = unknown>(
  url: string,
  body?: unknown
): Promise<T> {
  return apiFetch<T>(url, { method: 'POST', body })
}

/**
 * PUT 請求
 */
export async function apiPut<T = unknown>(
  url: string,
  body?: unknown
): Promise<T> {
  return apiFetch<T>(url, { method: 'PUT', body })
}

/**
 * DELETE 請求
 */
export async function apiDelete<T = unknown>(
  url: string,
  body?: unknown
): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE', body })
}

/**
 * PATCH 請求
 */
export async function apiPatch<T = unknown>(
  url: string,
  body?: unknown
): Promise<T> {
  return apiFetch<T>(url, { method: 'PATCH', body })
}

/**
 * POST FormData 請求（用於檔案上傳）
 * 注意：不設定 Content-Type，讓瀏覽器自動設定 multipart/form-data
 */
export async function apiPostFormData<T = unknown>(
  url: string,
  formData: FormData
): Promise<T> {
  const csrfToken = getCsrfToken()
  const headers: HeadersInit = {}

  if (csrfToken) {
    headers[CSRF_HEADER_NAME] = csrfToken
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as ApiError
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

/**
 * 通用的 API 客戶端（向後兼容）
 */
export const apiClient = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  patch: apiPatch,
  postFormData: apiPostFormData,
}
