/**
 * 發票付款記錄 API Route
 * Account-system → quotation-system 整合
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { recordPayment } from '@/lib/services/accounting'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface PaymentInput {
  amount: number
  payment_date: string
  payment_method: string
  reference?: string
}

/**
 * POST /api/accounting/invoices/[id]/payment - 記錄付款
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
    const hasPermission = await checkPermission(kv, db, user.id, 'invoices:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as PaymentInput

    // 驗證必要欄位
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 })
    }
    if (!body.payment_date) {
      return NextResponse.json({ error: 'payment_date is required' }, { status: 400 })
    }
    if (!body.payment_method) {
      return NextResponse.json({ error: 'payment_method is required' }, { status: 400 })
    }

    const result = await recordPayment(
      db,
      id,
      body.amount,
      body.payment_date,
      body.payment_method,
      body.reference || null,
      user.id
    )

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error recording payment:', error)
    const message = getErrorMessage(error)
    if (message.includes('不存在')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('無法對') || message.includes('必須大於') || message.includes('超過')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
