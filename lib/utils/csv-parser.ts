/**
 * 客戶端 CSV 解析工具
 * 使用 PapaParse 在瀏覽器端解析 CSV
 */

import Papa from 'papaparse'

export interface CsvParseResult {
  data: Record<string, string | number | undefined>[]
  headers: string[]
  errors: Papa.ParseError[]
}

/**
 * 解析 CSV 檔案
 * @param file - File 對象
 * @returns 解析結果
 */
export async function parseCsvFile(file: File): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // 自動轉換數字
      dynamicTyping: true,
      // 處理引號內的換行
      quoteChar: '"',
      // 錯誤處理
      complete: (results) => {
        const data = results.data as Record<string, string | number | undefined>[]
        const headers = results.meta.fields || []

        resolve({
          data,
          headers,
          errors: results.errors,
        })
      },
      error: (error) => {
        reject(new Error(`CSV 解析失敗: ${error.message}`))
      },
    })
  })
}

/**
 * 解析 CSV 字串
 * @param csvString - CSV 字串
 * @returns 解析結果
 */
export function parseCsvString(csvString: string): CsvParseResult {
  const results = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    quoteChar: '"',
  })

  const data = results.data as Record<string, string | number | undefined>[]
  const headers = results.meta.fields || []

  return {
    data,
    headers,
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
