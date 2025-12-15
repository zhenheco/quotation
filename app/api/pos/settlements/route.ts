/**
 * POS 日結帳 API Routes
 * Account-system → quotation-system 整合
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  listSettlements,
  getSettlementForDate,
  startSettlement,
  getMonthlyReport,
} from '@/lib/services/pos'
import type { SettlementStatus } from '@/lib/dal/pos'

/**
 * GET /api/pos/settlements - 取得日結帳列表
 */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext()

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

    // 解析查詢參數
    const searchParams = request.nextUrl.searchParams
    const branchId = searchParams.get('branch_id')
    const status = searchParams.get('status') as SettlementStatus | null
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '20')

    if (!branchId) {
      return NextResponse.json({ error: 'branch_id is required' }, { status: 400 })
    }

    // 判斷是否要取得月報
    const monthly = searchParams.get('monthly') === 'true'
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    if (monthly && year && month) {
      const report = await getMonthlyReport(db, branchId, parseInt(year), parseInt(month))
      return NextResponse.json(report)
    }

    // 判斷是否要取得特定日期
    const date = searchParams.get('date')
    if (date) {
      const settlement = await getSettlementForDate(db, branchId, date)
      return NextResponse.json(settlement)
    }

    const result = await listSettlements(db, {
      branchId,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      pageSize,
    })

    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
    return response
  } catch (error: unknown) {
    console.error('Error fetching settlements:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/pos/settlements - 開始日結帳
 */
export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext()

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

    const body = await request.json() as { branch_id: string; date: string }

    // 驗證必要欄位
    if (!body.branch_id) {
      return NextResponse.json({ error: 'branch_id is required' }, { status: 400 })
    }
    if (!body.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const settlement = await startSettlement(db, body.branch_id, body.date, user.id)

    return NextResponse.json(settlement, { status: 201 })
  } catch (error: unknown) {
    console.error('Error starting settlement:', error)
    const message = getErrorMessage(error)
    if (message.includes('已存在') || message.includes('無法結帳')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
