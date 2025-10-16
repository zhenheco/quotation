import { createServerClient } from '@supabase/ssr'
import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Step 1: Handle paths that don't need locale prefix
  const shouldSkipIntl =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname === '/login' ||
    pathname === '/'

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
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Step 4: Trigger session refresh
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
