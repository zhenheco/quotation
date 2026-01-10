import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCompanyIdFromRequest } from '@/lib/utils/company-context'
import { cancelOrder, getOrderById } from '@/lib/dal/orders'

/**
 * POST /api/orders/[id]/cancel - 取消訂單
 *
 * 將訂單狀態變更為 cancelled
 * 已完成或已取消的訂單無法再被取消
 */
export const POST = withAuth('orders:write')<{ id: string }>(async (request, { db }, { id }) => {
  // 取得公司 ID
  const companyId = getCompanyIdFromRequest(request)
  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  // 檢查訂單是否存在
  const existingOrder = await getOrderById(db, companyId, id)
  if (!existingOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // 取消訂單
  const order = await cancelOrder(db, companyId, id)

  return NextResponse.json(order)
})
