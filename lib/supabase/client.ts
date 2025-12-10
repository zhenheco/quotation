import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase 客戶端（瀏覽器端）
 *
 * 注意：NEXT_PUBLIC_* 環境變數會在 build 時嵌入到前端代碼中
 * Anon key 是設計為公開的，資料安全由 Supabase RLS 政策保護
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
