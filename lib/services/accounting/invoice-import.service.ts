/**
 * 發票 Excel 匯入服務
 * 解析上傳的 Excel 檔案並驗證資料
 */

import ExcelJS from 'exceljs'
import {
  validateInvoiceRow,
  ParsedInvoiceRow,
  InvoiceValidationError,
  INVOICE_TEMPLATE_COLUMNS,
} from './invoice-template.service'

export interface InvoiceImportResult {
  success: boolean
  totalRows: number
  validRows: number
  invalidRows: number
  data: ParsedInvoiceRow[]
  errors: InvoiceValidationError[]
}

/**
 * 從 Excel 檔案 Buffer 解析發票資料
 */
export async function parseInvoiceExcel(buffer: ArrayBuffer | Uint8Array): Promise<InvoiceImportResult> {
  const workbook = new ExcelJS.Workbook()
  // @ts-expect-error - Cloudflare Workers Buffer 類型與 Node.js 有差異
  await workbook.xlsx.load(buffer)

  // 取得資料工作表（第一個工作表或名為「發票資料」的工作表）
  let dataSheet = workbook.getWorksheet('發票資料')
  if (!dataSheet) {
    dataSheet = workbook.worksheets[0]
  }

  if (!dataSheet) {
    return {
      success: false,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      data: [],
      errors: [{ row: 0, column: '', message: '找不到有效的工作表' }],
    }
  }

  // 取得標題行
  const headerRow = dataSheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '').trim()
  })

  // 建立欄位對應（處理帶 * 的必填標記）
  const columnMapping: Record<number, string> = {}
  headers.forEach((header, index) => {
    // 移除必填標記 *
    const cleanHeader = header.replace(/\s*\*\s*$/, '').trim()

    // 找到對應的欄位 key
    const templateCol = INVOICE_TEMPLATE_COLUMNS.find((col) => col.header === cleanHeader)
    if (templateCol) {
      columnMapping[index] = templateCol.key
    } else {
      // 直接使用標題名稱作為 key（用於驗證時的中文 key 匹配）
      columnMapping[index] = cleanHeader
    }
  })

  // 解析資料行
  const allData: ParsedInvoiceRow[] = []
  const allErrors: InvoiceValidationError[] = []
  let totalRows = 0
  let validRows = 0
  let invalidRows = 0

  // 從第 2 行開始讀取資料
  dataSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return // 跳過標題行

    // 跳過空行
    let hasData = false
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.value !== null && cell.value !== undefined && String(cell.value).trim() !== '') {
        hasData = true
      }
    })
    if (!hasData) return

    totalRows++

    // 建立行資料物件
    const rowData: Record<string, unknown> = {}
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = columnMapping[colNumber - 1]
      if (key) {
        // 處理 Excel 日期物件
        let value = cell.value
        if (value instanceof Date) {
          // 保持 Date 物件，讓 validateInvoiceRow 處理
        } else if (typeof value === 'object' && value !== null) {
          // 處理 ExcelJS 的複合值物件
          const cellValue = value as { result?: unknown; text?: string; hyperlink?: string }
          if ('result' in cellValue) {
            value = cellValue.result as string | number | Date | null
          } else if ('text' in cellValue) {
            value = cellValue.text as string
          }
        }
        rowData[key] = value
      }
    })

    // 驗證行資料
    const { data, errors } = validateInvoiceRow(rowData, rowNumber)

    if (errors.length > 0) {
      invalidRows++
      allErrors.push(...errors)
    } else if (data) {
      validRows++
      allData.push(data)
    }
  })

  return {
    success: invalidRows === 0 && totalRows > 0,
    totalRows,
    validRows,
    invalidRows,
    data: allData,
    errors: allErrors,
  }
}

/**
 * 檢查發票號碼是否重複（在匯入資料中）
 */
export function checkDuplicateNumbers(data: ParsedInvoiceRow[]): InvoiceValidationError[] {
  const errors: InvoiceValidationError[] = []
  const numberMap = new Map<string, number[]>()

  // 收集每個發票號碼出現的行數
  data.forEach((row, index) => {
    const rowNumber = index + 2 // Excel 從第 2 行開始是資料
    const numbers = numberMap.get(row.number) || []
    numbers.push(rowNumber)
    numberMap.set(row.number, numbers)
  })

  // 檢查重複
  numberMap.forEach((rows, number) => {
    if (rows.length > 1) {
      rows.forEach((rowNumber) => {
        errors.push({
          row: rowNumber,
          column: '發票號碼',
          message: `發票號碼 ${number} 在匯入資料中重複（行 ${rows.join(', ')}）`,
        })
      })
    }
  })

  return errors
}

/**
 * 格式化驗證錯誤為易讀訊息
 */
export function formatValidationErrors(errors: InvoiceValidationError[]): string {
  if (errors.length === 0) return ''

  const groupedErrors = new Map<number, InvoiceValidationError[]>()

  errors.forEach((error) => {
    const rowErrors = groupedErrors.get(error.row) || []
    rowErrors.push(error)
    groupedErrors.set(error.row, rowErrors)
  })

  const messages: string[] = []
  groupedErrors.forEach((rowErrors, row) => {
    const errorMsgs = rowErrors.map((e) => `${e.column}: ${e.message}`).join('; ')
    messages.push(`第 ${row} 行: ${errorMsgs}`)
  })

  return messages.join('\n')
}
