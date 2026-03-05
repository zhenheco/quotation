/**
 * 營業稅申報期別 - 送出 API Route
 * POST /api/accounting/tax-declarations/:id/submit
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { submitTaxDeclaration } from '@/lib/dal/accounting'

export const POST = withAuth('tax-declarations:write')<{ id: string }>(
  async (_request, { db }, { id }) => {
    const declaration = await submitTaxDeclaration(db, id)
    return NextResponse.json({ success: true, data: declaration })
  }
)
