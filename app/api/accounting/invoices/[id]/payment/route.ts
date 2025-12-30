/**
 * 發票付款記錄 API Route
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { recordPayment } from '@/lib/services/accounting'

interface PaymentRequestBody {
  amount: number
  payment_date: string
  payment_method: string
  reference?: string
}

/**
 * POST /api/accounting/invoices/[id]/payment - 記錄付款
 */
export const POST = withAuth('invoices:write')<{ id: string }>(
  async (request, { user, db }, { id }) => {
    try {
      const body = await request.json() as PaymentRequestBody

      if (!body.amount || body.amount <= 0) {
        return NextResponse.json({ error: '付款金額必須大於 0' }, { status: 400 })
      }

      if (!body.payment_date) {
        return NextResponse.json({ error: '請填寫付款日期' }, { status: 400 })
      }

      if (!body.payment_method) {
        return NextResponse.json({ error: '請選擇付款方式' }, { status: 400 })
      }

      const result = await recordPayment(
        db,
        id,
        body.amount,
        body.payment_date,
        body.payment_method,
        body.reference || null,
        user.id
      )

      return NextResponse.json(result)
    } catch (error) {
      const message = getErrorMessage(error)
      if (message.includes('不存在')) {
        return NextResponse.json({ error: message }, { status: 404 })
      }
      if (message.includes('無法對') || message.includes('超過')) {
        return NextResponse.json({ error: message }, { status: 400 })
      }
      throw error
    }
  }
)
