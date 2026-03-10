/**
 * 發票過帳 API Route
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { verifyCompanyMembership } from '@/lib/dal/companies'
import { getInvoiceDetail, postInvoiceById } from '@/lib/services/accounting'

/**
 * POST /api/accounting/invoices/[id]/post - 過帳發票（產生傳票）
 */
export const POST = withAuth('invoices:post')<{ id: string }>(
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
