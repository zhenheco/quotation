/**
 * 會計發票詳情 API Routes
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { verifyCompanyMembership } from '@/lib/dal/companies'
import {
  getInvoiceDetail,
  updateExistingInvoice,
  deleteInvoiceById,
} from '@/lib/services/accounting'
import type { UpdateInvoiceInput } from '@/lib/dal/accounting'

/**
 * GET /api/accounting/invoices/[id] - 取得發票詳情
 */
export const GET = withAuth('invoices:read')<{ id: string }>(
  async (request, { user, db }, { id }) => {
    const invoice = await getInvoiceDetail(db, id)

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // 多租戶隔離：驗證使用者屬於該公司
    const isMember = await verifyCompanyMembership(db, user.id, invoice.company_id)
    if (!isMember) {
      return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
    }

    return NextResponse.json(invoice)
  }
)

/**
 * PUT /api/accounting/invoices/[id] - 更新發票
 */
export const PUT = withAuth('invoices:write')<{ id: string }>(
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

      const body = await request.json() as UpdateInvoiceInput

      // 資源一致性檢查：若更新 counterparty_id，驗證其屬於同一公司
      if (body.counterparty_id) {
        const { data: counterparty } = await db
          .from('counterparties')
          .select('company_id')
          .eq('id', body.counterparty_id)
          .single()

        if (counterparty && counterparty.company_id !== invoice.company_id) {
          return NextResponse.json({ error: '往來對象不屬於此公司' }, { status: 403 })
        }
      }

      const updated = await updateExistingInvoice(db, id, body)
      return NextResponse.json(updated)
    } catch (error) {
      const message = getErrorMessage(error)
      if (message.includes('不存在')) {
        return NextResponse.json({ error: message }, { status: 404 })
      }
      if (message.includes('只能修改')) {
        return NextResponse.json({ error: message }, { status: 400 })
      }
      throw error
    }
  }
)

/**
 * DELETE /api/accounting/invoices/[id] - 刪除發票
 */
export const DELETE = withAuth('invoices:delete')<{ id: string }>(
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

      await deleteInvoiceById(db, id)
      return NextResponse.json({ success: true })
    } catch (error) {
      const message = getErrorMessage(error)
      if (message.includes('不存在')) {
        return NextResponse.json({ error: message }, { status: 404 })
      }
      if (message.includes('只能刪除')) {
        return NextResponse.json({ error: message }, { status: 400 })
      }
      throw error
    }
  }
)
