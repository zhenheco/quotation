import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCompanyIdFromRequest } from '@/lib/utils/company-context'
import { getShipmentStats } from '@/lib/dal/shipments'

/**
 * GET /api/shipments/stats - 取得出貨單統計
 */
export const GET = withAuth('shipments:read')(async (request, { db }) => {
  // 取得公司 ID
  const companyId = getCompanyIdFromRequest(request)
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  // 取得統計
  const stats = await getShipmentStats(db, companyId)

  // 設定快取
  const response = NextResponse.json(stats)
  response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
  return response
})
