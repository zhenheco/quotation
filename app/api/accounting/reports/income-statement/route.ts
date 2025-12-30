/**
 * 損益表 API Route
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { generateIncomeStatement } from '@/lib/services/accounting'

/**
 * GET /api/accounting/reports/income-statement - 取得損益表
 */
export const GET = withAuth('reports:read')(async (request, { db }) => {
  // 解析查詢參數
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get('company_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }
  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
  }

  const result = await generateIncomeStatement(db, companyId, startDate, endDate)

  const response = NextResponse.json(result)
  response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
  return response
})
