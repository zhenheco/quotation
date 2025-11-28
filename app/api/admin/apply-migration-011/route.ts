import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * ⚠️ 此 API 已廢棄 - 資料庫已遷移至 Supabase
 *
 * 原本用於執行 D1 migration 011，現已不再需要
 * Supabase migrations 應使用 Supabase CLI 或 Dashboard 管理
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    deprecated: true,
    message: 'This API is deprecated. Database has been migrated to Supabase.',
    info: 'Use Supabase CLI or Dashboard to manage database migrations.',
    example: 'supabase migration new migration_name'
  })
}
