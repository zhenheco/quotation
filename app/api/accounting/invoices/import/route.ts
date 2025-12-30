/**
 * 發票批次匯入 API
 * POST /api/accounting/invoices/import - 匯入已解析的發票 JSON 資料
 *
 * 注意：Excel 解析已移至客戶端（使用 SheetJS），
 * 此 API 只接收 JSON 格式的發票資料
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createInvoice, getInvoiceByNumber } from '@/lib/dal/accounting/invoices.dal'
import type { ParsedInvoiceRow } from '@/lib/services/accounting/invoice-template.service'

export interface ImportResponse {
  success: boolean
  totalRows: number
  importedCount: number
  skippedCount: number
  errors: Array<{
    row: number
    column: string
    message: string
  }>
}

interface ImportRequestBody {
  company_id: string
  data: ParsedInvoiceRow[]
}

/**
 * POST /api/accounting/invoices/import - 批次匯入發票
 *
 * 請求格式：application/json
 * {
 *   company_id: string,
 *   data: ParsedInvoiceRow[]
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<ImportResponse>> {
  const { env } = await getCloudflareContext()

  try {
    const supabase = createApiClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          totalRows: 0,
          importedCount: 0,
          skippedCount: 0,
          errors: [{ row: 0, column: '', message: 'Unauthorized' }],
        },
        { status: 401 }
      )
    }

    const kv = getKVCache(env)
    const db = getSupabaseClient()

    // 檢查權限
    const hasPermission = await checkPermission(kv, db, user.id, 'invoices:write')
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          totalRows: 0,
          importedCount: 0,
          skippedCount: 0,
          errors: [{ row: 0, column: '', message: 'Forbidden' }],
        },
        { status: 403 }
      )
    }

    // 只接收 JSON 格式
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        {
          success: false,
          totalRows: 0,
          importedCount: 0,
          skippedCount: 0,
          errors: [{ row: 0, column: '', message: '請使用 JSON 格式提交資料' }],
        },
        { status: 400 }
      )
    }

    const body = (await request.json()) as ImportRequestBody

    if (!body.company_id) {
      return NextResponse.json(
        {
          success: false,
          totalRows: 0,
          importedCount: 0,
          skippedCount: 0,
          errors: [{ row: 0, column: '', message: 'company_id is required' }],
        },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.data) || body.data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          totalRows: 0,
          importedCount: 0,
          skippedCount: 0,
          errors: [{ row: 0, column: '', message: '無資料可匯入' }],
        },
        { status: 400 }
      )
    }

    // 批次匯入
    const result = await batchImportInvoices(db, body.company_id, body.data)
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    })
  } catch (error: unknown) {
    console.error('Error importing invoices:', error)
    return NextResponse.json(
      {
        success: false,
        totalRows: 0,
        importedCount: 0,
        skippedCount: 0,
        errors: [{ row: 0, column: '', message: getErrorMessage(error) }],
      },
      { status: 500 }
    )
  }
}

/**
 * 批次匯入發票
 */
async function batchImportInvoices(
  db: Awaited<ReturnType<typeof getSupabaseClient>>,
  companyId: string,
  data: ParsedInvoiceRow[]
): Promise<ImportResponse> {
  const errors: Array<{ row: number; column: string; message: string }> = []
  let importedCount = 0
  let skippedCount = 0

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNumber = i + 2 // Excel 從第 2 行開始是資料

    try {
      // 檢查發票號碼是否已存在
      const existing = await getInvoiceByNumber(db, companyId, row.number)
      if (existing) {
        skippedCount++
        errors.push({
          row: rowNumber,
          column: '發票號碼',
          message: `發票號碼 ${row.number} 已存在於系統中`,
        })
        continue
      }

      // 建立發票
      await createInvoice(db, {
        company_id: companyId,
        number: row.number,
        type: row.type,
        date: row.date,
        untaxed_amount: row.untaxed_amount,
        tax_amount: row.tax_amount,
        total_amount: row.total_amount,
        counterparty_name: row.counterparty_name,
        counterparty_tax_id: row.counterparty_tax_id,
        description: row.description,
        due_date: row.due_date,
      })

      importedCount++
    } catch (error) {
      skippedCount++
      errors.push({
        row: rowNumber,
        column: '',
        message: `匯入失敗: ${getErrorMessage(error)}`,
      })
    }
  }

  return {
    success: errors.length === 0,
    totalRows: data.length,
    importedCount,
    skippedCount,
    errors,
  }
}
