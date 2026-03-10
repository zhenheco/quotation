/**
 * 發票作廢 API Route
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { verifyCompanyMembership } from '@/lib/dal/companies'
import { getInvoiceDetail, voidInvoiceById } from '@/lib/services/accounting'

interface VoidRequestBody {
  reason: string
}

/**
 * POST /api/accounting/invoices/[id]/void - 作廢發票
 */
export const POST = withAuth('invoices:void')<{ id: string }>(
  async (request, { user, db }, { id }) => {
    try {
      const invoice = await getInvoiceDetail(db, id)
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }

      // 多租戶隔離：驗證使用者屬於該公司
      const isMember = await verifyCompanyMembership(db, user.id, invoice.company_id)
      if (!isMember) {
        return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
      }

      const body = await request.json() as VoidRequestBody

      if (!body.reason || body.reason.trim().length === 0) {
        return NextResponse.json({ error: '請填寫作廢原因' }, { status: 400 })
      }

      const result = await voidInvoiceById(db, id, user.id, body.reason)
      return NextResponse.json(result)
    } catch (error) {
      const message = getErrorMessage(error)
      if (message.includes('不存在')) {
        return NextResponse.json({ error: message }, { status: 404 })
      }
      if (message.includes('已作廢')) {
        return NextResponse.json({ error: message }, { status: 400 })
      }
      throw error
    }
  }
)
