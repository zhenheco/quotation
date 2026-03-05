/**
 * 營業稅申報期別 - 重新開啟 API Route
 * POST /api/accounting/tax-declarations/:id/reopen
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { reopenTaxDeclaration } from '@/lib/dal/accounting'

export const POST = withAuth('tax-declarations:write')<{ id: string }>(
  async (_request, { db }, { id }) => {
    const declaration = await reopenTaxDeclaration(db, id)
    return NextResponse.json({ success: true, data: declaration })
  }
)
