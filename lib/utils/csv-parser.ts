/**
 * 客戶端 CSV 解析工具
 * 使用 PapaParse 在瀏覽器端解析 CSV
 * 支援 UTF-8 / Big5 / GBK 等中文編碼自動偵測
 */

import Papa from 'papaparse'

export interface CsvParseResult {
  data: Record<string, string | number | undefined>[]
  headers: string[]
  errors: Papa.ParseError[]
}

/**
 * 偵測檔案編碼並解碼為字串
 * 優先順序：BOM 偵測 → UTF-8 嘗試 → Big5 回退
 */
async function decodeFileContent(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // 檢查 UTF-8 BOM (EF BB BF)
  const hasUtf8Bom =
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf

  if (hasUtf8Bom) {
    return new TextDecoder('utf-8').decode(buffer)
  }

  // 嘗試 UTF-8 解碼（strict mode，遇到無效序列會拋錯）
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    return decoder.decode(buffer)
  } catch {
    // UTF-8 解碼失敗，回退到 Big5（台灣 Excel 匯出常見編碼）
    try {
      return new TextDecoder('big5').decode(buffer)
    } catch {
      // 最後回退：用寬鬆模式 UTF-8 解碼
      return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    }
  }
}

/**
 * PapaParse 配置
 */
const PAPA_PARSE_CONFIG = {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: true,
  quoteChar: '"',
} as const

/**
 * 解析 CSV 檔案
 * 自動偵測檔案編碼（UTF-8 / Big5），避免中文亂碼
 * @param file - File 對象
 * @returns 解析結果
 */
export async function parseCsvFile(file: File): Promise<CsvParseResult> {
  const csvString = await decodeFileContent(file)
  const results = Papa.parse(csvString, PAPA_PARSE_CONFIG)

  return {
    data: results.data as Record<string, string | number | undefined>[],
    headers: results.meta.fields || [],
    errors: results.errors,
  }
}

/**
 * 解析 CSV 字串
 * @param csvString - CSV 字串
 * @returns 解析結果
 */
export function parseCsvString(csvString: string): CsvParseResult {
  const results = Papa.parse(csvString, PAPA_PARSE_CONFIG)

  return {
    data: results.data as Record<string, string | number | undefined>[],
    headers: results.meta.fields || [],
    errors: results.errors,
  }
}

/**
 * 將資料轉換為 CSV 字串
 * @param data - 資料陣列
 * @param headers - 標題陣列
 * @returns CSV 字串
 */
export function toCsvString(
  data: Record<string, unknown>[],
  headers?: string[]
): string {
  return Papa.unparse(data, {
    columns: headers,
    quotes: true,
    quoteChar: '"',
    delimiter: ',',
    newline: '\r\n',
  })
}
