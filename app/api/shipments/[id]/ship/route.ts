import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCompanyIdFromRequest } from '@/lib/utils/company-context'
import { shipShipment, getShipmentById } from '@/lib/dal/shipments'

/**
 * 出貨請求類型
 */
interface ShipRequestBody {
  shipped_date?: string
  carrier?: string
  tracking_number?: string
}

/**
 * POST /api/shipments/[id]/ship - 標記出貨
 *
 * 將出貨單狀態從 pending 變更為 in_transit
 * 只有待處理狀態的出貨單才能被標記為已出貨
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

  // 取得請求資料
  const body = await request.json() as ShipRequestBody

  // 標記出貨
  const shipment = await shipShipment(
    db,
    companyId,
    id,
    body.shipped_date,
    body.carrier,
    body.tracking_number
  )

  return NextResponse.json(shipment)
})
