import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getUserRoles, assignRoleToUser, getRoleByName } from '@/lib/dal/rbac'
import { validateUrlSafety } from '@/lib/security/url-validator'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 驗證 next 參數防止開放重定向攻擊
  const next = validateUrlSafety(searchParams.get('next'), '/zh/dashboard')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const user = data.session.user
      const isNewUser = user.created_at === user.last_sign_in_at

      console.log(`✅ User ${isNewUser ? 'registered' : 'logged in'}: ${user.email}`)

      try {
        const { env } = await getCloudflareContext()
        const db = getD1Client(env)

        const userRoles = await getUserRoles(db, user.id)

        if (userRoles.length === 0) {
          const superAdminRole = await getRoleByName(db, 'super_admin')
          if (superAdminRole) {
            await assignRoleToUser(db, user.id, superAdminRole.id)
            console.log(`✅ Assigned super_admin role to new user: ${user.email}`)
          }
        }
      } catch (roleError) {
        console.error('Failed to check/assign user roles:', roleError)
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const host = request.headers.get('host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      const getRedirectUrl = () => {
        if (isLocalEnv) {
          return `${origin}${next}`
        } else if (forwardedHost) {
          return `https://${forwardedHost}${next}`
        } else if (host) {
          return `https://${host}${next}`
        }
        return `${origin}${next}`
      }

      return NextResponse.redirect(getRedirectUrl())
    }

    if (error) {
      console.error('Auth error:', error.message)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
