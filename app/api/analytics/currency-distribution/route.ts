import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCurrencyDistribution } from '@/lib/dal/analytics'

export const runtime = 'edge'

/**
 * GET /api/analytics/currency-distribution
 *
 * 取得幣別分布數據
 */
export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getD1Client(env)
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'analytics:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await getCurrencyDistribution(db, user.id)

    return NextResponse.json({ data })
  } catch (error: unknown) {
    console.error('Failed to fetch currency distribution:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
