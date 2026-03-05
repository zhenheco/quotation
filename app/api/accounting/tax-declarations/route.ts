/**
 * 營業稅申報期別 API Routes
 * GET  /api/accounting/tax-declarations — 列表查詢
 * POST /api/accounting/tax-declarations — 建立或取得期別
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import {
  listTaxDeclarations,
  getOrCreateTaxDeclaration,
  validateDeclarationContinuity,
} from '@/lib/dal/accounting'
import type { TaxDeclarationStatus } from '@/types/models'

/**
 * GET /api/accounting/tax-declarations
 *
 * Query params:
 * - company_id (required)
 * - year (optional)
 * - status (optional): draft | submitted | closed
 * - limit (optional, default 20)
 * - offset (optional, default 0)
 */
export const GET = withAuth('tax-declarations:read')(async (request, { db }) => {
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get('company_id')

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined
  const status = searchParams.get('status') as TaxDeclarationStatus | null

  const MAX_PAGE_SIZE = 100
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)

  const data = await listTaxDeclarations(db, companyId, {
    year,
    status: status || undefined,
    limit,
    offset,
  })

  return NextResponse.json({ success: true, data })
})

/**
 * POST /api/accounting/tax-declarations
 *
 * Body:
 * - company_id (required)
 * - year (required)
 * - bi_month (required): 1-6
 * - opening_offset (optional, default 0)
 */
export const POST = withAuth('tax-declarations:write')(async (request, { db }) => {
  const body = (await request.json()) as {
    company_id?: string
    year?: number
    bi_month?: number
    opening_offset?: number
  }

  const { company_id: companyId, year, bi_month: biMonth, opening_offset: openingOffset } = body

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }
  if (!year || !biMonth) {
    return NextResponse.json({ error: 'year and bi_month are required' }, { status: 400 })
  }
  if (biMonth < 1 || biMonth > 6) {
    return NextResponse.json({ error: 'bi_month must be between 1 and 6' }, { status: 400 })
  }

  // 留抵連續性校驗
  if (openingOffset !== undefined && openingOffset > 0) {
    const continuity = await validateDeclarationContinuity(
      db, companyId, year, biMonth, openingOffset
    )
    if (!continuity.valid) {
      return NextResponse.json(
        { error: continuity.message, expected_amount: continuity.expectedAmount },
        { status: 422 }
      )
    }
  }

  const declaration = await getOrCreateTaxDeclaration(
    db, companyId, year, biMonth, openingOffset
  )

  return NextResponse.json({ success: true, data: declaration }, { status: 201 })
})
