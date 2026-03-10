/**
 * 資產負債表 API Route
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { verifyCompanyMembership } from '@/lib/dal/companies'
import { generateBalanceSheet } from '@/lib/services/accounting'

/**
 * GET /api/accounting/reports/balance-sheet - 取得資產負債表
 */
export const GET = withAuth('reports:read')(async (request, { user, db }) => {
  // 解析查詢參數
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get('company_id')
  const asOfDate = searchParams.get('as_of_date')

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  // 多租戶隔離：驗證使用者屬於該公司
  const isMember = await verifyCompanyMembership(db, user.id, companyId)
  if (!isMember) {
    return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
  }

  if (!asOfDate) {
    return NextResponse.json({ error: 'as_of_date is required' }, { status: 400 })
  }

  const result = await generateBalanceSheet(db, companyId, asOfDate)

  const response = NextResponse.json(result)
  response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
  return response
})
