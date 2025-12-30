/**
 * 資產負債表 API Route
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { generateBalanceSheet } from '@/lib/services/accounting'

/**
 * GET /api/accounting/reports/balance-sheet - 取得資產負債表
 */
export const GET = withAuth('reports:read')(async (request, { db }) => {
  // 解析查詢參數
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get('company_id')
  const asOfDate = searchParams.get('as_of_date')

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }
  if (!asOfDate) {
    return NextResponse.json({ error: 'as_of_date is required' }, { status: 400 })
  }

  const result = await generateBalanceSheet(db, companyId, asOfDate)

  const response = NextResponse.json(result)
  response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
  return response
})
