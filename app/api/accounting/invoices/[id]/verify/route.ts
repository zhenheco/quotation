/**
 * 發票審核 API Route
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { verifyInvoiceById } from '@/lib/services/accounting'

/**
 * POST /api/accounting/invoices/[id]/verify - 審核發票
 */
export const POST = withAuth('invoices:verify')<{ id: string }>(
  async (request, { user, db }, { id }) => {
    try {
      const invoice = await verifyInvoiceById(db, id, user.id)
      return NextResponse.json(invoice)
    } catch (error) {
      const message = getErrorMessage(error)
      if (message.includes('不存在')) {
        return NextResponse.json({ error: message }, { status: 404 })
      }
      if (message.includes('不可為空') || message.includes('請選擇')) {
        return NextResponse.json({ error: message }, { status: 400 })
      }
      throw error
    }
  }
)
