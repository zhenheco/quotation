import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * ⚠️ 此 API 已廢棄 - 資料庫已遷移至 Supabase
 *
 * 原本用於診斷 D1 資料庫，現已不再需要
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    deprecated: true,
    message: 'This API is deprecated. Database has been migrated to Supabase.',
    info: 'Use Supabase Dashboard to inspect database structure and data.'
  })
}
