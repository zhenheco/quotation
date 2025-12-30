import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getRevenueTrend } from '@/lib/dal/analytics'

/**
 * GET /api/analytics/revenue-trend?months=6
 *
 * 取得營收趨勢數據（按月份統計）
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

    const searchParams = request.nextUrl.searchParams
    const months = parseInt(searchParams.get('months') || '6')

    const data = await getRevenueTrend(db, user.id, months)

    return NextResponse.json({ data })
  } catch (error: unknown) {
    console.error('Failed to fetch revenue trend:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
