/**
 * 發票批次匯入 API
 * POST /api/accounting/invoices/import - 解析並匯入 Excel 發票資料
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  parseInvoiceExcel,
  checkDuplicateNumbers,
} from '@/lib/services/accounting/invoice-import.service'
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

/**
 * POST /api/accounting/invoices/import - 批次匯入發票
 *
 * 支援兩種模式：
 * 1. 上傳 Excel 檔案 (multipart/form-data)
 * 2. 傳送已解析的資料 (application/json)
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

    const contentType = request.headers.get('content-type') || ''

    // 處理 JSON 資料（預覽後確認匯入）
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as {
        company_id: string
        data: ParsedInvoiceRow[]
      }

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
    }

    // 處理 Excel 檔案上傳
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const companyId = formData.get('company_id') as string | null
      const action = formData.get('action') as string | null // 'preview' 或 'import'

      if (!file) {
        return NextResponse.json(
          {
            success: false,
            totalRows: 0,
            importedCount: 0,
            skippedCount: 0,
            errors: [{ row: 0, column: '', message: '請上傳檔案' }],
          },
          { status: 400 }
        )
      }

      if (!companyId) {
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

      // 驗證檔案類型
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        return NextResponse.json(
          {
            success: false,
            totalRows: 0,
            importedCount: 0,
            skippedCount: 0,
            errors: [{ row: 0, column: '', message: '請上傳 Excel 檔案 (.xlsx 或 .xls)' }],
          },
          { status: 400 }
        )
      }

      // 解析 Excel
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const parseResult = await parseInvoiceExcel(buffer)

      // 檢查匯入資料內重複的發票號碼
      const duplicateErrors = checkDuplicateNumbers(parseResult.data)
      if (duplicateErrors.length > 0) {
        parseResult.errors.push(...duplicateErrors)
        parseResult.success = false
        parseResult.invalidRows += duplicateErrors.length
      }

      // 如果只是預覽，回傳解析結果
      if (action === 'preview') {
        return NextResponse.json({
          success: parseResult.success,
          totalRows: parseResult.totalRows,
          importedCount: 0,
          skippedCount: parseResult.invalidRows,
          errors: parseResult.errors,
          // 額外回傳解析的資料供預覽
          previewData: parseResult.data,
        })
      }

      // 如果解析有錯誤，不進行匯入
      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            totalRows: parseResult.totalRows,
            importedCount: 0,
            skippedCount: parseResult.invalidRows,
            errors: parseResult.errors,
          },
          { status: 400 }
        )
      }

      // 執行批次匯入
      const importResult = await batchImportInvoices(db, companyId, parseResult.data)
      return NextResponse.json(importResult, {
        status: importResult.success ? 200 : 400,
      })
    }

    return NextResponse.json(
      {
        success: false,
        totalRows: 0,
        importedCount: 0,
        skippedCount: 0,
        errors: [{ row: 0, column: '', message: '不支援的請求格式' }],
      },
      { status: 400 }
    )
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
