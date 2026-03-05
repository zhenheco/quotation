/**
 * 發票鎖定機制 - 單元測試
 * 測試路徑: lib/dal/accounting/invoices.dal.ts
 *
 * 驗收標準 Case 15: 已 submitted 期別的發票不能被修改/刪除
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  updateInvoice,
  deleteInvoice,
} from '@/lib/dal/accounting/invoices.dal'
import {
  mockSupabaseClient,
  queryBuilder,
  resetQueryBuilder,
  setQueryResult,
} from '../../../mocks/supabase'

vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  SupabaseClient: vi.fn(),
}))

const invoiceNoPeriod = {
  id: 'inv-1',
  company_id: 'comp-1',
  number: 'AB12345678',
  type: 'OUTPUT',
  date: '2026-01-15',
  untaxed_amount: 10000,
  tax_amount: 500,
  total_amount: 10500,
  status: 'DRAFT',
  declared_period_id: null,
  is_historical_import: false,
  is_fixed_asset: false,
  return_type: 'NONE',
  original_invoice_date: null,
  original_invoice_number: null,
  payment_status: 'UNPAID',
  payment_method: 'UNCLASSIFIED',
  paid_amount: 0,
}

const invoiceWithPeriod = {
  ...invoiceNoPeriod,
  id: 'inv-2',
  declared_period_id: 'decl-submitted',
}

describe('發票鎖定機制', () => {
  beforeEach(() => {
    resetQueryBuilder()
    vi.clearAllMocks()
  })

  describe('updateInvoice - 鎖定檢查', () => {
    it('無申報期別的發票可以正常修改', async () => {
      // getInvoiceById → updateInvoice 都用同一個 mock 結果
      setQueryResult({ data: invoiceNoPeriod, error: null })

      const result = await updateInvoice(
        mockSupabaseClient as never,
        'inv-1',
        { description: '更新備註' }
      )

      expect(result).toBeDefined()
    })

    it('已送出期別的發票不能修改', async () => {
      // 需要分段 mock：getInvoiceById(single) → getDeclarationStatus(single)
      let singleCallCount = 0
      queryBuilder.single
        .mockImplementation(() => {
          singleCallCount++
          if (singleCallCount === 1) {
            // getInvoiceById
            return Promise.resolve({ data: invoiceWithPeriod, error: null })
          }
          // getDeclarationStatus
          return Promise.resolve({ data: { status: 'submitted' }, error: null })
        })

      await expect(
        updateInvoice(mockSupabaseClient as never, 'inv-2', { description: '嘗試修改' })
      ).rejects.toThrow('此發票所屬申報期別已送出或結案，不能修改')
    })

    it('已結案期別的發票不能修改', async () => {
      let singleCallCount = 0
      queryBuilder.single
        .mockImplementation(() => {
          singleCallCount++
          if (singleCallCount === 1) {
            return Promise.resolve({ data: invoiceWithPeriod, error: null })
          }
          return Promise.resolve({ data: { status: 'closed' }, error: null })
        })

      await expect(
        updateInvoice(mockSupabaseClient as never, 'inv-2', { description: '嘗試修改' })
      ).rejects.toThrow('此發票所屬申報期別已送出或結案，不能修改')
    })

    it('草稿期別的發票可以修改', async () => {
      let singleCallCount = 0
      queryBuilder.single
        .mockImplementation(() => {
          singleCallCount++
          if (singleCallCount === 1) {
            return Promise.resolve({ data: invoiceWithPeriod, error: null })
          }
          if (singleCallCount === 2) {
            // getDeclarationStatus → draft → 允許
            return Promise.resolve({ data: { status: 'draft' }, error: null })
          }
          // updateInvoice result
          return Promise.resolve({ data: { ...invoiceWithPeriod, description: '已修改' }, error: null })
        })

      const result = await updateInvoice(
        mockSupabaseClient as never,
        'inv-2',
        { description: '已修改' }
      )
      expect(result.description).toBe('已修改')
    })
  })

  describe('deleteInvoice - 鎖定檢查', () => {
    it('已送出期別的發票不能刪除', async () => {
      let singleCallCount = 0
      queryBuilder.single
        .mockImplementation(() => {
          singleCallCount++
          if (singleCallCount === 1) {
            return Promise.resolve({ data: invoiceWithPeriod, error: null })
          }
          return Promise.resolve({ data: { status: 'submitted' }, error: null })
        })

      await expect(
        deleteInvoice(mockSupabaseClient as never, 'inv-2')
      ).rejects.toThrow('此發票所屬申報期別已送出或結案，不能刪除')
    })

    it('草稿期別的發票可以正常刪除', async () => {
      let singleCallCount = 0
      queryBuilder.single
        .mockImplementation(() => {
          singleCallCount++
          if (singleCallCount === 1) {
            return Promise.resolve({ data: invoiceWithPeriod, error: null })
          }
          // getDeclarationStatus → draft
          return Promise.resolve({ data: { status: 'draft' }, error: null })
        })

      // deleteInvoice does update (soft delete), no .single()
      setQueryResult({ error: null, data: null })

      await expect(
        deleteInvoice(mockSupabaseClient as never, 'inv-2')
      ).resolves.toBeUndefined()
    })
  })
})
