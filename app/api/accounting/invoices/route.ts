/**
 * 會計發票 API Routes
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
  listInvoices,
  createNewInvoice,
  getInvoiceSummary,
} from '@/lib/services/accounting'
import type { CreateInvoiceInput, InvoiceType } from '@/lib/dal/accounting'

/**
 * GET /api/accounting/invoices - 取得發票列表
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
    const hasPermission = await checkPermission(kv, db, user.id, 'invoices:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 解析查詢參數
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')
    const type = searchParams.get('type') as InvoiceType | null
    const status = searchParams.get('status') as 'DRAFT' | 'VERIFIED' | 'POSTED' | 'VOIDED' | null
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '20')

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    // 判斷是否要取得統計摘要
    const summary = searchParams.get('summary') === 'true'
    if (summary && startDate && endDate) {
      const summaryData = await getInvoiceSummary(db, companyId, startDate, endDate)
      return NextResponse.json(summaryData)
    }

    // 取得發票列表
    const result = await listInvoices(db, {
      companyId,
      type: type || undefined,
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
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/accounting/invoices - 建立新發票
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
    const hasPermission = await checkPermission(kv, db, user.id, 'invoices:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得請求資料
    const body = await request.json() as CreateInvoiceInput

    // 驗證必要欄位
    if (!body.company_id) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }
    if (!body.number) {
      return NextResponse.json({ error: 'number is required' }, { status: 400 })
    }
    if (!body.type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 })
    }
    if (!body.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const invoice = await createNewInvoice(db, body)
    return NextResponse.json(invoice, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
