/**
 * 營業稅申報 API Route
 * 處理 401/403 申報書產生與匯出
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import {
  generateForm401,
  generateForm403,
  generateForm401Xml,
  generateForm403Xml,
  getInvoiceDetailList,
} from '@/lib/services/accounting'

/**
 * GET /api/accounting/reports/tax - 產生營業稅申報資料
 *
 * Query params:
 * - company_id: 公司 ID (必填)
 * - tax_id: 公司統編 (必填)
 * - company_name: 公司名稱 (必填)
 * - year: 年度 (必填)
 * - bi_month: 雙月期 1-6 (必填)
 * - form: 401 | 403 (預設 401)
 * - format: json | xml (預設 json)
 */
export const GET = withAuth('reports:read')(async (request, { db }) => {
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get('company_id')
  const taxId = searchParams.get('tax_id')
  const companyName = searchParams.get('company_name')
  const yearStr = searchParams.get('year')
  const biMonthStr = searchParams.get('bi_month')
  const form = searchParams.get('form') || '401'
  const format = searchParams.get('format') || 'json'

  // 驗證必填參數
  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }
  if (!taxId) {
    return NextResponse.json({ error: 'tax_id is required' }, { status: 400 })
  }
  if (!companyName) {
    return NextResponse.json({ error: 'company_name is required' }, { status: 400 })
  }
  if (!yearStr || !biMonthStr) {
    return NextResponse.json({ error: 'year and bi_month are required' }, { status: 400 })
  }

  const year = parseInt(yearStr, 10)
  const biMonth = parseInt(biMonthStr, 10)

  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  }
  if (isNaN(biMonth) || biMonth < 1 || biMonth > 6) {
    return NextResponse.json({ error: 'bi_month must be between 1 and 6' }, { status: 400 })
  }

  if (form === '401') {
    const data = await generateForm401(db, companyId, taxId, companyName, year, biMonth)

    if (format === 'xml') {
      const xml = generateForm401Xml(data)
      return new NextResponse(xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="VAT401_${year}_${biMonth}.xml"`,
        },
      })
    }

    return NextResponse.json({ success: true, data })
  } else if (form === '403') {
    const data = await generateForm403(db, companyId, taxId, companyName, year, biMonth)

    if (format === 'xml') {
      const xml = generateForm403Xml(data)
      return new NextResponse(xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="VAT403_${year}_${biMonth}.xml"`,
        },
      })
    }

    return NextResponse.json({ success: true, data })
  } else {
    return NextResponse.json({ error: 'form must be 401 or 403' }, { status: 400 })
  }
})

/**
 * POST /api/accounting/reports/tax/invoices - 取得發票明細表
 *
 * Body:
 * - company_id: 公司 ID
 * - type: OUTPUT | INPUT
 * - start_date: 開始日期
 * - end_date: 結束日期
 */
export const POST = withAuth('reports:read')(async (request, { db }) => {
  const body = (await request.json()) as {
    company_id?: string
    type?: string
    start_date?: string
    end_date?: string
  }

  const { company_id: companyId, type, start_date: startDate, end_date: endDate } = body

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }
  if (!type || (type !== 'OUTPUT' && type !== 'INPUT')) {
    return NextResponse.json({ error: 'type must be OUTPUT or INPUT' }, { status: 400 })
  }
  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
  }

  const result = await getInvoiceDetailList(db, companyId, type, startDate, endDate)

  return NextResponse.json({ success: true, data: result })
})
