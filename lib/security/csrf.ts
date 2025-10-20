/**
 * CSRF (Cross-Site Request Forgery) 保護模組
 *
 * 提供 CSRF Token 生成、驗證和管理功能
 *
 * 使用方式：
 * ```typescript
 * // 在 middleware.ts 中
 * import { csrfProtection } from '@/lib/security/csrf'
 *
 * export async function middleware(request: NextRequest) {
 *   return csrfProtection(request)
 * }
 *
 * // 在前端
 * const token = getCsrfToken()
 * fetch('/api/data', {
 *   method: 'POST',
 *   headers: { 'X-CSRF-Token': token }
 * })
 * ```
 *
 * ⚠️ 注意：此模組已準備好，但需要手動啟用
 * 啟用步驟：
 * 1. 在 middleware.ts 中引入並使用 csrfProtection
 * 2. 在前端添加 CSRF token 到所有 POST/PUT/DELETE 請求
 * 3. 測試所有 API 端點確保正常運作
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHmac } from 'crypto'

// ========================================
// 配置
// ========================================

const CSRF_COOKIE_NAME = '_csrf'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-me'
const TOKEN_LENGTH = 32

// HTTP 方法白名單（不需要 CSRF 檢查）
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

// 路徑白名單（不需要 CSRF 檢查）
const CSRF_EXEMPT_PATHS = [
  '/api/auth/callback',  // OAuth 回調
  '/api/webhooks/',      // Webhook 端點
]

// ========================================
// Token 生成和驗證
// ========================================

/**
 * 生成 CSRF Token
 *
 * Token 格式: {randomValue}.{signature}
 * signature = HMAC-SHA256(randomValue, CSRF_SECRET)
 */
export function generateCsrfToken(): string {
  const randomValue = randomBytes(TOKEN_LENGTH).toString('hex')
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(randomValue)
    .digest('hex')

  return `${randomValue}.${signature}`
}

/**
 * 驗證 CSRF Token
 *
 * @param token - 要驗證的 token
 * @returns 是否有效
 */
export function verifyCsrfToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return false
  }

  const [randomValue, signature] = parts

  // 重新計算簽名
  const expectedSignature = createHmac('sha256', CSRF_SECRET)
    .update(randomValue)
    .digest('hex')

  // 時間常數比較，防止時序攻擊
  return timingSafeEqual(signature, expectedSignature)
}

/**
 * 時間常數比較（防止時序攻擊）
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

// ========================================
// 路徑檢查
// ========================================

/**
 * 檢查路徑是否需要 CSRF 保護
 */
function requiresCsrfProtection(request: NextRequest): boolean {
  const { pathname, method } = new URL(request.url)

  // 安全的 HTTP 方法不需要檢查
  if (SAFE_METHODS.includes(method)) {
    return false
  }

  // 檢查路徑白名單
  for (const exemptPath of CSRF_EXEMPT_PATHS) {
    if (pathname.startsWith(exemptPath)) {
      return false
    }
  }

  // API 路由需要 CSRF 保護
  return pathname.startsWith('/api/')
}

// ========================================
// Middleware
// ========================================

/**
 * CSRF 保護 Middleware
 *
 * 功能：
 * 1. 為 GET 請求生成並設定 CSRF token（通過 cookie）
 * 2. 驗證 POST/PUT/DELETE 請求的 CSRF token
 * 3. Token 不匹配時返回 403 錯誤
 *
 * @param request - Next.js 請求物件
 * @returns Next.js 響應物件
 */
export async function csrfProtection(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next()

  // GET 請求：生成並設定 CSRF token
  if (request.method === 'GET') {
    const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value

    if (!existingToken || !verifyCsrfToken(existingToken)) {
      const newToken = generateCsrfToken()

      response.cookies.set(CSRF_COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 // 24 小時
      })
    }

    return response
  }

  // 檢查是否需要 CSRF 保護
  if (!requiresCsrfProtection(request)) {
    return response
  }

  // POST/PUT/DELETE 請求：驗證 CSRF token
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  // Token 必須存在
  if (!cookieToken || !headerToken) {
    return NextResponse.json(
      {
        error: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is required for this request'
      },
      { status: 403 }
    )
  }

  // Token 必須匹配
  if (cookieToken !== headerToken) {
    return NextResponse.json(
      {
        error: 'CSRF_TOKEN_MISMATCH',
        message: 'CSRF token validation failed'
      },
      { status: 403 }
    )
  }

  // Token 必須有效
  if (!verifyCsrfToken(cookieToken)) {
    return NextResponse.json(
      {
        error: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token is invalid'
      },
      { status: 403 }
    )
  }

  return response
}

// ========================================
// 前端工具函式
// ========================================

/**
 * 從 Cookie 中獲取 CSRF Token（客戶端）
 *
 * 注意：由於 httpOnly = true，JavaScript 無法直接讀取 cookie
 * 需要伺服器在 HTML 中嵌入 token，或提供 API 端點
 */
export function getCsrfTokenFromCookie(): string | null {
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

/**
 * 創建帶有 CSRF Token 的 fetch 函式
 *
 * 使用方式：
 * ```typescript
 * const csrfFetch = createCsrfFetch()
 * await csrfFetch('/api/data', { method: 'POST', body: JSON.stringify(data) })
 * ```
 */
export function createCsrfFetch() {
  return async (url: string, options: RequestInit = {}) => {
    // 獲取 CSRF token
    const token = getCsrfTokenFromMeta() || getCsrfTokenFromCookie()

    if (!token && options.method && !SAFE_METHODS.includes(options.method.toUpperCase())) {
      console.warn('CSRF token not found, request may fail')
    }

    // 添加 CSRF token 到 headers
    const headers = new Headers(options.headers)
    if (token && options.method && !SAFE_METHODS.includes(options.method.toUpperCase())) {
      headers.set(CSRF_HEADER_NAME, token)
    }

    return fetch(url, {
      ...options,
      headers
    })
  }
}

/**
 * 從 HTML meta 標籤獲取 CSRF Token
 *
 * 需要在 HTML 中添加：
 * <meta name="csrf-token" content="{token}" />
 */
export function getCsrfTokenFromMeta(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta?.getAttribute('content') || null
}

// ========================================
// React Hook（可選）
// ========================================

/**
 * React Hook for CSRF token
 *
 * 使用方式：
 * ```tsx
 * const csrfToken = useCsrfToken()
 *
 * <form>
 *   <input type="hidden" name="_csrf" value={csrfToken} />
 * </form>
 * ```
 */
export function useCsrfToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const [token, setToken] = React.useState<string | null>(null)

  React.useEffect(() => {
    const csrfToken = getCsrfTokenFromMeta() || getCsrfTokenFromCookie()
    setToken(csrfToken)
  }, [])

  return token
}

// ========================================
// 配置檢查
// ========================================

/**
 * 檢查 CSRF 配置是否正確
 */
export function checkCsrfConfig(): {
  isConfigured: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  if (CSRF_SECRET === 'default-csrf-secret-change-me') {
    warnings.push('CSRF_SECRET is using default value. Please set CSRF_SECRET environment variable.')
  }

  if (process.env.NODE_ENV === 'production' && !process.env.CSRF_SECRET) {
    warnings.push('CSRF_SECRET is not set in production environment.')
  }

  return {
    isConfigured: warnings.length === 0,
    warnings
  }
}
