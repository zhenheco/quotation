/**
 * POST /api/accounting/guangmao/sync-input
 * 從光貿拉取進項發票並匯入系統
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { verifyCompanyMembership } from '@/lib/dal/companies'
import { GuangmaoClient } from '@/lib/services/guangmao/client'
import { processInputInvoice } from '@/lib/services/guangmao/sync'

interface SyncBody {
  company_id: string
  date_start: string // YYYY-MM-DD
  date_end: string   // YYYY-MM-DD
}

interface InputInvoiceListItem {
  InvoiceNumber: string
  InvoiceDate: string
  SellerIdentifier: string
  SellerName?: string
  SalesAmount: string | number
  TaxAmount: string | number
  TotalAmount: string | number
}

interface InvoiceListResponse {
  total: number
  data: InputInvoiceListItem[]
}

export const POST = withAuth('guangmao:read')(async (request, { user, db }) => {
  const body = (await request.json()) as SyncBody

  if (!body.company_id || !body.date_start || !body.date_end) {
    return NextResponse.json({ error: '缺少必要欄位（company_id, date_start, date_end）' }, { status: 400 })
  }

  // 驗證日期格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(body.date_start) || !dateRegex.test(body.date_end)) {
    return NextResponse.json({ error: '日期格式錯誤（需為 YYYY-MM-DD）' }, { status: 400 })
  }

  // 多租戶隔離
  const isMember = await verifyCompanyMembership(db, user.id, body.company_id)
  if (!isMember) {
    return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
  }

  // 取得公司設定
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

  const client = new GuangmaoClient({
    invoice: settings.guangmao_tax_id,
    appKey: appKey as string,
  })

  // 拉取進項發票清單（分頁）
  let page = 1
  let imported = 0
  let skipped = 0
  let failed = 0

  try {
    while (true) {
      const response = await client.request<InvoiceListResponse>('json/invoice_list', {
        date_select: '1',
        date_start: body.date_start,
        date_end: body.date_end,
        type: '2', // 進項
        page: String(page),
      })

      if (response.code !== 0 || !response.data?.data?.length) {
        break
      }

      for (const item of response.data.data) {
        try {
          const result = await processInputInvoice(db, body.company_id, item)
          if (result && 'id' in result && !('number' in result && result.number === item.InvoiceNumber)) {
            // existing record returned (dedup)
            skipped++
          } else {
            imported++
          }
        } catch {
          failed++
        }
      }

      // 如果本頁不滿 50 筆，表示已是最後一頁
      if (response.data.data.length < 50) break
      page++

      // 安全上限：最多拉取 10 頁
      if (page > 10) break
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '光貿 API 連線失敗' },
      { status: 502 },
    )
  }

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    failed,
    total: imported + skipped + failed,
    has_more: page > 10,
  })
})
