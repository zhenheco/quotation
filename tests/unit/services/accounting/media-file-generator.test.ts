/**
 * 401 媒體申報檔產生器測試
 * 測試路徑: lib/services/accounting/media-file-generator.ts
 *
 * 測試目標：
 * - AC5.2: 格式代號正確（銷項 35、進項 25）
 * - AC5.3: 金額欄位格式（無小數點，右靠左補零）
 * - AC5.4: 統一編號欄位 8 碼
 */

import { describe, it, expect } from 'vitest'
import {
  FORMAT_CODES,
  RECORD_LENGTH,
  padNumber,
  padText,
  cleanInvoiceNumber,
  getTaxTypeCode,
  getDeductionCode,
  generateMediaLine,
  generateMediaFile,
  validateMediaFile,
  formatYearMonth,
  toRocYear,
  type MediaInvoiceData,
  type MediaFileOptions,
} from '@/lib/services/accounting/media-file-generator'

describe('media-file-generator - 401 媒體申報檔產生器', () => {
  // ============================================
  // AC5.2: 格式代號
  // ============================================
  describe('FORMAT_CODES - 格式代號', () => {
    it.each([
      { type: 'OUTPUT', format: 'E_INVOICE', expected: '35' },
      { type: 'OUTPUT', format: 'THREE_COPY', expected: '31' },
      { type: 'INPUT', format: 'E_INVOICE', expected: '25' },
      { type: 'INPUT', format: 'THREE_COPY', expected: '21' },
    ])('should have format code $expected for $type $format', ({ type, format, expected }) => {
      expect(FORMAT_CODES[type as 'INPUT' | 'OUTPUT'][format as 'E_INVOICE' | 'THREE_COPY']).toBe(expected)
    })
  })

  // ============================================
  // AC5.3: 金額格式化
  // ============================================
  describe('padNumber - 數字格式化（右靠左補零）', () => {
    it('should format amounts without decimal, right-aligned', () => {
      expect(padNumber(1234, 12)).toBe('000000001234')
    })

    it('should format zero correctly', () => {
      expect(padNumber(0, 12)).toBe('000000000000')
    })

    it('should handle large numbers', () => {
      expect(padNumber(999999999999, 12)).toBe('999999999999')
    })

    it('should round decimal numbers', () => {
      expect(padNumber(1234.56, 12)).toBe('000000001235')
    })

    it('should handle negative numbers by using absolute value', () => {
      expect(padNumber(-1234, 12)).toBe('000000001234')
    })
  })

  // ============================================
  // AC5.4: 統一編號格式
  // ============================================
  describe('padText - 文字格式化', () => {
    it('should pad tax ID to 8 digits', () => {
      expect(padText('12345678', 8)).toBe('12345678')
    })

    it('should pad shorter tax ID with spaces', () => {
      expect(padText('1234', 8)).toBe('1234    ')
    })

    it('should truncate longer text to specified length', () => {
      expect(padText('123456789', 8)).toBe('12345678')
    })

    it('should handle empty string', () => {
      expect(padText('', 8)).toBe('        ')
    })

    it('should handle null/undefined by treating as empty', () => {
      expect(padText(null as unknown as string, 8)).toBe('        ')
      expect(padText(undefined as unknown as string, 8)).toBe('        ')
    })
  })

  describe('cleanInvoiceNumber - 發票號碼清理', () => {
    it('should remove dash from invoice number', () => {
      expect(cleanInvoiceNumber('AB-12345678')).toBe('AB12345678')
    })

    it('should remove spaces from invoice number', () => {
      expect(cleanInvoiceNumber('AB 12345678')).toBe('AB12345678')
    })

    it('should keep clean invoice number unchanged', () => {
      expect(cleanInvoiceNumber('AB12345678')).toBe('AB12345678')
    })
  })

  describe('formatYearMonth - 年月格式化', () => {
    it('should format year and month to ROC format (民國年3碼+月2碼)', () => {
      expect(formatYearMonth(2024, 12)).toBe('11312')
    })

    it('should pad single-digit month', () => {
      expect(formatYearMonth(2024, 1)).toBe('11301')
    })

    it('should handle year 2025', () => {
      expect(formatYearMonth(2025, 6)).toBe('11406')
    })
  })

  describe('toRocYear - 西元年轉民國年', () => {
    it('should convert western year to ROC year', () => {
      expect(toRocYear(2024)).toBe(113)
    })

    it('should convert 1912 to ROC year 1', () => {
      expect(toRocYear(1912)).toBe(1)
    })
  })

  // ============================================
  // 課稅別與扣抵代號
  // ============================================
  describe('getTaxTypeCode - 課稅別代碼', () => {
    it.each([
      { category: 'TAXABLE_5' as const, expected: '1' },
      { category: 'ZERO_RATED' as const, expected: '2' },
      { category: 'EXEMPT' as const, expected: '3' },
    ])('should return $expected for $category', ({ category, expected }) => {
      expect(getTaxTypeCode(category)).toBe(expected)
    })
  })

  describe('getDeductionCode - 扣抵代號', () => {
    it.each([
      { deductible: true, fixedAsset: false, expected: '1', desc: 'deductible non-fixed-asset' },
      { deductible: false, fixedAsset: false, expected: '2', desc: 'non-deductible non-fixed-asset' },
      { deductible: true, fixedAsset: true, expected: '3', desc: 'deductible fixed-asset' },
      { deductible: false, fixedAsset: true, expected: '4', desc: 'non-deductible fixed-asset' },
    ])('should return $expected for $desc', ({ deductible, fixedAsset, expected }) => {
      expect(getDeductionCode(deductible, fixedAsset)).toBe(expected)
    })
  })

  // ============================================
  // 媒體檔產生
  // ============================================
  describe('generateMediaLine - 產生單筆媒體檔記錄', () => {
    const baseOptions: MediaFileOptions = {
      taxRegistrationNumber: '123456780',
      year: 2024,
      biMonth: 1,
    }

    it('should generate exactly 81 bytes per record', () => {
      const invoice: MediaInvoiceData = {
        type: 'OUTPUT',
        invoiceNumber: 'AB-12345678',
        date: '2024-01-15',
        counterpartyTaxId: '87654321',
        untaxedAmount: 10000,
        taxAmount: 500,
        taxCategory: 'TAXABLE_5',
      }

      const line = generateMediaLine(invoice, baseOptions, 1)
      expect(line.length).toBe(RECORD_LENGTH)
    })

    it('should use format code 35 for output e-invoice', () => {
      const invoice: MediaInvoiceData = {
        type: 'OUTPUT',
        invoiceNumber: 'AB-12345678',
        date: '2024-01-15',
        counterpartyTaxId: '87654321',
        untaxedAmount: 10000,
        taxAmount: 500,
        taxCategory: 'TAXABLE_5',
      }

      const line = generateMediaLine(invoice, baseOptions, 1)
      expect(line.substring(0, 2)).toBe('35')
    })

    it('should use format code 25 for input e-invoice', () => {
      const invoice: MediaInvoiceData = {
        type: 'INPUT',
        invoiceNumber: 'CD-87654321',
        date: '2024-01-20',
        counterpartyTaxId: '11223344',
        untaxedAmount: 5000,
        taxAmount: 250,
        taxCategory: 'TAXABLE_5',
        isDeductible: true,
      }

      const line = generateMediaLine(invoice, baseOptions, 1)
      expect(line.substring(0, 2)).toBe('25')
    })

    it('should format sales amount as 12-digit right-aligned zeros', () => {
      const invoice: MediaInvoiceData = {
        type: 'OUTPUT',
        invoiceNumber: 'AB-12345678',
        date: '2024-01-15',
        counterpartyTaxId: '87654321',
        untaxedAmount: 12345,
        taxAmount: 617,
        taxCategory: 'TAXABLE_5',
      }

      const line = generateMediaLine(invoice, baseOptions, 1)
      // 銷售額位置: 50-61 (0-indexed: 49-61)
      const salesAmount = line.substring(49, 61)
      expect(salesAmount).toBe('000000012345')
    })
  })

  describe('generateMediaFile - 產生完整媒體檔', () => {
    it('should generate media file with correct statistics', () => {
      const invoices: MediaInvoiceData[] = [
        {
          type: 'OUTPUT',
          invoiceNumber: 'AB-12345678',
          date: '2024-01-15',
          counterpartyTaxId: '87654321',
          untaxedAmount: 10000,
          taxAmount: 500,
          taxCategory: 'TAXABLE_5',
        },
        {
          type: 'INPUT',
          invoiceNumber: 'CD-87654321',
          date: '2024-01-20',
          counterpartyTaxId: '11223344',
          untaxedAmount: 5000,
          taxAmount: 250,
          taxCategory: 'TAXABLE_5',
          isDeductible: true,
        },
      ]

      const options: MediaFileOptions = {
        taxRegistrationNumber: '123456780',
        year: 2024,
        biMonth: 1,
      }

      const result = generateMediaFile(invoices, options)

      expect(result.recordCount).toBe(2)
      expect(result.outputCount).toBe(1)
      expect(result.inputCount).toBe(1)
      expect(result.outputAmount).toBe(10000)
      expect(result.inputAmount).toBe(5000)
      expect(result.outputTax).toBe(500)
      expect(result.inputTax).toBe(250)
      expect(result.content.length).toBe(RECORD_LENGTH * 2)
    })
  })

  describe('validateMediaFile - 驗證媒體檔格式', () => {
    it('should return valid for empty content', () => {
      const result = validateMediaFile('')
      expect(result.valid).toBe(true)
      expect(result.recordCount).toBe(0)
    })

    it('should return invalid for incorrect length', () => {
      const result = validateMediaFile('short')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
