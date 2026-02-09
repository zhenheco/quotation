/**
 * 客戶匯入資料驗證器
 */

import type { ValidationError, CustomerImportRow, ParsedRow } from '../types'
import { getHeaderToKeyMap } from '../template-columns'

/** Email 驗證正則表達式 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 驗證客戶匯入資料行
 * @param row - 原始資料行
 * @param rowNumber - 資料行號（從 1 開始）
 * @returns 驗證結果
 */
export function validateCustomerRow(
  row: Record<string, unknown>,
  rowNumber: number
): { data: CustomerImportRow | null; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const headerMap = getHeaderToKeyMap('customers')

  // 轉換欄位名稱（支援中英文標題）
  const normalizedRow: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = headerMap.get(key) || key
    normalizedRow[normalizedKey] = value
  }

  // 必填：客戶名稱（中文）
  const nameZh = String(normalizedRow['name_zh'] || '').trim()
  if (!nameZh) {
    errors.push({
      row: rowNumber,
      column: 'name_zh',
      message: '客戶名稱(中)為必填欄位',
      messageEn: 'Customer name (Chinese) is required',
    })
  }

  // 選填：電子郵件（如有填寫則驗證格式）
  const email = String(normalizedRow['email'] || '').trim()
  if (email && !EMAIL_REGEX.test(email)) {
    errors.push({
      row: rowNumber,
      column: 'email',
      message: '電子郵件格式不正確',
      messageEn: 'Invalid email format',
    })
  }

  // 選填：聯絡人 Email（如有填寫則驗證格式）
  const contactEmail = String(normalizedRow['contact_email'] || '').trim()
  if (contactEmail && !EMAIL_REGEX.test(contactEmail)) {
    errors.push({
      row: rowNumber,
      column: 'contact_email',
      message: '聯絡人 Email 格式不正確',
      messageEn: 'Invalid contact email format',
    })
  }

  // 如果有錯誤，返回 null
  if (errors.length > 0) {
    return { data: null, errors }
  }

  // 組合驗證後的資料
  const data: CustomerImportRow = {
    name_zh: nameZh,
    name_en: String(normalizedRow['name_en'] || '').trim() || undefined,
    email: email || undefined,
    phone: String(normalizedRow['phone'] || '').trim() || undefined,
    fax: String(normalizedRow['fax'] || '').trim() || undefined,
    address_zh: String(normalizedRow['address_zh'] || '').trim() || undefined,
    address_en: String(normalizedRow['address_en'] || '').trim() || undefined,
    tax_id: String(normalizedRow['tax_id'] || '').trim() || undefined,
    contact_name: String(normalizedRow['contact_name'] || '').trim() || undefined,
    contact_phone: String(normalizedRow['contact_phone'] || '').trim() || undefined,
    contact_email: contactEmail || undefined,
    notes: String(normalizedRow['notes'] || '').trim() || undefined,
  }

  return { data, errors: [] }
}

/**
 * 批量驗證客戶匯入資料
 * @param rows - 解析後的資料行
 * @returns 驗證結果（有效行、無效行、所有錯誤）
 */
export function validateCustomerRows(
  rows: Record<string, unknown>[]
): {
  validRows: ParsedRow[]
  invalidRows: ParsedRow[]
  errors: ValidationError[]
} {
  const validRows: ParsedRow[] = []
  const invalidRows: ParsedRow[] = []
  const allErrors: ValidationError[] = []

  rows.forEach((row, index) => {
    const rowNumber = index + 1 // 行號從 1 開始（不含標題）
    const { data, errors } = validateCustomerRow(row, rowNumber)

    if (errors.length > 0) {
      invalidRows.push({
        _rowNumber: rowNumber,
        _errors: errors,
        ...row,
      })
      allErrors.push(...errors)
    } else if (data) {
      validRows.push({
        _rowNumber: rowNumber,
        ...data,
      })
    }
  })

  return { validRows, invalidRows, errors: allErrors }
}

/**
 * 將驗證後的資料轉換為 DAL 建立格式
 */
export function toCustomerCreateInput(row: CustomerImportRow) {
  return {
    name: {
      zh: row.name_zh,
      en: row.name_en || row.name_zh, // 英文名稱預設使用中文
    },
    email: row.email || null,
    phone: row.phone || null,
    fax: row.fax || null,
    address: row.address_zh || row.address_en
      ? {
          zh: row.address_zh || '',
          en: row.address_en || '',
        }
      : null,
    tax_id: row.tax_id || null,
    contact_person: row.contact_name || row.contact_phone || row.contact_email
      ? {
          name: row.contact_name || '',
          phone: row.contact_phone || '',
          email: row.contact_email || '',
        }
      : null,
    notes: row.notes || null,
  }
}
