/**
 * 會計傳票 API Routes
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
  listJournalEntries,
  createNewJournal,
} from '@/lib/services/accounting'
import type { JournalStatus, TransactionSource } from '@/lib/dal/accounting'

interface CreateJournalRequest {
  company_id: string
  date: string
  description?: string
  source_type?: TransactionSource
  source_id?: string
  transactions: Array<{
    account_id: string
    description?: string
    debit: number
    credit: number
    tax_code_id?: string
    counterparty_id?: string
  }>
}

/**
 * GET /api/accounting/journals - 取得傳票列表
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
    const hasPermission = await checkPermission(kv, db, user.id, 'journals:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 解析查詢參數
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')
    const status = searchParams.get('status') as JournalStatus | null
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const sourceType = searchParams.get('source_type') as TransactionSource | null
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '20')

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    const result = await listJournalEntries(db, {
      companyId,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sourceType: sourceType || undefined,
      page,
      pageSize,
    })

    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
    return response
  } catch (error: unknown) {
    console.error('Error fetching journals:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/accounting/journals - 建立新傳票
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
    const hasPermission = await checkPermission(kv, db, user.id, 'journals:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as CreateJournalRequest

    // 驗證必要欄位
    if (!body.company_id) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }
    if (!body.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }
    if (!body.transactions || body.transactions.length === 0) {
      return NextResponse.json({ error: 'transactions are required' }, { status: 400 })
    }

    const journal = await createNewJournal(db, {
      company_id: body.company_id,
      date: body.date,
      description: body.description,
      source_type: body.source_type || 'MANUAL',
      transactions: body.transactions,
    })

    return NextResponse.json(journal, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating journal:', error)
    const message = getErrorMessage(error)
    if (message.includes('借貸') || message.includes('必須包含')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
