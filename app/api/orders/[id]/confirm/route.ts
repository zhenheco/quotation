import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getCompanyIdFromRequest } from '@/lib/utils/company-context'
import { confirmOrder, getOrderById } from '@/lib/dal/orders'

/**
 * POST /api/orders/[id]/confirm - 確認訂單
 *
 * 將訂單狀態從 draft 變更為 confirmed
 * 只有草稿狀態的訂單才能被確認
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

  // 確認訂單
  const order = await confirmOrder(db, companyId, id)

  return NextResponse.json(order)
})
