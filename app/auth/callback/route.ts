import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/db/zeabur'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/en/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 獲取用戶資訊
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        try {
          // 檢查 user_profiles 是否存在
          const profileResult = await query(
            `SELECT user_id FROM user_profiles WHERE user_id = $1`,
            [user.id]
          )

          if (profileResult.rows.length === 0) {
            // 創建新的 user_profile
            await query(
              `INSERT INTO user_profiles (
                user_id,
                full_name,
                display_name,
                is_active,
                last_login_at,
                created_at,
                updated_at
              ) VALUES ($1, $2, $3, true, NOW(), NOW(), NOW())`,
              [
                user.id,
                user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                user.user_metadata?.name || user.email?.split('@')[0] || 'User'
              ]
            )
            console.log(`✅ Created user_profile for ${user.email}`)
          } else {
            // 更新 last_login_at
            await query(
              `UPDATE user_profiles SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = $1`,
              [user.id]
            )
            console.log(`✅ Updated last_login_at for ${user.email}`)
          }
        } catch (dbError) {
          console.error('❌ Error creating/updating user_profile:', dbError)
          // 即使創建 profile 失敗，仍然允許用戶登入
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
