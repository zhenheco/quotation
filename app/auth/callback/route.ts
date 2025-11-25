import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getUserRoles, assignRoleToUser, getRoleByName } from '@/lib/dal/rbac'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/en/login'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        console.log(`✅ User logged in: ${user.email}`)

        try {
          const { env } = await getCloudflareContext()
          const db = getD1Client(env)

          const userRoles = await getUserRoles(db, user.id)

          if (userRoles.length === 0) {
            const superAdminRole = await getRoleByName(db, 'super_admin')
            if (superAdminRole) {
              await assignRoleToUser(db, user.id, superAdminRole.id)
              console.log(`✅ Assigned super_admin role to user: ${user.email}`)
            }
          }
        } catch (roleError) {
          console.error('Failed to check/assign user roles:', roleError)
        }
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
