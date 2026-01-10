/**
 * 供應商匯入資料驗證器
 */

import type { ValidationError, SupplierImportRow, ParsedRow } from '../types'
import { getHeaderToKeyMap } from '../template-columns'

/** Email 驗證正則表達式 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 解析布林值
 */
function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const str = String(value).trim().toLowerCase()
  if (['true', '是', 'yes', '1', 'y'].includes(str)) {
    return true
  }
  if (['false', '否', 'no', '0', 'n'].includes(str)) {
    return false
  }
  return undefined
}

/**
 * 解析數字
 */
function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value).trim())
  return isNaN(num) ? undefined : num
}

/**
 * 驗證供應商匯入資料行
 * @param row - 原始資料行
 * @param rowNumber - 資料行號（從 1 開始）
 * @returns 驗證結果
 */
export function validateSupplierRow(
  row: Record<string, unknown>,
  rowNumber: number
): { data: SupplierImportRow | null; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const headerMap = getHeaderToKeyMap('suppliers')

  // 轉換欄位名稱（支援中英文標題）
  const normalizedRow: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = headerMap.get(key) || key
    normalizedRow[normalizedKey] = value
  }

  // 必填：供應商名稱（中文）
  const nameZh = String(normalizedRow['name_zh'] || '').trim()
  if (!nameZh) {
    errors.push({
      row: rowNumber,
      column: 'name_zh',
      message: '供應商名稱(中)為必填欄位',
      messageEn: 'Supplier name (Chinese) is required',
    })
  }

  // 選填：公司 Email（如有填寫則驗證格式）
  const email = String(normalizedRow['email'] || '').trim()
  if (email && !EMAIL_REGEX.test(email)) {
    errors.push({
      row: rowNumber,
      column: 'email',
      message: '公司 Email 格式不正確',
      messageEn: 'Invalid company email format',
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

  // 選填：付款天數（如有填寫則驗證）
  const paymentDays = parseNumber(normalizedRow['payment_days'])
  if (paymentDays !== undefined && paymentDays < 0) {
    errors.push({
      row: rowNumber,
      column: 'payment_days',
      message: '付款天數不可為負數',
      messageEn: 'Payment days cannot be negative',
    })
  }

  // 如果有錯誤，返回 null
  if (errors.length > 0) {
    return { data: null, errors }
  }

  // 組合驗證後的資料
  const data: SupplierImportRow = {
    name_zh: nameZh,
    name_en: String(normalizedRow['name_en'] || '').trim() || undefined,
    code: String(normalizedRow['code'] || '').trim() || undefined,
    contact_name: String(normalizedRow['contact_name'] || '').trim() || undefined,
    contact_phone: String(normalizedRow['contact_phone'] || '').trim() || undefined,
    contact_email: contactEmail || undefined,
    phone: String(normalizedRow['phone'] || '').trim() || undefined,
    email: email || undefined,
    fax: String(normalizedRow['fax'] || '').trim() || undefined,
    address_zh: String(normalizedRow['address_zh'] || '').trim() || undefined,
    address_en: String(normalizedRow['address_en'] || '').trim() || undefined,
    website: String(normalizedRow['website'] || '').trim() || undefined,
    tax_id: String(normalizedRow['tax_id'] || '').trim() || undefined,
    payment_terms: String(normalizedRow['payment_terms'] || '').trim() || undefined,
    payment_days: paymentDays,
    bank_name: String(normalizedRow['bank_name'] || '').trim() || undefined,
    bank_account: String(normalizedRow['bank_account'] || '').trim() || undefined,
    is_active: parseBoolean(normalizedRow['is_active']),
    notes: String(normalizedRow['notes'] || '').trim() || undefined,
  }

  return { data, errors: [] }
}

/**
 * 批量驗證供應商匯入資料
 * @param rows - 解析後的資料行
 * @returns 驗證結果（有效行、無效行、所有錯誤）
 */
export function validateSupplierRows(
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
    const rowNumber = index + 1
    const { data, errors } = validateSupplierRow(row, rowNumber)

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
export function toSupplierCreateInput(row: SupplierImportRow) {
  return {
    name: {
      zh: row.name_zh,
      en: row.name_en || row.name_zh,
    },
    code: row.code || null,
    contact_person: row.contact_name || row.contact_phone || row.contact_email
      ? {
          name: row.contact_name || '',
          phone: row.contact_phone || '',
          email: row.contact_email || '',
        }
      : null,
    phone: row.phone || null,
    email: row.email || null,
    fax: row.fax || null,
    address: row.address_zh || row.address_en
      ? {
          zh: row.address_zh || '',
          en: row.address_en || '',
        }
      : null,
    website: row.website || null,
    tax_id: row.tax_id || null,
    payment_terms: row.payment_terms || null,
    payment_days: row.payment_days ?? null,
    bank_name: row.bank_name || null,
    bank_account: row.bank_account || null,
    is_active: row.is_active ?? true,
    notes: row.notes || null,
  }
}
