import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 環境變數預處理（防止隱藏空白字符導致的 API 錯誤）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export async function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const cookieStore = await cookies()

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                sameSite: 'lax',
                secure: true,
                // Supabase Auth 需要客戶端 JavaScript 能讀取 session token
                // 資料安全由 Supabase RLS 政策保護，與 middleware.ts 保持一致
                httpOnly: false,
                path: '/',
              })
            })
          } catch (e) {
            // Server Component 中調用 setAll 時可能失敗
            // 此時依賴 middleware 處理 session 刷新
            // 但在 Route Handler（如 OAuth callback）中，這個錯誤是關鍵的！
            console.warn('[Supabase Server] Cookie setAll failed:', e)
          }
        },
      },
    }
  )
}
