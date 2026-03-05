/**
 * 發票匯入資料驗證器
 * 整合 mof-excel-parser.ts 的民國年解析邏輯
 */

import type { ValidationError, ParsedRow } from '../types'
import { parseRocDate } from '@/lib/services/accounting/mof-excel-parser'
import { MOF_PURCHASE_COLUMNS, MOF_SALES_COLUMNS } from '@/lib/services/accounting/mof-excel-parser'

// ============================================
// 輔助函數
// ============================================

/** 統一編號驗證（8 碼數字） */
const TAX_ID_REGEX = /^\d{8}$/

/** 解析金額（支援千分位） */
function parseAmount(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return value
  const str = String(value).replace(/,/g, '').trim()
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

/** 解析日期（支援民國年 + 西元年） */
function parseDate(value: unknown): string | null {
  if (!value) return null
  const str = String(value).trim()
  if (!str) return null

  // 嘗試民國年格式
  const rocResult = parseRocDate(str)
  if (rocResult) return rocResult

  // 嘗試西元年格式：YYYY-MM-DD 或 YYYY/MM/DD
  const westernMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (westernMatch) {
    const [, y, m, d] = westernMatch
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  return null
}

// ============================================
// 公開 API
// ============================================

/**
 * 偵測進項/銷項（依 CSV 標題）
 * 含「賣方」→ 進項（INPUT）
 * 含「買方」→ 銷項（OUTPUT）
 */
export function detectInvoiceType(
  headers: string[],
): 'INPUT' | 'OUTPUT' | null {
  const headerStr = headers.join(',')

  // 檢查是否含進項標題關鍵字
  const purchaseKeywords = MOF_PURCHASE_COLUMNS.sellerTaxId
  if (purchaseKeywords.some((kw) => headerStr.includes(kw))) {
    return 'INPUT'
  }

  // 檢查是否含銷項標題關鍵字
  const salesKeywords = MOF_SALES_COLUMNS.buyerTaxId
  if (salesKeywords.some((kw) => headerStr.includes(kw))) {
    return 'OUTPUT'
  }

  return null
}

/**
 * 推論課稅別
 * 依 tax_amount / untaxed_amount 比率判斷
 */
export function inferTaxCategory(
  untaxedAmount: number,
  taxAmount: number,
): 'TAXABLE_5' | 'ZERO_RATED' | 'EXEMPT' {
  // 金額為 0 → 免稅
  if (untaxedAmount === 0 && taxAmount === 0) return 'EXEMPT'

  // 稅額為 0 但金額不為 0 → 零稅率
  if (taxAmount === 0 && untaxedAmount !== 0) return 'ZERO_RATED'

  // 計算比率（用絕對值，因為折讓是負數）
  const absUntaxed = Math.abs(untaxedAmount)
  const absTax = Math.abs(taxAmount)

  if (absUntaxed === 0) return 'EXEMPT'

  // 5% 稅率容差 ±2 元
  const expected = Math.round(absUntaxed * 0.05)
  if (Math.abs(absTax - expected) <= 2) return 'TAXABLE_5'

  // 無法判斷，預設應稅
  return 'TAXABLE_5'
}

/**
 * 正規化扣抵代號
 * Y/N + 固定資產 → 1/2/3/4
 */
export function normalizeDeductionCode(
  deductible: string | undefined,
  isFixedAsset: boolean,
): number {
  const d = (deductible || '').trim().toUpperCase()
  const isDeductible = d !== 'N'

  if (isDeductible && !isFixedAsset) return 1  // 可扣抵 - 費用
  if (!isDeductible && !isFixedAsset) return 2 // 不可扣抵
  if (isDeductible && isFixedAsset) return 3   // 可扣抵 - 固定資產
  return 4                                      // 不可扣抵 - 固定資產
}

/**
 * 驗證發票匯入資料
 */
export function validateInvoiceRows(
  data: Record<string, unknown>[],
): {
  validRows: ParsedRow[]
  invalidRows: ParsedRow[]
  errors: ValidationError[]
} {
  const validRows: ParsedRow[] = []
  const invalidRows: ParsedRow[] = []
  const allErrors: ValidationError[] = []

  data.forEach((row, index) => {
    const rowNumber = index + 1
    const rowErrors: ValidationError[] = []

    // 必填：發票號碼
    const number = String(row.number || '').trim()
    if (!number) {
      rowErrors.push({
        row: rowNumber,
        column: 'number',
        message: '發票號碼為必填欄位',
        messageEn: 'Invoice number is required',
      })
    }

    // 必填：日期
    const rawDate = String(row.date || '').trim()
    const parsedDate = rawDate ? parseDate(rawDate) : null
    if (!rawDate) {
      rowErrors.push({
        row: rowNumber,
        column: 'date',
        message: '發票日期為必填欄位',
        messageEn: 'Invoice date is required',
      })
    } else if (!parsedDate) {
      rowErrors.push({
        row: rowNumber,
        column: 'date',
        message: `日期格式錯誤 (原始值: ${rawDate})`,
        messageEn: `Invalid date format (original: ${rawDate})`,
      })
    }

    // 必填：未稅金額
    const untaxedAmount = parseAmount(row.untaxed_amount)
    if (untaxedAmount === null) {
      rowErrors.push({
        row: rowNumber,
        column: 'untaxed_amount',
        message: '未稅金額為必填欄位',
        messageEn: 'Untaxed amount is required',
      })
    }

    // 選填：稅額
    const taxAmount = parseAmount(row.tax_amount) ?? 0

    // 選填：統一編號
    const counterpartyTaxId = String(row.counterparty_tax_id || '').trim()
    if (counterpartyTaxId && !TAX_ID_REGEX.test(counterpartyTaxId)) {
      rowErrors.push({
        row: rowNumber,
        column: 'counterparty_tax_id',
        message: `統一編號格式錯誤，需 8 碼數字 (原始值: ${counterpartyTaxId})`,
        messageEn: `Tax ID must be 8 digits (original: ${counterpartyTaxId})`,
      })
    }

    // 選填：交易對象名稱
    const counterpartyName = String(row.counterparty_name || '').trim()

    // 選填：可扣抵
    const deductible = String(row.deductible || '').trim()

    // 選填：固定資產
    const rawFixedAsset = String(row.is_fixed_asset || '').trim().toUpperCase()
    const isFixedAsset = rawFixedAsset === 'Y'

    // 選填：備註
    const description = String(row.description || '').trim()

    if (rowErrors.length > 0) {
      allErrors.push(...rowErrors)
      invalidRows.push({
        _rowNumber: rowNumber,
        _errors: rowErrors,
        ...row,
      })
    } else {
      // 推論課稅別和扣抵代號
      const taxCategory = inferTaxCategory(untaxedAmount!, taxAmount)
      const deductionCode = normalizeDeductionCode(deductible, isFixedAsset)

      validRows.push({
        _rowNumber: rowNumber,
        number,
        date: parsedDate!,
        untaxed_amount: untaxedAmount!,
        tax_amount: taxAmount,
        total_amount: untaxedAmount! + taxAmount,
        counterparty_tax_id: counterpartyTaxId || null,
        counterparty_name: counterpartyName || null,
        deductible,
        is_fixed_asset: isFixedAsset,
        deduction_code: deductionCode,
        tax_category: taxCategory,
        description: description || null,
      })
    }
  })

  return { validRows, invalidRows, errors: allErrors }
}
