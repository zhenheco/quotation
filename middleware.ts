import { createServerClient } from '@supabase/ssr'
import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'
import { addSecurityHeaders } from '@/lib/security/headers'
import { csrfProtection } from '@/lib/security/csrf'
import {
  checkRateLimit,
  createRateLimitResponse
} from '@/lib/middleware/rate-limiter'

// Environment variables from wrangler.jsonc vars (requires compatibility_date >= 2025-04-01)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Step 1: Handle paths that don't need locale prefix
  const shouldSkipIntl =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||  // Admin console doesn't use i18n
    pathname.startsWith('/test-send-api') ||  // Testing tool
    pathname === '/' ||
    pathname === '/login'  // Keep for redirect

  // Step 2: For paths that need intl, let next-intl handle them first
  let response: NextResponse

  if (shouldSkipIntl) {
    // Create a basic response for non-localized paths
    response = NextResponse.next({
      request,
    })
  } else {
    // Let next-intl middleware handle the request
    response = intlMiddleware(request)
  }

  // Step 3: Rate Limiting for API routes
  // 根據端點敏感度使用不同的速率限制
  if (pathname.startsWith('/api/')) {
    let windowMs = 60000   // 預設 1 分鐘
    let maxRequests = 60   // 預設每分鐘 60 次

    // 嚴格限制：認證、管理員、重設操作
    if (
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/admin/') ||
      pathname === '/api/user/reset-data'
    ) {
      windowMs = 60000
      maxRequests = 10
    }
    // Email 相關：更嚴格的限制
    else if (
      pathname.includes('/send') ||
      pathname === '/api/payments/reminders'
    ) {
      windowMs = 3600000  // 1 小時
      maxRequests = 20
    }
    // 批次操作
    else if (pathname.includes('/batch/')) {
      windowMs = 300000   // 5 分鐘
      maxRequests = 5
    }

    const rateLimitResult = checkRateLimit(request, windowMs, maxRequests)
    if (rateLimitResult.limited) {
      return createRateLimitResponse(rateLimitResult)
    }
  }

  // Step 4: Create Supabase client and update session cookies on the response
  /**
   * Cookie 安全設定說明：
   * - httpOnly: false - Supabase Auth 需要客戶端 JavaScript 存取 session token
   *   這是 Supabase SSR 的標準做法，安全性由 RLS 政策保護
   * - secure: true - 僅在 HTTPS 上傳輸
   * - sameSite: 'lax' - 防止 CSRF 攻擊，同時允許導航請求
   */
  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              sameSite: 'lax',
              secure: true,
              // Supabase Auth 要求 httpOnly: false 以便客戶端可以讀取 session
              // 資料安全由 Supabase RLS 政策保護，而非 cookie 訪問控制
              httpOnly: false,
              path: '/',
            })
          )
        },
      },
    }
  )

  // Step 5: Trigger session refresh
  // Skip for API routes (they handle auth themselves) and public pages (no auth needed)
  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/terms', '/privacy']
  const isPublicPath = publicPaths.some(p => pathname.includes(p))

  if (!pathname.startsWith('/api') && !isPublicPath) {
    try {
      await supabase.auth.getUser()
    } catch (error) {
      // Log error but don't block the request
      console.error('[Middleware] Auth error:', error)
    }
  }

  // Step 6: Add security headers
  const secureResponse = addSecurityHeaders(response)

  // Step 7: CSRF Protection
  // 對於 API 路由的 POST/PUT/DELETE/PATCH 請求，驗證 CSRF token
  if (pathname.startsWith('/api/')) {
    const csrfResult = await csrfProtection(request)
    // 如果 CSRF 驗證失敗，返回錯誤響應
    if (csrfResult.status === 403) {
      return csrfResult
    }
    // 如果是 GET 請求，CSRF middleware 會設定 token cookie
    // 我們需要將這些 cookies 複製到最終響應
    const csrfCookies = csrfResult.cookies.getAll()
    csrfCookies.forEach(cookie => {
      secureResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24
      })
    })
  }

  return secureResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
