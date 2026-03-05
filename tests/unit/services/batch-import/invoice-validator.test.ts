/**
 * 發票匯入驗證器 — 單元測試
 * Phase 2 Step 1-2
 */
import { describe, it, expect } from 'vitest'
import { getColumnsForResource } from '@/lib/services/batch-import/template-columns'
import {
  validateInvoiceRows,
  detectInvoiceType,
  inferTaxCategory,
  normalizeDeductionCode,
} from '@/lib/services/batch-import/validators/invoice-validator'

// ============================================
// Step 1: 欄位定義
// ============================================

describe('getColumnsForResource("invoices")', () => {
  it('should return invoice columns', () => {
    const columns = getColumnsForResource('invoices')
    expect(columns.length).toBeGreaterThan(0)
  })

  it('should include required fields: number, date, untaxed_amount', () => {
    const columns = getColumnsForResource('invoices')
    const requiredKeys = columns
      .filter((c) => c.required)
      .map((c) => c.key)
    expect(requiredKeys).toContain('number')
    expect(requiredKeys).toContain('date')
    expect(requiredKeys).toContain('untaxed_amount')
  })

  it('should include optional fields: tax_amount, counterparty_tax_id, deductible', () => {
    const columns = getColumnsForResource('invoices')
    const keys = columns.map((c) => c.key)
    expect(keys).toContain('tax_amount')
    expect(keys).toContain('counterparty_tax_id')
    expect(keys).toContain('counterparty_name')
    expect(keys).toContain('deductible')
  })
})

// ============================================
// Step 2: 驗證器
// ============================================

describe('detectInvoiceType', () => {
  it('should detect INPUT from headers with 賣方統編', () => {
    const headers = ['發票號碼', '發票日期', '賣方統一編號', '賣方名稱', '銷售額', '稅額']
    expect(detectInvoiceType(headers)).toBe('INPUT')
  })

  it('should detect OUTPUT from headers with 買方統編', () => {
    const headers = ['發票號碼', '發票日期', '買方統一編號', '買方名稱', '銷售額', '稅額']
    expect(detectInvoiceType(headers)).toBe('OUTPUT')
  })

  it('should return null for unknown headers', () => {
    const headers = ['number', 'date', 'amount']
    expect(detectInvoiceType(headers)).toBeNull()
  })
})

describe('inferTaxCategory', () => {
  it('should infer TAXABLE_5 when tax ≈ 5% of untaxed', () => {
    // 10000 * 0.05 = 500
    expect(inferTaxCategory(10000, 500)).toBe('TAXABLE_5')
  })

  it('should infer TAXABLE_5 with rounding tolerance', () => {
    // 9999 * 0.05 = 499.95, rounded to 500
    expect(inferTaxCategory(9999, 500)).toBe('TAXABLE_5')
  })

  it('should infer ZERO_RATED when tax=0 and untaxed>0', () => {
    expect(inferTaxCategory(50000, 0)).toBe('ZERO_RATED')
  })

  it('should infer EXEMPT when untaxed=0 and tax=0', () => {
    expect(inferTaxCategory(0, 0)).toBe('EXEMPT')
  })

  it('should infer TAXABLE_5 for negative amounts (return/allowance)', () => {
    // -5000 * 0.05 = -250
    expect(inferTaxCategory(-5000, -250)).toBe('TAXABLE_5')
  })
})

describe('normalizeDeductionCode', () => {
  it('should return 1 for deductible=Y (費用)', () => {
    expect(normalizeDeductionCode('Y', false)).toBe(1)
  })

  it('should return 2 for deductible=N (不可扣抵)', () => {
    expect(normalizeDeductionCode('N', false)).toBe(2)
  })

  it('should return 3 for deductible=Y + fixed asset', () => {
    expect(normalizeDeductionCode('Y', true)).toBe(3)
  })

  it('should return 4 for deductible=N + fixed asset', () => {
    expect(normalizeDeductionCode('N', true)).toBe(4)
  })

  it('should handle lowercase y/n', () => {
    expect(normalizeDeductionCode('y', false)).toBe(1)
    expect(normalizeDeductionCode('n', false)).toBe(2)
  })

  it('should default to 1 when empty', () => {
    expect(normalizeDeductionCode('', false)).toBe(1)
    expect(normalizeDeductionCode(undefined, false)).toBe(1)
  })
})

