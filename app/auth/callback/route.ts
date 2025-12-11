import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getUserRoles, assignRoleToUser, getRoleByName } from '@/lib/dal/rbac'
import { validateUrlSafety } from '@/lib/security/url-validator'
import { getKVCache } from '@/lib/cache/kv-cache'
import { warmUserCache } from '@/lib/cache/warm-cache'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectParam = searchParams.get('redirect')
  // 驗證 next 參數防止開放重定向攻擊
  const next = validateUrlSafety(searchParams.get('next'), '/zh/dashboard')

  // Supabase Email 認證類型（signup, recovery, invite, magiclink）
  const type = searchParams.get('type')

  // 處理密碼重設流程 - 直接重導向到 reset-password 頁面
  // Supabase 會自動建立 session
  if (type === 'recovery') {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const host = request.headers.get('host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    const getBaseUrl = () => {
      if (isLocalEnv) return origin
      if (forwardedHost) return `https://${forwardedHost}`
      if (host) return `https://${host}`
      return origin
    }

    console.log('🔐 Password recovery flow detected')
    return NextResponse.redirect(`${getBaseUrl()}/zh/reset-password`)
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const user = data.session.user
      const isNewUser = user.created_at === user.last_sign_in_at

      console.log(`✅ User ${isNewUser ? 'registered' : 'logged in'}: ${user.email}`)

      // 同步 user_profiles
      try {
        const db = getSupabaseClient()
        await db
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
        console.log(`✅ Synced user profile for: ${user.email}`)
      } catch (profileError) {
        console.error('Failed to sync user profile:', profileError)
      }

      try {
        const db = getSupabaseClient()

        const userRoles = await getUserRoles(db, user.id)

        if (userRoles.length === 0) {
          const superAdminRole = await getRoleByName(db, 'super_admin')
          if (superAdminRole) {
            await assignRoleToUser(db, user.id, superAdminRole.id)
            console.log(`✅ Assigned super_admin role to new user: ${user.email}`)
          }
        }

        // 預熱用戶權限快取，加速首屏載入
        try {
          const { env } = await getCloudflareContext()
          const kv = getKVCache(env)
          await warmUserCache(kv, db, user.id)
          console.log(`✅ Warmed cache for user: ${user.email}`)
        } catch (cacheError) {
          // 快取預熱失敗不影響登入流程
          console.warn('Cache warming failed:', cacheError)
        }
      } catch (roleError) {
        console.error('Failed to check/assign user roles:', roleError)
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const host = request.headers.get('host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      const getBaseUrl = () => {
        if (isLocalEnv) {
          return origin
        } else if (forwardedHost) {
          return `https://${forwardedHost}`
        } else if (host) {
          return `https://${host}`
        }
        return origin
      }

      const baseUrl = getBaseUrl()

      // 1. 優先處理邀請連結重導向
      if (redirectParam?.startsWith('/invite/')) {
        console.log(`🔗 Redirecting to invite page: ${redirectParam}`)
        return NextResponse.redirect(`${baseUrl}/zh${redirectParam}`)
      }

      // 2. 檢查用戶是否有公司
      try {
        const db = getSupabaseClient()
        const { data: membership } = await db
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        if (!membership) {
          // 無公司，導向 onboarding
          console.log(`🆕 New user without company, redirecting to onboarding: ${user.email}`)
          return NextResponse.redirect(`${baseUrl}/zh/onboarding`)
        }
      } catch {
        // 查詢失敗（可能是無記錄），導向 onboarding
        console.log(`🆕 User has no company membership, redirecting to onboarding: ${user.email}`)
        return NextResponse.redirect(`${baseUrl}/zh/onboarding`)
      }

      // 3. 有公司，正常導向 dashboard
      return NextResponse.redirect(`${baseUrl}${next}`)
    }

    if (error) {
      console.error('Auth error:', error.message)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
