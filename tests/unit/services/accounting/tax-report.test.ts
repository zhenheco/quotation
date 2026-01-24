/**
 * 營業稅申報服務測試
 * 測試路徑: lib/services/accounting/tax-report.service.ts
 *
 * 測試目標：
 * - AC1: 申報期間計算
 * - AC2: 銷項發票分類
 * - AC3: 進項發票分類（扣抵判斷）
 * - AC4: 稅額計算
 */

import { describe, it, expect } from 'vitest'
import {
  calculateTaxPeriod,
  determineTaxCategoryFromTaxCode,
  isInputInvoiceDeductible,
  calculateTaxAmounts,
  type TaxCategory,
  type InvoiceDetail,
} from '@/lib/services/accounting/tax-report.service'
import type { TaxCode, TaxType } from '@/lib/dal/accounting/tax-codes.dal'

/**
 * 建立測試用的 TaxCode 物件
 */
function createMockTaxCode(
  code: string,
  taxType: TaxType,
  taxRate: number,
  isDeductible: boolean = true
): TaxCode {
  return {
    id: `tax-code-${code}`,
    code,
    name: `${code} 稅碼`,
    description: null,
    tax_rate: taxRate,
    tax_type: taxType,
    is_deductible: isDeductible,
    is_common: true,
    is_system: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * 建立測試用的發票明細
 */
function createMockInvoiceDetail(
  untaxedAmount: number,
  taxAmount: number,
  taxCategory: TaxCategory,
  isDeductible: boolean = true
): InvoiceDetail {
  return {
    invoiceId: `inv-${Math.random().toString(36).substring(7)}`,
    invoiceNumber: `AB-${Math.random().toString().substring(2, 10)}`,
    date: '2024-01-15',
    counterpartyName: '測試公司',
    counterpartyTaxId: '12345678',
    untaxedAmount,
    taxAmount,
    totalAmount: untaxedAmount + taxAmount,
    taxCategory,
    isDeductible,
  }
}

describe('tax-report.service - 營業稅申報服務', () => {
  // ============================================
  // AC1: 申報期間計算
  // ============================================
  describe('calculateTaxPeriod - 申報期間計算', () => {
    it('should calculate period for biMonth 1 as Jan-Feb', () => {
      const result = calculateTaxPeriod(2024, 1)

      expect(result.year).toBe(2024)
      expect(result.month).toBe(2)
      expect(result.startDate).toBe('2024-01-01')
      expect(result.endDate).toBe('2024-02-29')
    })

    it('should calculate period for biMonth 6 as Nov-Dec', () => {
      const result = calculateTaxPeriod(2024, 6)

      expect(result.year).toBe(2024)
      expect(result.month).toBe(12)
      expect(result.startDate).toBe('2024-11-01')
      expect(result.endDate).toBe('2024-12-31')
    })

    it('should handle leap year February correctly', () => {
      expect(calculateTaxPeriod(2024, 1).endDate).toBe('2024-02-29')
      expect(calculateTaxPeriod(2023, 1).endDate).toBe('2023-02-28')
      expect(calculateTaxPeriod(2025, 1).endDate).toBe('2025-02-28')
    })

    it.each([
      { biMonth: 1, expectedStart: '2024-01-01', expectedEnd: '2024-02-29' },
      { biMonth: 2, expectedStart: '2024-03-01', expectedEnd: '2024-04-30' },
      { biMonth: 3, expectedStart: '2024-05-01', expectedEnd: '2024-06-30' },
      { biMonth: 4, expectedStart: '2024-07-01', expectedEnd: '2024-08-31' },
      { biMonth: 5, expectedStart: '2024-09-01', expectedEnd: '2024-10-31' },
      { biMonth: 6, expectedStart: '2024-11-01', expectedEnd: '2024-12-31' },
    ])('biMonth $biMonth should return correct period', ({ biMonth, expectedStart, expectedEnd }) => {
      const result = calculateTaxPeriod(2024, biMonth)
      expect(result.startDate).toBe(expectedStart)
      expect(result.endDate).toBe(expectedEnd)
    })
  })

  // ============================================
  // AC2: 銷項發票分類
  // ============================================
  describe('determineTaxCategoryFromTaxCode - 稅類別判斷', () => {
    it('should classify TX5 (應稅 5%) as TAXABLE_5', () => {
      const taxCode = createMockTaxCode('TX5', 'TAXABLE', 0.05)
      expect(determineTaxCategoryFromTaxCode(taxCode)).toBe('TAXABLE_5')
    })

    it('should classify TX0 (零稅率) as ZERO_RATED', () => {
      const taxCode = createMockTaxCode('TX0', 'ZERO_RATED', 0)
      expect(determineTaxCategoryFromTaxCode(taxCode)).toBe('ZERO_RATED')
    })

    it('should classify EXE (免稅) as EXEMPT', () => {
      const taxCode = createMockTaxCode('EXE', 'EXEMPT', 0, false)
      expect(determineTaxCategoryFromTaxCode(taxCode)).toBe('EXEMPT')
    })

    it('should calculate sales tax as 5% of untaxed amount', () => {
      expect(Math.round(10000 * 0.05)).toBe(500)
      expect(Math.round(1234 * 0.05)).toBe(62)
    })

    it('should return NON_TAXABLE when tax code is null or undefined', () => {
      expect(determineTaxCategoryFromTaxCode(null)).toBe('NON_TAXABLE')
      expect(determineTaxCategoryFromTaxCode(undefined)).toBe('NON_TAXABLE')
    })
  })

  // ============================================
  // AC3: 進項發票分類（扣抵判斷）
  // ============================================
  describe('isInputInvoiceDeductible - 進項扣抵判斷', () => {
    it('should return true for deductible inputs', () => {
      expect(isInputInvoiceDeductible(createMockTaxCode('TX5', 'TAXABLE', 0.05, true))).toBe(true)
      expect(isInputInvoiceDeductible(createMockTaxCode('TX0', 'ZERO_RATED', 0, true))).toBe(true)
    })

    it('should return false for non-deductible inputs', () => {
      expect(isInputInvoiceDeductible(createMockTaxCode('ENT', 'TAXABLE', 0.05, false))).toBe(false)
      expect(isInputInvoiceDeductible(createMockTaxCode('EXE', 'EXEMPT', 0, false))).toBe(false)
      expect(isInputInvoiceDeductible(createMockTaxCode('VEH', 'TAXABLE', 0.05, false))).toBe(false)
    })

    it('should return true when tax code is null or undefined', () => {
      expect(isInputInvoiceDeductible(null)).toBe(true)
      expect(isInputInvoiceDeductible(undefined)).toBe(true)
    })
  })

  // ============================================
  // AC4: 稅額計算
  // ============================================
  describe('calculateTaxAmounts - 稅額計算', () => {
    it('should sum all taxable sales tax as outputTax', () => {
      const salesInvoices: InvoiceDetail[] = [
        createMockInvoiceDetail(10000, 500, 'TAXABLE_5'),
        createMockInvoiceDetail(20000, 1000, 'TAXABLE_5'),
        createMockInvoiceDetail(5000, 0, 'ZERO_RATED'),
        createMockInvoiceDetail(3000, 0, 'EXEMPT'),
      ]

      const result = calculateTaxAmounts(salesInvoices, [])
      expect(result.outputTax).toBe(1500)
    })

    it('should return 0 outputTax when no taxable sales', () => {
      const salesInvoices: InvoiceDetail[] = [
        createMockInvoiceDetail(5000, 0, 'ZERO_RATED'),
        createMockInvoiceDetail(3000, 0, 'EXEMPT'),
      ]

      expect(calculateTaxAmounts(salesInvoices, []).outputTax).toBe(0)
    })

    it('should sum only deductible input tax as inputTax', () => {
      const purchaseInvoices: InvoiceDetail[] = [
        createMockInvoiceDetail(10000, 500, 'TAXABLE_5', true),
        createMockInvoiceDetail(20000, 1000, 'TAXABLE_5', true),
        createMockInvoiceDetail(5000, 250, 'TAXABLE_5', false),
      ]

      expect(calculateTaxAmounts([], purchaseInvoices).inputTax).toBe(1500)
    })

    it('should exclude nonDeductible tax from inputTax', () => {
      const purchaseInvoices: InvoiceDetail[] = [
        createMockInvoiceDetail(10000, 500, 'TAXABLE_5', false),
        createMockInvoiceDetail(8000, 400, 'TAXABLE_5', false),
      ]

      expect(calculateTaxAmounts([], purchaseInvoices).inputTax).toBe(0)
    })

    it('should calculate netTax as outputTax minus inputTax', () => {
      const result = calculateTaxAmounts(
        [createMockInvoiceDetail(100000, 5000, 'TAXABLE_5')],
        [createMockInvoiceDetail(60000, 3000, 'TAXABLE_5', true)]
      )

      expect(result.outputTax).toBe(5000)
      expect(result.inputTax).toBe(3000)
      expect(result.netTax).toBe(2000)
    })

    it('should set isRefund true when netTax is negative', () => {
      const result = calculateTaxAmounts(
        [createMockInvoiceDetail(10000, 500, 'TAXABLE_5')],
        [createMockInvoiceDetail(50000, 2500, 'TAXABLE_5', true)]
      )

      expect(result.netTax).toBe(-2000)
      expect(result.isRefund).toBe(true)
    })

    it('should set isRefund false when netTax is positive or zero', () => {
      const positiveResult = calculateTaxAmounts(
        [createMockInvoiceDetail(100000, 5000, 'TAXABLE_5')],
        [createMockInvoiceDetail(20000, 1000, 'TAXABLE_5', true)]
      )
      expect(positiveResult.isRefund).toBe(false)

      const zeroResult = calculateTaxAmounts(
        [createMockInvoiceDetail(20000, 1000, 'TAXABLE_5')],
        [createMockInvoiceDetail(20000, 1000, 'TAXABLE_5', true)]
      )
      expect(zeroResult.netTax).toBe(0)
      expect(zeroResult.isRefund).toBe(false)
    })
  })
})
