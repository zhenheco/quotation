/**
 * 產品匯入資料驗證器
 */

import type { ValidationError, ProductImportRow, ParsedRow } from '../types'
import { getHeaderToKeyMap } from '../template-columns'

/** 支援的幣別列表 */
const VALID_CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY', 'HKD', 'GBP']

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
 * 驗證產品匯入資料行
 * @param row - 原始資料行
 * @param rowNumber - 資料行號（從 1 開始）
 * @returns 驗證結果
 */
export function validateProductRow(
  row: Record<string, unknown>,
  rowNumber: number
): { data: ProductImportRow | null; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const headerMap = getHeaderToKeyMap('products')

  // 轉換欄位名稱（支援中英文標題）
  const normalizedRow: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = headerMap.get(key) || key
    normalizedRow[normalizedKey] = value
  }

  // 必填：產品名稱（中文）
  const nameZh = String(normalizedRow['name_zh'] || '').trim()
  if (!nameZh) {
    errors.push({
      row: rowNumber,
      column: 'name_zh',
      message: '產品名稱(中)為必填欄位',
      messageEn: 'Product name (Chinese) is required',
    })
  }

  // 必填：售價
  const basePrice = parseNumber(normalizedRow['base_price'])
  if (basePrice === undefined) {
    errors.push({
      row: rowNumber,
      column: 'base_price',
      message: '售價為必填欄位，需為數字',
      messageEn: 'Price is required and must be a number',
    })
  } else if (basePrice < 0) {
    errors.push({
      row: rowNumber,
      column: 'base_price',
      message: '售價不可為負數',
      messageEn: 'Price cannot be negative',
    })
  }

  // 必填：幣別（有預設值 TWD）
  const baseCurrency = String(normalizedRow['base_currency'] || 'TWD').trim().toUpperCase()
  if (!VALID_CURRENCIES.includes(baseCurrency)) {
    errors.push({
      row: rowNumber,
      column: 'base_currency',
      message: `幣別無效，支援：${VALID_CURRENCIES.join(', ')}`,
      messageEn: `Invalid currency, supported: ${VALID_CURRENCIES.join(', ')}`,
    })
  }

  // 選填：成本價（如有填寫則驗證）
  const costPrice = parseNumber(normalizedRow['cost_price'])
  if (costPrice !== undefined && costPrice < 0) {
    errors.push({
      row: rowNumber,
      column: 'cost_price',
      message: '成本價不可為負數',
      messageEn: 'Cost price cannot be negative',
    })
  }

  // 選填：成本幣別（如有填寫則驗證）
  const costCurrency = normalizedRow['cost_currency']
    ? String(normalizedRow['cost_currency']).trim().toUpperCase()
    : undefined
  if (costCurrency && !VALID_CURRENCIES.includes(costCurrency)) {
    errors.push({
      row: rowNumber,
      column: 'cost_currency',
      message: `成本幣別無效，支援：${VALID_CURRENCIES.join(', ')}`,
      messageEn: `Invalid cost currency, supported: ${VALID_CURRENCIES.join(', ')}`,
    })
  }

  // 如果有錯誤，返回 null
  if (errors.length > 0) {
    return { data: null, errors }
  }

  // 組合驗證後的資料
  const data: ProductImportRow = {
    sku: String(normalizedRow['sku'] || '').trim() || undefined,
    name_zh: nameZh,
    name_en: String(normalizedRow['name_en'] || '').trim() || undefined,
    description_zh: String(normalizedRow['description_zh'] || '').trim() || undefined,
    description_en: String(normalizedRow['description_en'] || '').trim() || undefined,
    base_price: basePrice!,
    base_currency: baseCurrency,
    category: String(normalizedRow['category'] || '').trim() || undefined,
    cost_price: costPrice,
    cost_currency: costCurrency,
    unit: String(normalizedRow['unit'] || '').trim() || undefined,
    is_active: parseBoolean(normalizedRow['is_active']),
  }

  return { data, errors: [] }
}

/**
 * 批量驗證產品匯入資料
 * @param rows - 解析後的資料行
 * @returns 驗證結果（有效行、無效行、所有錯誤）
 */
export function validateProductRows(
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
    const { data, errors } = validateProductRow(row, rowNumber)

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
export function toProductCreateInput(row: ProductImportRow) {
  return {
    sku: row.sku || null,
    name: {
      zh: row.name_zh,
      en: row.name_en || row.name_zh,
    },
    description: row.description_zh || row.description_en
      ? {
          zh: row.description_zh || '',
          en: row.description_en || '',
        }
      : null,
    base_price: row.base_price,
    base_currency: row.base_currency,
    category: row.category || null,
    cost_price: row.cost_price ?? null,
    cost_currency: row.cost_currency || null,
    unit: row.unit || null,
    is_active: row.is_active ?? true,
  }
}
