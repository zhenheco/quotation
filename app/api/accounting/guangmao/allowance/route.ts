/**
 * POST /api/accounting/guangmao/allowance
 * 開立折讓（透過光貿 API）
 * 用於跨期退款或部分退款
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { verifyCompanyMembership } from '@/lib/dal/companies'
import { createInvoice } from '@/lib/dal/accounting/invoices.dal'
import { GuangmaoClient } from '@/lib/services/guangmao/client'
import type { GuangmaoAllowanceData } from '@/lib/services/guangmao/types'

interface AllowanceBody {
  company_id: string
  invoice_id: string
  items: {
    description: string
    quantity: number
    unit_price: number
    amount: number
    tax: number
  }[]
  reason?: string
}

export const POST = withAuth('guangmao:write')(async (request, { user, db }) => {
  const body = (await request.json()) as AllowanceBody

  if (!body.company_id || !body.invoice_id || !body.items?.length) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 多租戶隔離
  const isMember = await verifyCompanyMembership(db, user.id, body.company_id)
  if (!isMember) {
    return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
  }

  // 取得原始發票
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
    return NextResponse.json({ error: '已作廢的發票無法開立折讓' }, { status: 409 })
  }

  if (invoice.source !== 'GUANGMAO') {
    return NextResponse.json({ error: '僅支援光貿開立的發票折讓' }, { status: 400 })
  }

  // 取得公司設定 + APP KEY
  const { data: settings } = await db
    .from('company_settings')
    .select('guangmao_enabled, guangmao_vault_secret_id, guangmao_tax_id')
    .eq('company_id', body.company_id)
    .single()

  if (!settings?.guangmao_enabled || !settings.guangmao_vault_secret_id) {
    return NextResponse.json({ error: '尚未設定光貿整合' }, { status: 400 })
  }

  const { data: appKey, error: keyError } = await db.rpc('get_guangmao_secret', {
    p_secret_id: settings.guangmao_vault_secret_id,
  })

  if (keyError || !appKey) {
    return NextResponse.json({ error: '系統設定錯誤（金鑰遺失）' }, { status: 500 })
  }

  // 計算折讓金額
  const totalAmount = body.items.reduce((sum, item) => sum + item.amount, 0)
  const totalTax = body.items.reduce((sum, item) => sum + item.tax, 0)

  // 檢查折讓金額不超過原始發票可折讓餘額
  const { data: existingAllowances } = await db
    .from('acc_invoices')
    .select('untaxed_amount')
    .eq('original_invoice_number', invoice.number)
    .eq('company_id', body.company_id)
    .eq('return_type', 'ALLOWANCE')

  const usedAllowance = (existingAllowances || []).reduce(
    (sum, a) => sum + Math.abs(a.untaxed_amount),
    0,
  )
  const maxAllowable = invoice.untaxed_amount - usedAllowance

  if (totalAmount > maxAllowable) {
    return NextResponse.json(
      { error: `折讓金額超過可折讓餘額（剩餘 ${Math.round(maxAllowable)} 元）` },
      { status: 400 },
    )
  }

  // 組裝光貿折讓請求
  const allowanceData: GuangmaoAllowanceData = {
    AllowanceDate: new Date().toISOString().split('T')[0],
    SellerIdentifier: settings.guangmao_tax_id,
    BuyerIdentifier: invoice.counterparty_tax_id || '0000000000',
    BuyerName: invoice.counterparty_name || '個人消費者',
    AllowanceType: '2', // 賣方折讓
    TaxType: '1',
    TotalAmount: Math.round(totalAmount),
    TaxAmount: Math.round(totalTax),
    ProductItem: body.items.map((item) => ({
      OriginalInvoiceDate: invoice.date,
      OriginalInvoiceNumber: invoice.number,
      Description: item.description,
      Quantity: item.quantity,
      UnitPrice: item.unit_price,
      Amount: Math.round(item.amount),
      Tax: Math.round(item.tax),
    })),
  }

  // 建立請求記錄
  const { data: requestRecord, error: reqError } = await db
    .from('acc_invoice_requests')
    .insert({
      company_id: body.company_id,
      invoice_id: body.invoice_id,
      request_type: 'ALLOWANCE',
      status: 'PENDING',
      request_data: allowanceData,
    })
    .select('id')
    .single()

  if (reqError) {
    return NextResponse.json({ error: '建立折讓請求失敗' }, { status: 500 })
  }

  // 呼叫光貿 API
  const client = new GuangmaoClient({
    invoice: settings.guangmao_tax_id,
    appKey: appKey as string,
  })

  try {
    const response = await client.issueAllowance(allowanceData)

    if (response.code !== 0) {
      await db
        .from('acc_invoice_requests')
        .update({
          status: 'FAILED',
          response_data: response,
          error_message: response.msg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestRecord.id)

      return NextResponse.json(
        { success: false, request_id: requestRecord.id, error: `折讓開立失敗: ${response.msg}` },
        { status: 502 },
      )
    }

    // 成功 → 更新請求 + 建立折讓發票記錄
    await db
      .from('acc_invoice_requests')
      .update({
        status: 'SUCCESS',
        response_data: response,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestRecord.id)

    const allowanceInvoice = await createInvoice(db, {
      company_id: body.company_id,
      number: `${invoice.number}-A`,
      type: 'OUTPUT',
      date: allowanceData.AllowanceDate,
      untaxed_amount: -totalAmount,
      tax_amount: -totalTax,
      total_amount: -(totalAmount + totalTax),
      counterparty_tax_id: invoice.counterparty_tax_id,
      counterparty_name: invoice.counterparty_name,
      source: 'GUANGMAO',
      guangmao_status: 'SUCCESS',
      return_type: 'ALLOWANCE',
      original_invoice_number: invoice.number,
      original_invoice_date: invoice.date,
      description: body.reason || '折讓',
    })

    return NextResponse.json({
      success: true,
      request_id: requestRecord.id,
      allowance_invoice_id: allowanceInvoice.id,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        request_id: requestRecord.id,
        error: error instanceof Error ? error.message : '折讓開立失敗',
      },
      { status: 502 },
    )
  }
})
