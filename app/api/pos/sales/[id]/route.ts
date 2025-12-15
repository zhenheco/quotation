/**
 * POS 銷售交易詳情 API Routes
 * Account-system → quotation-system 整合
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getSalesDetail } from '@/lib/services/pos'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/pos/sales/[id] - 取得銷售交易詳情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const hasPermission = await checkPermission(kv, db, user.id, 'pos:sales:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const transaction = await getSalesDetail(db, id)

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json(transaction)
  } catch (error: unknown) {
    console.error('Error fetching sale:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
