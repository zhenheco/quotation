import { createServerClient } from '@supabase/ssr'
import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'
import { addSecurityHeaders } from '@/lib/security/headers'
import { csrfProtection } from '@/lib/security/csrf'

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

  // Step 3: Create Supabase client and update session cookies on the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
              httpOnly: false,
              path: '/',
            })
          )
        },
      },
    }
  )

  // Step 4: Trigger session refresh
  // Skip for API routes as they handle auth themselves
  if (!pathname.startsWith('/api')) {
    try {
      await supabase.auth.getUser()
    } catch (error) {
      // Log error but don't block the request
      console.error('[Middleware] Auth error:', error)
    }
  }

  // Step 5: Add security headers
  const secureResponse = addSecurityHeaders(response)

  // Step 6: CSRF Protection
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
