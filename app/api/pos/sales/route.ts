/**
 * POS 銷售交易 API Routes
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
  listSalesTransactions,
  createSale,
  getDailySummary,
} from '@/lib/services/pos'
import type { CreateSalesRequest } from '@/lib/services/pos/sales.service'
import type { SalesStatus } from '@/lib/dal/pos'

/**
 * GET /api/pos/sales - 取得銷售交易列表
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
    const hasPermission = await checkPermission(kv, db, user.id, 'pos:sales:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 解析查詢參數
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenant_id')
    const branchId = searchParams.get('branch_id')
    const memberId = searchParams.get('member_id')
    const status = searchParams.get('status') as SalesStatus | null
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '20')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }

    // 判斷是否要取得日統計
    const summary = searchParams.get('summary') === 'true'
    const summaryDate = searchParams.get('summary_date')
    if (summary && summaryDate) {
      const summaryData = await getDailySummary(db, tenantId, branchId, summaryDate)
      return NextResponse.json(summaryData)
    }

    const result = await listSalesTransactions(db, {
      tenantId,
      branchId: branchId || undefined,
      memberId: memberId || undefined,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      pageSize,
    })

    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'private, s-maxage=10, stale-while-revalidate=30')
    return response
  } catch (error: unknown) {
    console.error('Error fetching sales:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/pos/sales - 建立銷售交易（結帳）
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
    const hasPermission = await checkPermission(kv, db, user.id, 'pos:sales:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as CreateSalesRequest

    // 驗證必要欄位
    if (!body.tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }
    if (!body.branch_id) {
      return NextResponse.json({ error: 'branch_id is required' }, { status: 400 })
    }
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'items are required' }, { status: 400 })
    }
    if (!body.payments || body.payments.length === 0) {
      return NextResponse.json({ error: 'payments are required' }, { status: 400 })
    }

    // 設定建立者
    body.created_by = user.id

    const transaction = await createSale(db, body)

    return NextResponse.json(transaction, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating sale:', error)
    const message = getErrorMessage(error)
    if (message.includes('必須包含') || message.includes('不能超過') || message.includes('不符')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
