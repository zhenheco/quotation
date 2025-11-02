import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

export function createApiClient(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = requestHeaders.get('cookie')
          if (!cookieHeader) return []

          return cookieHeader.split(';').map(cookie => {
            const [name, ...valueParts] = cookie.trim().split('=')
            return {
              name: name.trim(),
              value: valueParts.join('=').trim()
            }
          })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            requestHeaders.set('set-cookie', `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax`)
          })
        },
      },
    }
  )
}
