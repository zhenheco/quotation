/**
 * 批量新增發票 DAL — 單元測試
 * Phase 2 Step 3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockSupabaseClient,
  queryBuilder,
  resetQueryBuilder,
} from '../../../mocks/supabase'

vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  SupabaseClient: vi.fn(),
}))

import { bulkCreateInvoices } from '@/lib/dal/accounting/invoices.dal'

describe('bulkCreateInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryBuilder()
  })

  const baseInvoice = {
    company_id: 'comp-1',
    number: 'AB-12345678',
    type: 'INPUT' as const,
    date: '2024-03-06',
    untaxed_amount: 10000,
    tax_amount: 500,
    total_amount: 10500,
    counterparty_tax_id: '12345678',
    counterparty_name: '測試公司',
    is_historical_import: true,
    is_fixed_asset: false,
    declared_period_id: 'decl-1',
  }

  it('should insert multiple invoices', async () => {
    const invoices = [
      baseInvoice,
      { ...baseInvoice, number: 'AB-12345679' },
    ]

    queryBuilder.select.mockReturnValueOnce({
      data: invoices.map((inv, i) => ({ id: `inv-${i}`, ...inv })),
      error: null,
    })

    const result = await bulkCreateInvoices(mockSupabaseClient, invoices)
    expect(result).toHaveLength(2)
    expect(queryBuilder.insert).toHaveBeenCalledTimes(1)
  })

  it('should throw on duplicate invoice number', async () => {
    queryBuilder.select.mockReturnValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    })

    await expect(
      bulkCreateInvoices(mockSupabaseClient, [baseInvoice]),
    ).rejects.toThrow('重複')
  })

  it('should set is_historical_import flag', async () => {
    queryBuilder.select.mockReturnValueOnce({
      data: [{ id: 'inv-1', ...baseInvoice }],
      error: null,
    })

    await bulkCreateInvoices(mockSupabaseClient, [baseInvoice])

    const insertCall = queryBuilder.insert.mock.calls[0][0]
    expect(insertCall[0].is_historical_import).toBe(true)
  })

  it('should set declared_period_id when provided', async () => {
    queryBuilder.select.mockReturnValueOnce({
      data: [{ id: 'inv-1', ...baseInvoice }],
      error: null,
    })

    await bulkCreateInvoices(mockSupabaseClient, [baseInvoice])

    const insertCall = queryBuilder.insert.mock.calls[0][0]
    expect(insertCall[0].declared_period_id).toBe('decl-1')
  })

  it('should set is_fixed_asset flag', async () => {
    const invoice = { ...baseInvoice, is_fixed_asset: true }
    queryBuilder.select.mockReturnValueOnce({
      data: [{ id: 'inv-1', ...invoice }],
      error: null,
    })

    await bulkCreateInvoices(mockSupabaseClient, [invoice])

    const insertCall = queryBuilder.insert.mock.calls[0][0]
    expect(insertCall[0].is_fixed_asset).toBe(true)
  })
})
