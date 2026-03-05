/**
 * 營業稅申報期別 - 單一期別 API Routes
 * GET /api/accounting/tax-declarations/:id — 取得單一期別
 * PUT /api/accounting/tax-declarations/:id — 更新期別（僅 draft）
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import {
  getTaxDeclaration,
  updateTaxDeclaration,
} from '@/lib/dal/accounting'
import type { UpdateTaxDeclarationInput } from '@/lib/dal/accounting/tax-declarations.dal'

/**
 * GET /api/accounting/tax-declarations/:id
 */
export const GET = withAuth('tax-declarations:read')<{ id: string }>(
  async (_request, { db }, { id }) => {
    const declaration = await getTaxDeclaration(db, id)

    if (!declaration) {
      return NextResponse.json({ error: '申報期別不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: declaration })
  }
)

/**
 * PUT /api/accounting/tax-declarations/:id
 *
 * Body: UpdateTaxDeclarationInput fields
 */
export const PUT = withAuth('tax-declarations:write')<{ id: string }>(
  async (request, { db }, { id }) => {
    const body = (await request.json()) as UpdateTaxDeclarationInput

    const declaration = await updateTaxDeclaration(db, id, body)

    return NextResponse.json({ success: true, data: declaration })
  }
)
