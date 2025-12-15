/**
 * POS 會員儲值 API Route
 * Account-system → quotation-system 整合
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { depositToMember, depositToMemberRpc } from '@/lib/dal/pos'
import type { PaymentMethodType } from '@/lib/dal/pos'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface DepositInput {
  amount: number
  bonus_amount?: number
  payment_method: PaymentMethodType
  promotion_id?: string
  reference?: string
  use_rpc?: boolean
}

/**
 * POST /api/pos/members/[id]/deposit - 會員儲值
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
    const hasPermission = await checkPermission(kv, db, user.id, 'pos:members:deposit')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as DepositInput

    // 驗證必要欄位
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 })
    }
    if (!body.payment_method) {
      return NextResponse.json({ error: 'payment_method is required' }, { status: 400 })
    }

    const bonusAmount = body.bonus_amount || 0
    const useRpc = body.use_rpc !== false // 預設使用 RPC

    let result
    if (useRpc) {
      result = await depositToMemberRpc(
        db,
        id,
        body.amount,
        bonusAmount,
        body.payment_method,
        body.reference || null,
        user.id
      )
    } else {
      result = await depositToMember(
        db,
        id,
        body.amount,
        bonusAmount,
        body.payment_method,
        body.promotion_id,
        user.id
      )
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    console.error('Error processing deposit:', error)
    const message = getErrorMessage(error)
    if (message.includes('不存在')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
