/**
 * Supabase 資料庫客戶端
 *
 * 提供統一的 Supabase 客戶端存取方式：
 * - createSupabaseClient(): 建立新的客戶端實例
 * - getSupabaseClient(): 取得使用 Service Role Key 的客戶端（用於伺服器端）
 */

import { createClient, SupabaseClient as SupabaseClientType } from '@supabase/supabase-js'

export type SupabaseClient = SupabaseClientType

/**
 * 建立 Supabase 客戶端
 *
 * @param useServiceRole - 是否使用 Service Role Key（繞過 RLS）
 * @returns Supabase 客戶端實例
 */
export function createSupabaseClient(useServiceRole = false): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!key) {
    throw new Error(
      useServiceRole
        ? 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable'
        : 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable'
    )
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

/**
 * 取得伺服器端 Supabase 客戶端
 *
 * 使用 Service Role Key，繞過 RLS 政策
 * 僅用於伺服器端 API 路由
 */
export function getSupabaseClient(): SupabaseClient {
  return createSupabaseClient(true)
}

/**
 * 取得使用者端 Supabase 客戶端
 *
 * 使用 Anon Key，遵循 RLS 政策
 */
export function getAnonSupabaseClient(): SupabaseClient {
  return createSupabaseClient(false)
}
