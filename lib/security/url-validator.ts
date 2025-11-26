/**
 * URL 驗證模組
 *
 * 防止 Open Redirect 攻擊
 * 確保重定向 URL 的安全性
 */

/**
 * 允許的重定向域名白名單
 */
const ALLOWED_REDIRECT_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'quote24.cc',
  'quotation-system.acejou27.workers.dev',
  process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : null,
  process.env.VERCEL_URL || null,
].filter(Boolean) as string[]

/**
 * 檢查 URL 是否為相對路徑
 */
export function isRelativeUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//')
}

/**
 * 檢查 URL 是否為絕對路徑且屬於允許的域名
 */
export function isAllowedAbsoluteUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)

    // 檢查協議（只允許 http 和 https）
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false
    }

    // 檢查域名是否在白名單中
    return ALLOWED_REDIRECT_DOMAINS.some(domain => {
      if (domain === parsedUrl.hostname) {
        return true
      }
      // 允許子域名（例如：app.example.com 匹配 example.com）
      if (parsedUrl.hostname.endsWith(`.${domain}`)) {
        return true
      }
      return false
    })
  } catch {
    return false
  }
}

/**
 * 驗證重定向 URL 是否安全
 *
 * @param url - 要驗證的 URL
 * @param defaultUrl - 驗證失敗時的預設 URL
 * @returns 安全的 URL
 */
export function validateRedirectUrl(
  url: string | null | undefined,
  defaultUrl: string = '/'
): string {
  // 如果沒有提供 URL，使用預設值
  if (!url) {
    return defaultUrl
  }

  // 如果是相對路徑，直接返回
  if (isRelativeUrl(url)) {
    return url
  }

  // 如果是允許的絕對路徑，返回
  if (isAllowedAbsoluteUrl(url)) {
    return url
  }

  // 否則返回預設值
  console.warn(`⚠️  Security: Blocked potential open redirect to ${url}`)
  return defaultUrl
}

/**
 * 建立安全的重定向 URL
 *
 * @param baseUrl - 基礎 URL
 * @param redirectPath - 重定向路徑
 * @returns 安全的完整 URL
 */
export function createSafeRedirectUrl(
  baseUrl: string,
  redirectPath: string = '/'
): string {
  const validatedPath = validateRedirectUrl(redirectPath)

  // 如果已經是相對路徑，直接拼接
  if (isRelativeUrl(validatedPath)) {
    return `${baseUrl}${validatedPath}`
  }

  // 如果是絕對路徑且已驗證，直接返回
  return validatedPath
}

/**
 * 從查詢參數中提取並驗證重定向 URL
 *
 * @param searchParams - URL 查詢參數
 * @param paramName - 參數名稱（預設為 'redirect' 或 'returnTo'）
 * @param defaultUrl - 預設 URL
 * @returns 安全的重定向 URL
 */
export function getValidatedRedirectUrl(
  searchParams: URLSearchParams,
  paramNames: string[] = ['redirect', 'returnTo', 'redirectTo'],
  defaultUrl: string = '/'
): string {
  for (const paramName of paramNames) {
    const url = searchParams.get(paramName)
    if (url) {
      return validateRedirectUrl(url, defaultUrl)
    }
  }

  return defaultUrl
}

/**
 * 清理 URL 中的危險字元
 *
 * 防止 JavaScript injection 和 XSS
 */
export function sanitizeUrl(url: string): string {
  // 移除 javascript:, data:, vbscript: 等危險協議
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
  ]

  const lowerUrl = url.toLowerCase().trim()

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      console.warn(`⚠️  Security: Blocked dangerous protocol in URL: ${protocol}`)
      return '/'
    }
  }

  return url
}

/**
 * 完整的 URL 安全驗證
 *
 * 結合所有驗證規則
 */
export function validateUrlSafety(
  url: string | null | undefined,
  defaultUrl: string = '/'
): string {
  if (!url) {
    return defaultUrl
  }

  // 1. 清理危險協議
  const sanitized = sanitizeUrl(url)

  // 2. 驗證重定向規則
  return validateRedirectUrl(sanitized, defaultUrl)
}
