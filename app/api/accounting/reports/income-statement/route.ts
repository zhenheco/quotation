/**
 * 損益表 API Route
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { verifyCompanyMembership } from '@/lib/dal/companies'
import { generateIncomeStatement } from '@/lib/services/accounting'

/**
 * GET /api/accounting/reports/income-statement - 取得損益表
 */
export const GET = withAuth('reports:read')(async (request, { user, db }) => {
  // 解析查詢參數
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get('company_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  // 多租戶隔離：驗證使用者屬於該公司
  const isMember = await verifyCompanyMembership(db, user.id, companyId)
  if (!isMember) {
    return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
  }

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
  }

  const result = await generateIncomeStatement(db, companyId, startDate, endDate)

  const response = NextResponse.json(result)
  response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
  return response
})