describe('validateInvoiceRows', () => {
  const validRow = {
    number: 'AB-12345678',
    date: '2024-03-06',
    untaxed_amount: 10000,
    tax_amount: 500,
    counterparty_tax_id: '12345678',
    counterparty_name: '測試公司',
    deductible: 'Y',
  }

  it('should pass valid rows', () => {
    const { validRows, invalidRows, errors } = validateInvoiceRows([validRow])
    expect(validRows).toHaveLength(1)
    expect(invalidRows).toHaveLength(0)
    expect(errors).toHaveLength(0)
  })

  it('should fail when required field "number" is missing', () => {
    const { validRows, errors } = validateInvoiceRows([
      { ...validRow, number: '' },
    ])
    expect(validRows).toHaveLength(0)
    expect(errors.some((e) => e.column === 'number')).toBe(true)
  })

  it('should fail when required field "date" is missing', () => {
    const { validRows, errors } = validateInvoiceRows([
      { ...validRow, date: '' },
    ])
    expect(validRows).toHaveLength(0)
    expect(errors.some((e) => e.column === 'date')).toBe(true)
  })

  it('should fail when required field "untaxed_amount" is missing', () => {
    const { validRows, errors } = validateInvoiceRows([
      { ...validRow, untaxed_amount: undefined },
    ])
    expect(validRows).toHaveLength(0)
    expect(errors.some((e) => e.column === 'untaxed_amount')).toBe(true)
  })

  // 民國年日期轉換
  it('should convert ROC date 113/03/06 to 2024-03-06', () => {
    const { validRows } = validateInvoiceRows([
      { ...validRow, date: '113/03/06' },
    ])
    expect(validRows).toHaveLength(1)
    expect(validRows[0].date).toBe('2024-03-06')
  })

  it('should convert ROC date 1130306 to 2024-03-06', () => {
    const { validRows } = validateInvoiceRows([
      { ...validRow, date: '1130306' },
    ])
    expect(validRows).toHaveLength(1)
    expect(validRows[0].date).toBe('2024-03-06')
  })

  it('should accept western date 2024-03-06 as-is', () => {
    const { validRows } = validateInvoiceRows([validRow])
    expect(validRows).toHaveLength(1)
    expect(validRows[0].date).toBe('2024-03-06')
  })

  it('should accept date with slash format 2024/03/06', () => {
    const { validRows } = validateInvoiceRows([
      { ...validRow, date: '2024/03/06' },
    ])
    expect(validRows).toHaveLength(1)
    expect(validRows[0].date).toBe('2024-03-06')
  })

  // 統一編號驗證
  it('should fail when tax_id is not 8 digits', () => {
    const { errors } = validateInvoiceRows([
      { ...validRow, counterparty_tax_id: '1234' },
    ])
    expect(errors.some((e) => e.column === 'counterparty_tax_id')).toBe(true)
  })

  it('should accept empty tax_id (optional)', () => {
    const { validRows } = validateInvoiceRows([
      { ...validRow, counterparty_tax_id: '' },
    ])
    expect(validRows).toHaveLength(1)
  })

  // 金額千分位
  it('should handle comma-separated amounts', () => {
    const { validRows } = validateInvoiceRows([
      { ...validRow, untaxed_amount: '100,000', tax_amount: '5,000' },
    ])
    expect(validRows).toHaveLength(1)
    expect(validRows[0].untaxed_amount).toBe(100000)
    expect(validRows[0].tax_amount).toBe(5000)
  })

  // 負數折讓
  it('should accept negative amounts for return/allowance', () => {
    const { validRows } = validateInvoiceRows([
      { ...validRow, untaxed_amount: -5000, tax_amount: -250 },
    ])
    expect(validRows).toHaveLength(1)
    expect(validRows[0].untaxed_amount).toBe(-5000)
  })

  // 驗證錯誤含原始值
  it('should include original value in error message', () => {
    const { errors } = validateInvoiceRows([
      { ...validRow, date: 'invalid-date' },
    ])
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('invalid-date')
  })

  // 自動推論課稅別
  it('should infer tax_category as TAXABLE_5', () => {
    const { validRows } = validateInvoiceRows([validRow])
    expect(validRows[0].tax_category).toBe('TAXABLE_5')
  })

  // 扣抵代號
  it('should normalize deduction code from Y/N', () => {
    const { validRows } = validateInvoiceRows([validRow])
    expect(validRows[0].deduction_code).toBe(1)
  })
})
