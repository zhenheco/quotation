/**
 * 會計發票 API Routes
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { verifyCompanyMembership } from '@/lib/dal/companies'
import {
  listInvoices,
  createNewInvoice,
  getInvoiceSummary,
} from '@/lib/services/accounting'
import type { CreateInvoiceInput, InvoiceType } from '@/lib/dal/accounting'

/**
 * GET /api/accounting/invoices - 取得發票列表
 */
export const GET = withAuth('invoices:read')(async (request, { user, db }) => {
  // 解析查詢參數
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get('company_id')
  const type = searchParams.get('type') as InvoiceType | null
  const status = searchParams.get('status') as 'DRAFT' | 'VERIFIED' | 'POSTED' | 'VOIDED' | null
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
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
})

/**
 * POST /api/accounting/invoices - 建立新發票
 */
export const POST = withAuth('invoices:write')(async (request, { user, db }) => {
  // 取得請求資料
  const body = await request.json() as CreateInvoiceInput

  // 驗證必要欄位
  if (!body.company_id) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  // 多租戶隔離：驗證使用者屬於該公司
  const isMember = await verifyCompanyMembership(db, user.id, body.company_id)
  if (!isMember) {
    return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
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

  // 資源一致性檢查：若有關聯訂單，驗證訂單屬於該公司
  if (body.order_id) {
    const { data: order } = await db
      .from('orders')
      .select('company_id')
      .eq('id', body.order_id)
      .single()

    if (order && order.company_id !== body.company_id) {
      return NextResponse.json({ error: '關聯訂單不屬於此公司' }, { status: 403 })
    }
  }

  const invoice = await createNewInvoice(db, body)
  return NextResponse.json(invoice, { status: 201 })
})
