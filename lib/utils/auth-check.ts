/**
 * Auth Check Utility
 *
 * 提供統一的身份驗證檢查函數
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function checkAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return user
}

export async function requireAuth() {
  const user = await checkAuth()

  if (!user) {
    redirect('/login')
  }

  return user
}
