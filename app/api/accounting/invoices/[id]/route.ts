/**
 * 會計發票詳情 API Routes
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getErrorMessage } from '@/app/api/utils/error-handler'
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
  async (request, { db }, { id }) => {
    const invoice = await getInvoiceDetail(db, id)

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  }
)

/**
 * PUT /api/accounting/invoices/[id] - 更新發票
 */
export const PUT = withAuth('invoices:write')<{ id: string }>(
  async (request, { db }, { id }) => {
    try {
      const body = await request.json() as UpdateInvoiceInput
      const invoice = await updateExistingInvoice(db, id, body)
      return NextResponse.json(invoice)
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
  async (request, { db }, { id }) => {
    try {
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
