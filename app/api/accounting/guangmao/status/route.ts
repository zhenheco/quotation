/**
 * GET /api/accounting/guangmao/status
 * 查詢光貿整合狀態
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { verifyCompanyMembership } from '@/lib/dal/companies'

export const GET = withAuth('guangmao:read')(async (request, { user, db }) => {
  const companyId = request.nextUrl.searchParams.get('company_id')

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  // 多租戶隔離：驗證使用者屬於該公司
  const isMember = await verifyCompanyMembership(db, user.id, companyId)
  if (!isMember) {
    return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
  }

  const { data: settings } = await db
    .from('company_settings')
    .select('guangmao_enabled, guangmao_tax_id')
    .eq('company_id', companyId)
    .single()

  return NextResponse.json({
    enabled: settings?.guangmao_enabled ?? false,
    tax_id: settings?.guangmao_tax_id ?? null,
  })
})
