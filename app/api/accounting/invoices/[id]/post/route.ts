/**
 * 發票過帳 API Route
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { postInvoiceById } from '@/lib/services/accounting'

/**
 * POST /api/accounting/invoices/[id]/post - 過帳發票（產生傳票）
 */
export const POST = withAuth('invoices:post')<{ id: string }>(
  async (request, { user, db }, { id }) => {
    try {
      const result = await postInvoiceById(db, id, user.id)
      return NextResponse.json(result)
    } catch (error) {
      const message = getErrorMessage(error)
      if (message.includes('不存在')) {
        return NextResponse.json({ error: message }, { status: 404 })
      }
      if (message.includes('只能過帳')) {
        return NextResponse.json({ error: message }, { status: 400 })
      }
      throw error
    }
  }
)
