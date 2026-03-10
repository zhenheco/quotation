/**
 * 會計傳票 API Routes
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { verifyCompanyMembership } from '@/lib/dal/companies'
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
export const GET = withAuth('journals:read')(async (request, { user, db }) => {
  // 解析查詢參數
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get('company_id')
  const status = searchParams.get('status') as JournalStatus | null
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const sourceType = searchParams.get('source_type') as TransactionSource | null
  // 安全：限制分頁參數避免 DoS
  const MAX_PAGE_SIZE = 100
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('page_size') || '20') || 20))

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  // 多租戶隔離：驗證使用者屬於該公司
  const isMember = await verifyCompanyMembership(db, user.id, companyId)
  if (!isMember) {
    return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
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
})

/**
 * POST /api/accounting/journals - 建立新傳票
 */
export const POST = withAuth('journals:write')(async (request, { user, db }) => {
  try {
    const body = await request.json() as CreateJournalRequest

    // 驗證必要欄位
    if (!body.company_id) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    // 多租戶隔離：驗證使用者屬於該公司
    const isMember = await verifyCompanyMembership(db, user.id, body.company_id)
    if (!isMember) {
      return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
    }

    if (!body.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }
    if (!body.transactions || body.transactions.length === 0) {
      return NextResponse.json({ error: 'transactions are required' }, { status: 400 })
    }

    // 資源一致性檢查：若有關聯發票，驗證發票屬於該公司
    if (body.source_id && body.source_type === 'INVOICE') {
      const { data: invoice } = await db
        .from('acc_invoices')
        .select('company_id')
        .eq('id', body.source_id)
        .single()

      if (invoice && invoice.company_id !== body.company_id) {
        return NextResponse.json({ error: '關聯發票不屬於此公司' }, { status: 403 })
      }
    }

    // 驗證所有分錄的會計科目是否屬於該公司或系統預設
    const accountIds = [...new Set(body.transactions.map(t => t.account_id))]
    const { data: accounts } = await db
      .from('accounts')
      .select('id, company_id')
      .in('id', accountIds)

    if (accounts) {
      const invalidAccount = accounts.find(a => a.company_id !== null && a.company_id !== body.company_id)
      if (invalidAccount) {
        return NextResponse.json({ error: '部分會計科目不屬於此公司' }, { status: 403 })
      }
    }

    const journal = await createNewJournal(db, {
      company_id: body.company_id,
      date: body.date,
      description: body.description,
      source_type: body.source_type || 'MANUAL',
      transactions: body.transactions,
    })

    return NextResponse.json(journal, { status: 201 })
  } catch (error) {
    const message = getErrorMessage(error)
    if (message.includes('借貸') || message.includes('必須包含')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    throw error
  }
})
