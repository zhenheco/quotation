/**
 * 客戶端 Excel 解析工具
 * 使用 SheetJS (xlsx) 在瀏覽器端解析 Excel
 */

import * as XLSX from 'xlsx'

export interface ParsedRow {
  [key: string]: string | number | Date | undefined
}

export interface ExcelParseResult {
  data: ParsedRow[]
  headers: string[]
  sheetName: string
}

/**
 * 解析 Excel 檔案
 * @param file - File 對象
 * @returns 解析結果
 */
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })

  // 嘗試找「發票資料」工作表，否則使用第一個
  const sheetName =
    workbook.SheetNames.find((name) => name === '發票資料') ?? workbook.SheetNames[0] ?? ''

  const worksheet = workbook.Sheets[sheetName]

  // 轉換為 JSON，第一行為標題
  const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, {
    raw: false,
    dateNF: 'yyyy-mm-dd',
  })

  // 取得標題
  const headers = Object.keys(jsonData[0] || {})

  return {
    data: jsonData,
    headers,
    sheetName,
  }
}

/**
 * 將日期轉換為 YYYY-MM-DD 格式
 */
export function formatDateString(value: unknown): string {
  if (!value) return ''

  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }

  const str = String(value).trim()

  // 已經是正確格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }

  // 嘗試解析其他格式
  const date = new Date(str)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  return str
}
