/**
 * 統一的 API Client
 *
 * 提供一致的 fetch 封裝，自動處理：
 * - Credentials (cookies)
 * - Content-Type headers
 * - 錯誤處理
 * - 請求/回應日誌
 */

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

interface ApiError {
  error: string
  details?: unknown
}

/**
 * 統一的 fetch 函式
 * 自動包含 credentials 和正確的 headers
 */
async function apiFetch<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { body, headers = {}, ...restOptions } = options

  // 準備 headers
  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
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
    const errorData: ApiError = await response.json().catch((): ApiError => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }))

    // 詳細的錯誤日誌
    console.error('[API Error]', {
      url,
      method: options.method || 'GET',
      status: response.status,
      error: errorData.error,
      details: errorData.details,
    })

    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }

  // 解析成功回應
  const data = await response.json() as { data?: T } | T
  return ('data' in data && data.data !== undefined ? data.data : data) as T
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
export async function apiDelete<T = unknown>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE' })
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
 * 通用的 API 客戶端（向後兼容）
 */
export const apiClient = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  patch: apiPatch,
}
