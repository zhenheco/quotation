/**
 * POST /api/accounting/guangmao/void
 * 作廢發票（透過光貿 API）
 * 如果發票已跨期，回傳提示改用折讓
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { verifyCompanyMembership } from '@/lib/dal/companies'
import { requestVoidInvoice } from '@/lib/services/guangmao/invoice'

interface VoidBody {
  company_id: string
  invoice_id: string
  reason: string
}

export const POST = withAuth('guangmao:write')(async (request, { user, db }) => {
  const body = (await request.json()) as VoidBody

  if (!body.company_id || !body.invoice_id || !body.reason) {
    return NextResponse.json({ error: '缺少必要欄位（company_id, invoice_id, reason）' }, { status: 400 })
  }

  // 多租戶隔離
  const isMember = await verifyCompanyMembership(db, user.id, body.company_id)
  if (!isMember) {
    return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
  }

  // 取得發票
  const { data: invoice, error: invoiceError } = await db
    .from('acc_invoices')
    .select('*')
    .eq('id', body.invoice_id)
    .eq('company_id', body.company_id)
    .single()

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: '發票不存在' }, { status: 404 })
  }

  if (invoice.status === 'VOIDED') {
    return NextResponse.json({ error: '此發票已作廢' }, { status: 409 })
  }

  if (invoice.source !== 'GUANGMAO') {
    return NextResponse.json({ error: '僅支援光貿開立的發票作廢' }, { status: 400 })
  }

  // 取得賣方統編
  const { data: settings } = await db
    .from('company_settings')
    .select('guangmao_tax_id')
    .eq('company_id', body.company_id)
    .single()

  if (!settings?.guangmao_tax_id) {
    return NextResponse.json({ error: '尚未設定光貿整合' }, { status: 400 })
  }

  try {
    const voidRequest = await requestVoidInvoice(db, invoice, body.reason, settings.guangmao_tax_id)
    return NextResponse.json({ success: true, request_id: voidRequest.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : '作廢失敗'
    // 跨期發票提示改用折讓
    if (message.includes('跨期')) {
      return NextResponse.json({
        error: message,
        suggest_allowance: true,
      }, { status: 422 })
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
