import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCompanyIdFromRequest } from '@/lib/utils/company-context'
import { createInvoiceFromShipment, getShipmentById } from '@/lib/dal/shipments'

/**
 * 建立發票請求類型
 */
interface CreateInvoiceBody {
  invoice_date?: string
  due_date?: string
}

/**
 * POST /api/shipments/[id]/invoice - 從出貨單建立發票
 *
 * 將已出貨或已送達的出貨單轉換為銷項發票
 */
export const POST = withAuth('invoices:write')<{ id: string }>(async (request, { db }, { id }) => {
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

  // 檢查出貨單狀態
  if (existingShipment.status !== 'in_transit' && existingShipment.status !== 'delivered') {
    return NextResponse.json(
      { error: `Only shipped or delivered shipments can generate invoices. Current status: ${existingShipment.status}` },
      { status: 400 }
    )
  }

  // 取得請求資料
  const body = await request.json() as CreateInvoiceBody

  // 建立發票
  const invoiceId = await createInvoiceFromShipment(db, id, body.invoice_date, body.due_date)

  return NextResponse.json({ invoice_id: invoiceId }, { status: 201 })
})
