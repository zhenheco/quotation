import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getDashboardSummary } from '@/lib/dal/analytics'

/**
 * GET /api/analytics/dashboard-summary
 *
 * 取得儀表板統計摘要
 * 包含本月營收、成長率、轉換率等關鍵指標
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

    const data = await getDashboardSummary(db, user.id)

    const response = NextResponse.json({ data })

    // 分析資料快取 2 分鐘
    response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=300')

    return response
  } catch (error: unknown) {
    console.error('Failed to fetch dashboard summary:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
