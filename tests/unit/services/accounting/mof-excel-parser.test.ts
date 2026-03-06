/**
 * 財政部電子發票 Excel 解析器測試
 * 測試路徑: lib/services/accounting/mof-excel-parser.ts
 *
 * 測試目標：
 * - AC6.1: 民國年日期解析 (113/12/15 → 2024-12-15)
 * - AC6.2: 重複發票號碼偵測
 * - AC6.3: 負數金額處理（折讓發票）
 */

import { describe, it, expect } from 'vitest'
import {
  parseRocDate,
  parseWesternDate,
  parseExcelDateSerial,
  parseDate,
  parseAmount,
  rocToWesternYear,
  parseMofExcel,
  parseMofAllInvoiceRow,
  detectImportMode,
  findColumnValue,
  validateMofParseResult,
  type MofParseResult,
} from '@/lib/services/accounting/mof-excel-parser'

describe('mof-excel-parser - 財政部電子發票 Excel 解析器', () => {
  // ============================================
  // AC6.1: 民國年日期解析
  // ============================================
  describe('parseRocDate - 民國年日期解析', () => {
    it.each([
      { input: '113/12/15', expected: '2024-12-15' },
      { input: '113-12-15', expected: '2024-12-15' },
      { input: '1131215', expected: '2024-12-15' },
      { input: '113/1/5', expected: '2024-01-05' },
    ])('should parse "$input" as $expected', ({ input, expected }) => {
      expect(parseRocDate(input)).toBe(expected)
    })

    it.each(['invalid', '2024/12/15'])('should return null for "%s"', (input) => {
      expect(parseRocDate(input)).toBeNull()
    })
  })

  describe('parseWesternDate - 西元年日期解析', () => {
    it.each([
      { input: '2024/12/15', expected: '2024-12-15' },
      { input: '2024-12-15', expected: '2024-12-15' },
      { input: '2024/1/5', expected: '2024-01-05' },
    ])('should parse "$input" as $expected', ({ input, expected }) => {
      expect(parseWesternDate(input)).toBe(expected)
    })
  })

  describe('parseExcelDateSerial - Excel 日期序號解析', () => {
    it('should parse Excel date serial 45292 as 2024-01-01', () => {
      expect(parseExcelDateSerial(45292)).toBe('2024-01-01')
    })

    it.each([0, -1, 100001])('should return null for invalid serial %d', (serial) => {
      expect(parseExcelDateSerial(serial)).toBeNull()
    })
  })

  describe('parseDate - 智慧日期解析', () => {
    it.each([null, undefined, ''])('should return null for %s', (value) => {
      expect(parseDate(value)).toBeNull()
    })

    it.each([
      { input: new Date(2024, 11, 15), expected: '2024-12-15', desc: 'Date object' },
      { input: '2024-12-15', expected: '2024-12-15', desc: 'correct format' },
      { input: '113/12/15', expected: '2024-12-15', desc: 'ROC year format' },
      { input: '2024/12/15', expected: '2024-12-15', desc: 'western year format' },
      { input: 45292, expected: '2024-01-01', desc: 'Excel serial number' },
    ])('should parse $desc correctly', ({ input, expected }) => {
      expect(parseDate(input)).toBe(expected)
    })
  })

  describe('rocToWesternYear - 民國年轉西元年', () => {
    it.each([
      { roc: 113, western: 2024 },
      { roc: 1, western: 1912 },
    ])('should convert ROC year $roc to $western', ({ roc, western }) => {
      expect(rocToWesternYear(roc)).toBe(western)
    })
  })

  // ============================================
  // AC6.3: 金額解析（支援負數）
  // ============================================
  describe('parseAmount - 金額解析', () => {
    it.each([
      { input: 1234, expected: 1234, desc: 'regular number' },
      { input: '1234', expected: 1234, desc: 'string number' },
      { input: '1,234,567', expected: 1234567, desc: 'thousand separator' },
      { input: -5000, expected: -5000, desc: 'negative number' },
      { input: '-5000', expected: -5000, desc: 'negative string' },
      { input: 1234.567, expected: 1234.57, desc: 'decimal rounding' },
    ])('should parse $desc correctly', ({ input, expected }) => {
      expect(parseAmount(input)).toBe(expected)
    })

    it.each([null, undefined, '', 'abc'])('should return 0 for %s', (value) => {
      expect(parseAmount(value)).toBe(0)
    })
  })

  // ============================================
  // 欄位匹配與模式偵測
  // ============================================
  describe('findColumnValue - 欄位值查找', () => {
    it('should find value by column name', () => {
      const row = { '發票號碼': 'AB-12345678' }
      const result = findColumnValue(row, ['發票號碼', 'Invoice Number'])
      expect(result).toBe('AB-12345678')
    })

    it('should try multiple column names', () => {
      const row = { 'Invoice Number': 'AB-12345678' }
      const result = findColumnValue(row, ['發票號碼', 'Invoice Number'])
      expect(result).toBe('AB-12345678')
    })

    it('should return undefined if no match', () => {
      const row = { '其他欄位': 'value' }
      const result = findColumnValue(row, ['發票號碼'])
      expect(result).toBeUndefined()
    })
  })

  describe('detectImportMode - 匯入模式偵測', () => {
    it('should detect purchase mode (mof_purchase)', () => {
      const headers = ['發票號碼', '發票日期', '賣方統一編號', '賣方名稱', '銷售額', '稅額']
      const result = detectImportMode(headers)
      expect(result).toBe('mof_purchase')
    })

    it('should detect sales mode (mof_sales)', () => {
      const headers = ['發票號碼', '發票日期', '買方統一編號', '買方名稱', '銷售額', '稅額']
      const result = detectImportMode(headers)
      expect(result).toBe('mof_sales')
    })

    it('should return standard mode when cannot detect', () => {
      const headers = ['發票號碼', '發票日期', '銷售額']
      const result = detectImportMode(headers)
      expect(result).toBe('standard')
    })
  })

  // ============================================
  // AC6.2: 重複發票偵測
  // ============================================
  describe('parseMofExcel - 完整解析', () => {
    describe('重複發票號碼偵測', () => {
      it('should detect duplicate invoice numbers', () => {
        const headers = ['發票號碼', '發票日期', '賣方統一編號', '銷售額', '稅額']
        const rows = [
          { '發票號碼': 'AB-12345678', '發票日期': '113/12/15', '賣方統一編號': '12345678', '銷售額': 10000, '稅額': 500 },
          { '發票號碼': 'AB-12345678', '發票日期': '113/12/16', '賣方統一編號': '12345678', '銷售額': 20000, '稅額': 1000 },
        ]

        const result = parseMofExcel(rows, headers)

        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors.some((e: { message: string }) => e.message.includes('重複'))).toBe(true)
      })

      it('should parse valid invoices without duplicates', () => {
        const headers = ['發票號碼', '發票日期', '賣方統一編號', '銷售額', '稅額']
        const rows = [
          { '發票號碼': 'AB-12345678', '發票日期': '113/12/15', '賣方統一編號': '12345678', '銷售額': 10000, '稅額': 500 },
          { '發票號碼': 'CD-87654321', '發票日期': '113/12/16', '賣方統一編號': '12345678', '銷售額': 20000, '稅額': 1000 },
        ]

        const result = parseMofExcel(rows, headers)

        expect(result.errors.length).toBe(0)
        expect(result.data.length).toBe(2)
      })
    })

    describe('進項發票解析', () => {
      it('should parse purchase invoice with ROC date', () => {
        const headers = ['發票號碼', '發票日期', '賣方統一編號', '賣方名稱', '銷售額', '稅額']
        const rows = [
          {
            '發票號碼': 'AB-12345678',
            '發票日期': '113/12/15',
            '賣方統一編號': '12345678',
            '賣方名稱': '測試公司',
            '銷售額': 10000,
            '稅額': 500,
          },
        ]

        const result = parseMofExcel(rows, headers)

        expect(result.mode).toBe('mof_purchase')
        expect(result.data.length).toBe(1)
        expect(result.data[0].type).toBe('INPUT')
        expect(result.data[0].date).toBe('2024-12-15')
        expect(result.data[0].untaxed_amount).toBe(10000)
        expect(result.data[0].tax_amount).toBe(500)
      })
    })

    describe('銷項發票解析', () => {
      it('should parse sales invoice with ROC date', () => {
        const headers = ['發票號碼', '發票日期', '買方統一編號', '買方名稱', '銷售額', '稅額']
        const rows = [
          {
            '發票號碼': 'AB-12345678',
            '發票日期': '113/12/15',
            '買方統一編號': '87654321',
            '買方名稱': '買方公司',
            '銷售額': 20000,
            '稅額': 1000,
          },
        ]

        const result = parseMofExcel(rows, headers)

        expect(result.mode).toBe('mof_sales')
        expect(result.data.length).toBe(1)
        expect(result.data[0].type).toBe('OUTPUT')
        expect(result.data[0].date).toBe('2024-12-15')
        expect(result.data[0].untaxed_amount).toBe(20000)
        expect(result.data[0].tax_amount).toBe(1000)
      })
    })
  })

  describe('validateMofParseResult - 解析結果驗證', () => {
    it('should return invalid for standard mode', () => {
      const result: MofParseResult = {
        data: [],
        errors: [],
        mode: 'standard',
      }
      const validation = validateMofParseResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.message).toContain('無法識別')
    })

    it('should return invalid when errors exist', () => {
      const result: MofParseResult = {
        data: [],
        errors: [{ row: 2, column: '發票號碼', message: '發票號碼為必填欄位' }],
        mode: 'mof_purchase',
      }
      const validation = validateMofParseResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.message).toContain('1 筆資料有錯誤')
    })

    it('should return invalid when no data', () => {
      const result: MofParseResult = {
        data: [],
        errors: [],
        mode: 'mof_purchase',
      }
      const validation = validateMofParseResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.message).toContain('沒有可匯入的資料')
    })

    it('should return valid for successful parse', () => {
      const result: MofParseResult = {
        data: [
          {
            number: 'AB-12345678',
            type: 'INPUT',
            date: '2024-12-15',
            untaxed_amount: 10000,
            tax_amount: 500,
            total_amount: 10500,
          },
        ],
        errors: [],
        mode: 'mof_purchase',
      }
      const validation = validateMofParseResult(result)
      expect(validation.valid).toBe(true)
      expect(validation.message).toContain('1 筆資料可匯入')
    })
  })

  // ============================================
  // ALL 格式（財政部全部發票）
  // ============================================
  describe('detectImportMode - ALL 格式偵測', () => {
    it('同時有買方+賣方欄位 → mof_all', () => {
      const headers = ['發票號碼', '發票日期', '買方統一編號', '買方名稱', '賣方統一編號', '賣方名稱', '營業稅', '總計']
      expect(detectImportMode(headers)).toBe('mof_all')
    })

    it('header 有換行符也能正確偵測', () => {
      const headers = ['發票號碼', '發票日期', '買方統一編號', '買方名稱', '賣方統一編號', '賣方名稱', '匯率\n']
      expect(detectImportMode(headers)).toBe('mof_all')
    })
  })

  describe('parseMofAllInvoiceRow - ALL 格式單行解析', () => {
    const COMPANY_TAX_ID = '83446730'

    it('買方統編 = 公司統編 → INPUT（進項）', () => {
      const row = {
        '發票號碼': 'VZ11904803',
        '發票日期': '2026-01-07 12:24:47',
        '買方統一編號': '83446730',
        '買方名稱': '83446730',
        '賣方統一編號': '38909312',
        '賣方名稱': '台亞石油股份有限公司',
        '銷售額合計': 464,
        '營業稅': 23,
        '總計': 487,
        '課稅別': '應稅',
        '發票狀態': '開立已確認',
      }

      const { data, errors } = parseMofAllInvoiceRow(row, 2, COMPANY_TAX_ID)

      expect(errors).toHaveLength(0)
      expect(data).not.toBeNull()
      expect(data!.type).toBe('INPUT')
      expect(data!.number).toBe('VZ11904803')
      expect(data!.date).toBe('2026-01-07')
      expect(data!.untaxed_amount).toBe(464)
      expect(data!.tax_amount).toBe(23)
      expect(data!.total_amount).toBe(487)
      expect(data!.counterparty_name).toBe('台亞石油股份有限公司')
      expect(data!.counterparty_tax_id).toBe('38909312')
      expect(data!.tax_type).toBe('1')
    })

    it('賣方統編 = 公司統編 → OUTPUT（銷項）', () => {
      const row = {
        '發票號碼': 'XX12345678',
        '發票日期': '2026-02-01',
        '買方統一編號': '12345678',
        '買方名稱': '某客戶公司',
        '賣方統一編號': '83446730',
        '賣方名稱': '我方公司',
        '銷售額合計': 10000,
        '營業稅': 500,
        '總計': 10500,
        '課稅別': '應稅',
        '發票狀態': '開立已確認',
      }

      const { data, errors } = parseMofAllInvoiceRow(row, 2, COMPANY_TAX_ID)

      expect(errors).toHaveLength(0)
      expect(data!.type).toBe('OUTPUT')
      expect(data!.counterparty_name).toBe('某客戶公司')
      expect(data!.counterparty_tax_id).toBe('12345678')
    })

    it('作廢發票 → 靜默跳過', () => {
      const row = {
        '發票號碼': 'AB99999999',
        '發票日期': '2026-01-01',
        '買方統一編號': '83446730',
        '賣方統一編號': '11111111',
        '發票狀態': '作廢',
      }

      const { data, errors } = parseMofAllInvoiceRow(row, 2, COMPANY_TAX_ID)

      expect(errors).toHaveLength(0)
      expect(data).toBeNull()
    })

    it('課稅別「零稅率」→ tax_type = 2', () => {
      const row = {
        '發票號碼': 'ZZ11111111',
        '發票日期': '2026-01-15',
        '買方統一編號': '83446730',
        '賣方統一編號': '22222222',
        '賣方名稱': '外銷公司',
        '銷售額合計': 5000,
        '營業稅': 0,
        '總計': 5000,
        '課稅別': '零稅率',
        '發票狀態': '開立已確認',
      }

      const { data } = parseMofAllInvoiceRow(row, 2, COMPANY_TAX_ID)
      expect(data!.tax_type).toBe('2')
    })

    it('買賣方統編都不符合 → 報錯', () => {
      const row = {
        '發票號碼': 'XX00000000',
        '發票日期': '2026-01-01',
        '買方統一編號': '99999999',
        '賣方統一編號': '88888888',
        '發票狀態': '開立已確認',
      }

      const { data, errors } = parseMofAllInvoiceRow(row, 2, COMPANY_TAX_ID)

      expect(data).toBeNull()
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].message).toContain('無法判斷進/銷項')
    })
  })

  describe('parseMofExcel - ALL 格式整合測試', () => {
    const COMPANY_TAX_ID = '83446730'

    it('完整解析包含進銷項混合的 ALL 格式', () => {
      const headers = [
        '發票號碼', '發票狀態', '發票日期',
        '買方統一編號', '買方名稱',
        '賣方統一編號', '賣方名稱',
        '銷售額合計', '營業稅', '總計', '課稅別',
      ]
      const rows = [
        {
          '發票號碼': 'AA11111111',
          '發票狀態': '開立已確認',
          '發票日期': '2026-01-05 10:00:00',
          '買方統一編號': '83446730',
          '買方名稱': '我方',
          '賣方統一編號': '11111111',
          '賣方名稱': '賣方A',
          '銷售額合計': 1000,
          '營業稅': 50,
          '總計': 1050,
          '課稅別': '應稅',
        },
        {
          '發票號碼': 'BB22222222',
          '發票狀態': '開立已確認',
          '發票日期': '2026-01-10',
          '買方統一編號': '22222222',
          '買方名稱': '客戶B',
          '賣方統一編號': '83446730',
          '賣方名稱': '我方',
          '銷售額合計': 5000,
          '營業稅': 250,
          '總計': 5250,
          '課稅別': '應稅',
        },
        {
          '發票號碼': 'CC33333333',
          '發票狀態': '作廢',
          '發票日期': '2026-01-15',
          '買方統一編號': '83446730',
          '賣方統一編號': '33333333',
          '銷售額合計': 999,
          '營業稅': 50,
          '總計': 1049,
          '課稅別': '應稅',
        },
      ]

      const result = parseMofExcel(rows, headers, undefined, COMPANY_TAX_ID)

      expect(result.mode).toBe('mof_all')
      expect(result.errors).toHaveLength(0)
      // 作廢的 CC33333333 被跳過
      expect(result.data).toHaveLength(2)

      // 第一筆：進項
      expect(result.data[0].type).toBe('INPUT')
      expect(result.data[0].number).toBe('AA11111111')
      expect(result.data[0].counterparty_name).toBe('賣方A')

      // 第二筆：銷項
      expect(result.data[1].type).toBe('OUTPUT')
      expect(result.data[1].number).toBe('BB22222222')
      expect(result.data[1].counterparty_name).toBe('客戶B')
    })

    it('ALL 模式缺少 companyTaxId → 報錯', () => {
      const headers = ['發票號碼', '買方統一編號', '賣方統一編號']
      const result = parseMofExcel([], headers, 'mof_all')

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('公司統編')
    })
  })
})
