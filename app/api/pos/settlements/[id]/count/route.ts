/**
 * POS 日結帳點鈔 API Route
 * Account-system → quotation-system 整合
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { countSettlementCash } from '@/lib/services/pos'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/pos/settlements/[id]/count - 點鈔確認
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { env } = await getCloudflareContext()
  const { id } = await params

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache(env)
    const db = getSupabaseClient()

    // 檢查權限
    const hasPermission = await checkPermission(kv, db, user.id, 'pos:settlements:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as { actual_cash: number }
    if (body.actual_cash === undefined || body.actual_cash < 0) {
      return NextResponse.json({ error: 'actual_cash is required and must be >= 0' }, { status: 400 })
    }

    const result = await countSettlementCash(db, id, body.actual_cash)

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error counting cash:', error)
    const message = getErrorMessage(error)
    if (message.includes('不存在')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('只能') || message.includes('必須')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
