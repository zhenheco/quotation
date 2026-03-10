/**
 * 營業稅申報期別 - 單一期別 API Routes
 * GET /api/accounting/tax-declarations/:id — 取得單一期別
 * PUT /api/accounting/tax-declarations/:id — 更新期別（僅 draft）
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { verifyCompanyMembership } from '@/lib/dal/companies'
import {
  getTaxDeclaration,
  updateTaxDeclaration,
} from '@/lib/dal/accounting'
import type { UpdateTaxDeclarationInput } from '@/lib/dal/accounting/tax-declarations.dal'

/**
 * GET /api/accounting/tax-declarations/:id
 */
export const GET = withAuth('tax-declarations:read')<{ id: string }>(
  async (_request, { user, db }, { id }) => {
    const declaration = await getTaxDeclaration(db, id)

    if (!declaration) {
      return NextResponse.json({ error: '申報期別不存在' }, { status: 404 })
    }

    // 多租戶隔離：驗證使用者屬於該公司
    const isMember = await verifyCompanyMembership(db, user.id, declaration.company_id)
    if (!isMember) {
      return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: declaration })
  }
)

/**
 * PUT /api/accounting/tax-declarations/:id
 */
export const PUT = withAuth('tax-declarations:write')<{ id: string }>(
  async (request, { user, db }, { id }) => {
    const declaration = await getTaxDeclaration(db, id)
    if (!declaration) {
      return NextResponse.json({ error: '申報期別不存在' }, { status: 404 })
    }

    // 多租戶隔離：驗證使用者屬於該公司
    const isMember = await verifyCompanyMembership(db, user.id, declaration.company_id)
    if (!isMember) {
      return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
    }

    const body = (await request.json()) as UpdateTaxDeclarationInput
    const updated = await updateTaxDeclaration(db, id, body)

    return NextResponse.json({ success: true, data: updated })
  }
)
