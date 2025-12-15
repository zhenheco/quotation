/**
 * POS 日結帳詳情 API Routes
 * Account-system → quotation-system 整合
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getSettlementDetail, getSettlementWorkflow } from '@/lib/services/pos'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/pos/settlements/[id] - 取得日結帳詳情
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
    const hasPermission = await checkPermission(kv, db, user.id, 'pos:settlements:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 判斷是否要取得工作流程資訊
    const searchParams = request.nextUrl.searchParams
    const workflow = searchParams.get('workflow') === 'true'

    if (workflow) {
      const workflowData = await getSettlementWorkflow(db, id)
      return NextResponse.json(workflowData)
    }

    const settlement = await getSettlementDetail(db, id)

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    return NextResponse.json(settlement)
  } catch (error: unknown) {
    console.error('Error fetching settlement:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
