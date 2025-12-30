import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getStatusStatistics } from '@/lib/dal/analytics'

/**
 * GET /api/analytics/status-statistics
 *
 * 取得報價單狀態統計數據
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getSupabaseClient()
    const kv = getKVCache()

    const hasPermission = await checkPermission(kv, db, user.id, 'analytics:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await getStatusStatistics(db, user.id)

    return NextResponse.json({ data })
  } catch (error: unknown) {
    console.error('Failed to fetch status statistics:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
