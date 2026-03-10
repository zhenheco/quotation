/**
 * POST /api/accounting/guangmao/issue
 * 開立銷項發票（透過光貿 API）
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { GuangmaoClient } from '@/lib/services/guangmao/client'
import {
  mapOrderToGuangmaoIssueData,
  processGuangmaoIssueResponse,
} from '@/lib/services/guangmao/invoice'
import { verifyCompanyMembership } from '@/lib/dal/companies'
import type { OrderWithCustomer, OrderItem } from '@/lib/dal/orders'

interface IssueBody {
  company_id: string
  order_id: string
  carrier_type?: string
  carrier_id?: string
  love_code?: string
}

export const POST = withAuth('guangmao:write')(async (request, { user, db }) => {
  const body = (await request.json()) as IssueBody

  if (!body.company_id || !body.order_id) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 多租戶隔離：驗證使用者屬於該公司
  const isMember = await verifyCompanyMembership(db, user.id, body.company_id)
  if (!isMember) {
    return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
  }

  // 1. 冪等性檢查：同一訂單是否已有請求
  const { data: existingRequest } = await db
    .from('acc_invoice_requests')
    .select('id, status, invoice_id, retry_count')
    .eq('order_id', body.order_id)
    .eq('request_type', 'ISSUE')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingRequest?.status === 'SUCCESS') {
    return NextResponse.json(
      { error: '此訂單已開立發票', invoice_id: existingRequest.invoice_id },
      { status: 409 },
    )
  }

  // 2. 取得訂單 + 公司設定
  const [orderResult, itemsResult, settingsResult] = await Promise.all([
    db.from('orders').select('*, customer:customers(*)').eq('id', body.order_id).single(),
    db.from('order_items').select('*').eq('order_id', body.order_id),
    db.from('company_settings').select('*').eq('company_id', body.company_id).single(),
  ])

  const order = orderResult.data as OrderWithCustomer | null
  const items = (itemsResult.data || []) as OrderItem[]
  const settings = settingsResult.data

  if (!order) {
    return NextResponse.json({ error: '訂單不存在' }, { status: 404 })
  }
  // 驗證訂單屬於該公司（防止 IDOR 跨公司存取）
  if (order.company_id !== body.company_id) {
    return NextResponse.json({ error: '訂單不屬於此公司' }, { status: 403 })
  }
  if (!settings?.guangmao_enabled || !settings.guangmao_vault_secret_id) {
    return NextResponse.json({ error: '尚未設定光貿整合' }, { status: 400 })
  }

  // 3. 組裝光貿請求資料
  const requestData = mapOrderToGuangmaoIssueData(order, items, {
    carrierType: body.carrier_type,
    carrierId: body.carrier_id,
    loveCode: body.love_code,
  })

  // 4. 建立或重用請求記錄（失敗的請求可重用，避免同一訂單產生多筆記錄）
  let invoiceRequest: { id: string }

  if (existingRequest && (existingRequest.status === 'FAILED' || existingRequest.status === 'PENDING')) {
    // 重用既有失敗/待處理的請求
    const { data, error } = await db
      .from('acc_invoice_requests')
      .update({
        status: 'PENDING',
        request_data: requestData,
        error_message: null,
        retry_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRequest.id)
      .select('id')
      .single()

    if (error) {
      console.error('Failed to update invoice request:', error.message)
      return NextResponse.json({ error: '更新發票請求失敗' }, { status: 500 })
    }
    invoiceRequest = data
  } else {
    // 新建請求
    const { data, error } = await db
      .from('acc_invoice_requests')
      .insert({
        company_id: body.company_id,
        order_id: body.order_id,
        request_type: 'ISSUE',
        status: 'PENDING',
        request_data: requestData,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create invoice request:', error.message)
      return NextResponse.json({ error: '建立發票請求失敗' }, { status: 500 })
    }
    invoiceRequest = data
  }

  // 5. 從 Vault 取得 APP KEY
  const { data: appKey, error: keyError } = await db.rpc('get_guangmao_secret', {
    p_secret_id: settings.guangmao_vault_secret_id,
  })

  if (keyError || !appKey) {
    console.error('Failed to retrieve guangmao secret:', keyError?.message)
    return NextResponse.json({ error: '系統設定錯誤（金鑰遺失）' }, { status: 500 })
  }

  // 6. 呼叫光貿 API
  const client = new GuangmaoClient({
    invoice: settings.guangmao_tax_id,
    appKey: appKey as string,
  })

  try {
    const response = await client.issueInvoice(requestData)
    const invoice = await processGuangmaoIssueResponse(
      db,
      invoiceRequest.id,
      response,
      body.order_id,
      body.company_id,
    )

    return NextResponse.json({
      success: true,
      request_id: invoiceRequest.id,
      invoice_number: invoice.number,
      invoice_id: invoice.id,
    })
  } catch (error) {
    // 開立失敗但請求已記錄，可透過 cron 重試
    return NextResponse.json(
      {
        success: false,
        request_id: invoiceRequest.id,
        error: error instanceof Error ? error.message : '開立發票失敗',
      },
      { status: 502 },
    )
  }
})
