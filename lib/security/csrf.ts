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
import React from 'react'

// Web Crypto API compatible functions for Edge Runtime
async function generateRandomBytes(length: number): Promise<Uint8Array> {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return array
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function createHmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const dataBytes = encoder.encode(data)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes)
  return bytesToHex(new Uint8Array(signature))
}

// ========================================
// 配置
// ========================================

export const CSRF_COOKIE_NAME = '_csrf'
export const CSRF_HEADER_NAME = 'x-csrf-token'

// CSRF Secret - 生產環境必須設定
// 注意：build 時會使用預設值，運行時會檢查
const DEV_SECRET = 'dev-csrf-secret-only-for-development'
const CSRF_SECRET = process.env.CSRF_SECRET || DEV_SECRET
const TOKEN_LENGTH = 32

// 生產環境安全檢查
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const IS_SECURE_SECRET = CSRF_SECRET !== DEV_SECRET && CSRF_SECRET.length >= 32

// HTTP 方法白名單（不需要 CSRF 檢查）
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

// 路徑白名單（不需要 CSRF 檢查）
const CSRF_EXEMPT_PATHS = [
  '/api/auth/callback',  // OAuth 回調
  '/api/webhooks/',      // Webhook 端點
  '/api/ocr/',           // OCR 服務（已有 auth + permission 保護）
  '/api/subscriptions/', // 訂閱 API（已有 Supabase auth 保護）
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
export async function generateCsrfToken(): Promise<string> {
  const randomValue = bytesToHex(await generateRandomBytes(TOKEN_LENGTH))
  const signature = await createHmacSha256(CSRF_SECRET, randomValue)

  return `${randomValue}.${signature}`
}

/**
 * 驗證 CSRF Token
 *
 * @param token - 要驗證的 token
 * @returns 是否有效
 */
export async function verifyCsrfToken(token: string): Promise<boolean> {
  if (!token || typeof token !== 'string') {
    return false
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return false
  }

  const [randomValue, signature] = parts

  // 重新計算簽名
  const expectedSignature = await createHmacSha256(CSRF_SECRET, randomValue)

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
  const { pathname } = new URL(request.url)
  const method = request.method

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
  // 運行時檢查 CSRF_SECRET（生產環境必須設定）
  if (IS_PRODUCTION && !IS_SECURE_SECRET) {
    console.error('[CSRF] ⚠️ SECURITY WARNING: CSRF_SECRET not properly configured in production!')
    console.error('[CSRF] Please set CSRF_SECRET environment variable with at least 32 characters')

    // 在生產環境中，如果沒有正確設定 CSRF_SECRET，拒絕所有需要 CSRF 保護的請求
    if (!SAFE_METHODS.includes(request.method)) {
      return NextResponse.json(
        {
          error: 'CSRF_CONFIGURATION_ERROR',
          message: 'Server security configuration error. Please contact administrator.'
        },
        { status: 500 }
      )
    }
  }

  const response = NextResponse.next()

  // GET 請求：生成並設定 CSRF token
  if (request.method === 'GET') {
    const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
    const isTokenValid = existingToken ? await verifyCsrfToken(existingToken) : false

    if (!existingToken || !isTokenValid) {
      const newToken = await generateCsrfToken()

      response.cookies.set(CSRF_COOKIE_NAME, newToken, {
        httpOnly: false, // 必須為 false 以便前端 JavaScript 讀取
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
  const isValid = await verifyCsrfToken(cookieToken)
  if (!isValid) {
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
  const [token, setToken] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
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
  isSecure: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  if (CSRF_SECRET === DEV_SECRET) {
    warnings.push('CSRF_SECRET is using development default value. Please set CSRF_SECRET environment variable.')
  }

  if (CSRF_SECRET.length < 32) {
    warnings.push('CSRF_SECRET should be at least 32 characters long for security.')
  }

  if (IS_PRODUCTION && !IS_SECURE_SECRET) {
    warnings.push('CRITICAL: CSRF_SECRET is not properly configured in production environment!')
  }

  return {
    isConfigured: warnings.length === 0,
    isSecure: IS_SECURE_SECRET,
    warnings
  }
}
