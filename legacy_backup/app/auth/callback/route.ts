import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/en/login'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 獲取用戶資訊
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // 用戶資訊已由 Supabase Auth 管理，不需要額外的資料庫操作
        console.log(`✅ User logged in: ${user.email}`)
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const host = request.headers.get('host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else if (host) {
        return NextResponse.redirect(`https://${host}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
