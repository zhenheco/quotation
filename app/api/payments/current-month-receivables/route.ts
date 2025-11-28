import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCurrentMonthReceivables } from '@/lib/dal/payments'

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

    const db = getSupabaseClient()
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'payments:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || undefined

    const data = await getCurrentMonthReceivables(db, user.id, month)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Current month receivables error:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
