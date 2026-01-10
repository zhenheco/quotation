import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCompanyIdFromRequest } from '@/lib/utils/company-context'
import { cancelShipment, getShipmentById } from '@/lib/dal/shipments'

/**
 * POST /api/shipments/[id]/cancel - 取消出貨單
 *
 * 將出貨單狀態變更為 cancelled
 * 已送達或已取消的出貨單無法再被取消
 */
export const POST = withAuth('shipments:write')<{ id: string }>(async (request, { db }, { id }) => {
  // 取得公司 ID
  const companyId = getCompanyIdFromRequest(request)
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  // 檢查出貨單是否存在
  const existingShipment = await getShipmentById(db, companyId, id)
  if (!existingShipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
  }

  // 取消出貨單
  const shipment = await cancelShipment(db, companyId, id)

  return NextResponse.json(shipment)
})
