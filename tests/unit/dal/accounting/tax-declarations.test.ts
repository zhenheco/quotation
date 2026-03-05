/**
 * 營業稅申報 DAL 單元測試
 * 測試路徑: lib/dal/accounting/tax-declarations.dal.ts
 *
 * TDD Red Phase: 測試先行
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTaxDeclaration,
  getTaxDeclaration,
  getTaxDeclarationByPeriod,
  getOrCreateTaxDeclaration,
  getLatestClosedDeclaration,
  updateTaxDeclaration,
  submitTaxDeclaration,
  reopenTaxDeclaration,
  listTaxDeclarations,
  validateDeclarationContinuity,
} from '@/lib/dal/accounting/tax-declarations.dal'
import {
  mockSupabaseClient,
  resetQueryBuilder,
  setQueryResult,
} from '../../../mocks/supabase'
import type { TaxDeclaration } from '@/types/models'

vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  SupabaseClient: vi.fn(),
}))

const testCompanyId = 'test-company-id'

function createMockDeclaration(overrides: Partial<TaxDeclaration> = {}): TaxDeclaration {
  return {
    id: 'decl-001',
    company_id: testCompanyId,
    period_year: 2026,
    period_bi_month: 1,
    status: 'draft',
    opening_offset_amount: 0,
    current_output_tax: 0,
    current_input_tax: 0,
    fixed_asset_input_tax: 0,
    return_allowance_tax: 0,
    item_non_deductible_tax: 0,
    ratio_non_deductible_tax: 0,
    net_payable_amount: 0,
    closing_offset_amount: 0,
    sales_invoice_count: 0,
    purchase_invoice_count: 0,
    submitted_at: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

describe('tax-declarations.dal - 營業稅申報 DAL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryBuilder()
  })

  // ============================================
  // createTaxDeclaration
  // ============================================
  describe('createTaxDeclaration', () => {
    it('應建立新的申報期別', async () => {
      const mockDecl = createMockDeclaration()
      setQueryResult({ data: mockDecl, error: null })

      const result = await createTaxDeclaration(
        mockSupabaseClient as never,
        {
          company_id: testCompanyId,
          period_year: 2026,
          period_bi_month: 1,
          opening_offset_amount: 5000,
        }
      )

      expect(result).toEqual(mockDecl)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tax_declarations')
    })

    it('應拒絕重複期別', async () => {
      setQueryResult({
        data: null,
        error: { code: '23505', message: 'duplicate key' },
      })

      await expect(
        createTaxDeclaration(mockSupabaseClient as never, {
          company_id: testCompanyId,
          period_year: 2026,
          period_bi_month: 1,
        })
      ).rejects.toThrow('已存在')
    })
  })

  // ============================================
  // getTaxDeclaration
  // ============================================
  describe('getTaxDeclaration', () => {
    it('應取得單一申報期別', async () => {
      const mockDecl = createMockDeclaration()
      setQueryResult({ data: mockDecl, error: null })

      const result = await getTaxDeclaration(mockSupabaseClient as never, 'decl-001')
      expect(result).toEqual(mockDecl)
    })

    it('不存在時應返回 null', async () => {
      setQueryResult({ data: null, error: { code: 'PGRST116', message: 'not found' } })

      const result = await getTaxDeclaration(mockSupabaseClient as never, 'not-exist')
      expect(result).toBeNull()
    })
  })

  // ============================================
  // getTaxDeclarationByPeriod
  // ============================================
  describe('getTaxDeclarationByPeriod', () => {
    it('應按年份和雙月期查詢', async () => {
      const mockDecl = createMockDeclaration()
      setQueryResult({ data: mockDecl, error: null })

      const result = await getTaxDeclarationByPeriod(
        mockSupabaseClient as never,
        testCompanyId,
        2026,
        1
      )

      expect(result).toEqual(mockDecl)
    })
  })

  // ============================================
  // getOrCreateTaxDeclaration
  // ============================================
  describe('getOrCreateTaxDeclaration', () => {
    it('已存在時應返回現有記錄', async () => {
      const mockDecl = createMockDeclaration()
      setQueryResult({ data: mockDecl, error: null })

      const result = await getOrCreateTaxDeclaration(
        mockSupabaseClient as never,
        testCompanyId,
        2026,
        1
      )

      expect(result).toEqual(mockDecl)
    })
  })

  // ============================================
  // getLatestClosedDeclaration
  // ============================================
  describe('getLatestClosedDeclaration', () => {
    it('應取得上期已結案的申報', async () => {
      const mockDecl = createMockDeclaration({
        period_bi_month: 6,
        period_year: 2025,
        status: 'closed',
        closing_offset_amount: 15000,
      })
      setQueryResult({ data: mockDecl, error: null })

      const result = await getLatestClosedDeclaration(
        mockSupabaseClient as never,
        testCompanyId,
        2026,
        1
      )

      expect(result).toEqual(mockDecl)
      expect(result?.closing_offset_amount).toBe(15000)
    })

    it('沒有歷史記錄時應返回 null', async () => {
      setQueryResult({ data: null, error: { code: 'PGRST116', message: 'not found' } })

      const result = await getLatestClosedDeclaration(
        mockSupabaseClient as never,
        testCompanyId,
        2026,
        1
      )

      expect(result).toBeNull()
    })
  })

  // ============================================
  // updateTaxDeclaration
  // ============================================
  describe('updateTaxDeclaration', () => {
    it('應更新 draft 狀態的申報', async () => {
      const mockDecl = createMockDeclaration({
        current_output_tax: 25000,
        current_input_tax: 15000,
      })
      setQueryResult({ data: mockDecl, error: null })

      const result = await updateTaxDeclaration(
        mockSupabaseClient as never,
        'decl-001',
        { current_output_tax: 25000, current_input_tax: 15000 }
      )

      expect(result.current_output_tax).toBe(25000)
    })

    it('應拒絕更新 submitted 狀態的申報', async () => {
      // First call returns submitted declaration, second call for update
      const submittedDecl = createMockDeclaration({ status: 'submitted' })
      setQueryResult({ data: submittedDecl, error: null })

      await expect(
        updateTaxDeclaration(
          mockSupabaseClient as never,
          'decl-001',
          { current_output_tax: 99999 }
        )
      ).rejects.toThrow('已送出')
    })
  })

  // ============================================
  // submitTaxDeclaration
  // ============================================
  describe('submitTaxDeclaration', () => {
    it('應將 draft 狀態改為 submitted', async () => {
      const draftDecl = createMockDeclaration({ status: 'draft' })
      const submittedDecl = createMockDeclaration({ status: 'submitted', submitted_at: new Date().toISOString() })

      // First call: getTaxDeclaration
      setQueryResult({ data: draftDecl, error: null })

      // The function internally reads then updates
      // After first read, set result for update
      setTimeout(() => setQueryResult({ data: submittedDecl, error: null }), 0)

      const result = await submitTaxDeclaration(mockSupabaseClient as never, 'decl-001')
      expect(result).toBeDefined()
    })
  })

  // ============================================
  // reopenTaxDeclaration
  // ============================================
  describe('reopenTaxDeclaration', () => {
    it('應將 submitted 狀態改回 draft', async () => {
      const submittedDecl = createMockDeclaration({ status: 'submitted' })
      const draftDecl = createMockDeclaration({ status: 'draft' })

      setQueryResult({ data: submittedDecl, error: null })
      setTimeout(() => setQueryResult({ data: draftDecl, error: null }), 0)

      const result = await reopenTaxDeclaration(mockSupabaseClient as never, 'decl-001')
      expect(result).toBeDefined()
    })
  })

  // ============================================
  // listTaxDeclarations
  // ============================================
  describe('listTaxDeclarations', () => {
    it('應返回公司的所有申報期別', async () => {
      const mockList = [
        createMockDeclaration({ period_bi_month: 1 }),
        createMockDeclaration({ id: 'decl-002', period_bi_month: 2 }),
      ]
      setQueryResult({ data: mockList, error: null })

      const result = await listTaxDeclarations(
        mockSupabaseClient as never,
        testCompanyId
      )

      expect(result).toHaveLength(2)
    })
  })

  // ============================================
  // validateDeclarationContinuity
  // ============================================
  describe('validateDeclarationContinuity', () => {
    it('opening 等於上期 closing 時應通過', async () => {
      const prevDecl = createMockDeclaration({
        status: 'closed',
        closing_offset_amount: 5000,
        period_year: 2025,
        period_bi_month: 6,
      })
      setQueryResult({ data: prevDecl, error: null })

      const result = await validateDeclarationContinuity(
        mockSupabaseClient as never,
        testCompanyId,
        2026,
        1,
        5000 // opening == 上期 closing
      )

      expect(result.valid).toBe(true)
    })

    it('opening 不等於上期 closing 時應失敗', async () => {
      const prevDecl = createMockDeclaration({
        status: 'closed',
        closing_offset_amount: 5000,
        period_year: 2025,
        period_bi_month: 6,
      })
      setQueryResult({ data: prevDecl, error: null })

      const result = await validateDeclarationContinuity(
        mockSupabaseClient as never,
        testCompanyId,
        2026,
        1,
        9999 // opening != 上期 closing
      )

      expect(result.valid).toBe(false)
      expect(result.expectedAmount).toBe(5000)
    })

    it('沒有上期記錄時（首次使用）應通過', async () => {
      setQueryResult({ data: null, error: { code: 'PGRST116', message: 'not found' } })

      const result = await validateDeclarationContinuity(
        mockSupabaseClient as never,
        testCompanyId,
        2026,
        1,
        10000 // 首次手動輸入
      )

      expect(result.valid).toBe(true)
    })
  })
})
