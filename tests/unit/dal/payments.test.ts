/**
 * 付款 DAL 單元測試
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPayments,
  getPaymentsWithFilters,
  getPaymentById,
  createPayment,
  getCollectedPayments,
} from '@/lib/dal/payments'
import {
  mockSupabaseClient,
  resetQueryBuilder,
  setQueryResult,
  createMockPayment,
} from '../../mocks/supabase'

// Mock supabase-client
vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  SupabaseClient: vi.fn(),
}))

describe('Payments DAL', () => {
  const testUserId = 'test-user-id'
  const testPaymentId = 'test-payment-id'
  const testCompanyId = 'test-company-id'

  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryBuilder()
  })

  describe('getPayments', () => {
    it('應返回付款列表', async () => {
      const mockPayments = [
        createMockPayment({ id: '1' }),
        createMockPayment({ id: '2' }),
      ]

      setQueryResult({
        data: mockPayments,
        error: null,
      })

      const result = await getPayments(mockSupabaseClient as never, testUserId)

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payments')
    })

    it('應支援 companyId 過濾', async () => {
      setQueryResult({
        data: [createMockPayment()],
        error: null,
      })

      const result = await getPayments(mockSupabaseClient as never, testUserId, testCompanyId)

      expect(result).toBeDefined()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payments')
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        getPayments(mockSupabaseClient as never, testUserId)
      ).rejects.toThrow('Failed to get payments: Database error')
    })

    it('應返回空陣列當沒有資料', async () => {
      setQueryResult({
        data: null,
        error: null,
      })

      const result = await getPayments(mockSupabaseClient as never, testUserId)

      expect(result).toEqual([])
    })
  })

  describe('getPaymentsWithFilters', () => {
    it('應支援多重過濾條件', async () => {
      setQueryResult({
        data: [createMockPayment()],
        error: null,
      })

      const result = await getPaymentsWithFilters(mockSupabaseClient as never, testUserId, {
        customer_id: 'customer-123',
        status: 'confirmed',
        payment_type: 'deposit',
      })

      expect(result).toBeDefined()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payments')
    })

    it('應支援 quotation_id 過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getPaymentsWithFilters(mockSupabaseClient as never, testUserId, {
        quotation_id: 'quotation-123',
      })

      expect(result).toEqual([])
    })

    it('應支援 contract_id 過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getPaymentsWithFilters(mockSupabaseClient as never, testUserId, {
        contract_id: 'contract-123',
      })

      expect(result).toEqual([])
    })
  })

  describe('getPaymentById', () => {
    it('應返回指定付款', async () => {
      const mockPayment = createMockPayment()

      setQueryResult({
        data: mockPayment,
        error: null,
      })

      const result = await getPaymentById(
        mockSupabaseClient as never,
        testUserId,
        testPaymentId
      )

      expect(result).toEqual(mockPayment)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payments')
    })

    it('不存在時應返回 null', async () => {
      setQueryResult({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getPaymentById(
        mockSupabaseClient as never,
        testUserId,
        'non-existent-id'
      )

      expect(result).toBeNull()
    })

    it('其他錯誤時應拋出異常', async () => {
      setQueryResult({
        data: null,
        error: { code: 'OTHER', message: 'Unexpected error' },
      })

      await expect(
        getPaymentById(mockSupabaseClient as never, testUserId, testPaymentId)
      ).rejects.toThrow('Failed to get payment: Unexpected error')
    })
  })

  describe('createPayment', () => {
    it('應創建新付款', async () => {
      const mockCreated = createMockPayment()

      setQueryResult({
        data: mockCreated,
        error: null,
      })

      const result = await createPayment(mockSupabaseClient as never, testUserId, {
        quotation_id: 'quotation-123',
        contract_id: null,
        customer_id: 'customer-123',
        payment_type: 'deposit',
        payment_date: '2025-01-15',
        amount: 10000,
        currency: 'TWD',
        payment_method: 'bank_transfer',
        reference_number: null,
        receipt_url: null,
        status: 'confirmed',
        notes: null,
      })

      expect(result).toEqual(mockCreated)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payments')
    })

    it('創建失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Insert failed' },
      })

      await expect(
        createPayment(mockSupabaseClient as never, testUserId, {
          quotation_id: 'quotation-123',
          contract_id: null,
          customer_id: 'customer-123',
          payment_type: 'deposit',
          payment_date: '2025-01-15',
          amount: 10000,
          currency: 'TWD',
          payment_method: null,
          reference_number: null,
          receipt_url: null,
          status: 'pending',
          notes: null,
        })
      ).rejects.toThrow('Failed to create payment: Insert failed')
    })
  })

  describe('getCollectedPayments', () => {
    it('應返回已確認的付款', async () => {
      const mockPayments = [
        createMockPayment({ status: 'confirmed' }),
      ]

      setQueryResult({
        data: mockPayments,
        error: null,
      })

      const result = await getCollectedPayments(
        mockSupabaseClient as never,
        testUserId
      )

      expect(result).toHaveLength(1)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payments')
    })

    it('應支援日期範圍過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getCollectedPayments(mockSupabaseClient as never, testUserId, {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      })

      expect(result).toEqual([])
    })

    it('應支援 customer_id 過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getCollectedPayments(mockSupabaseClient as never, testUserId, {
        customer_id: 'customer-123',
      })

      expect(result).toEqual([])
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Query failed' },
      })

      await expect(
        getCollectedPayments(mockSupabaseClient as never, testUserId)
      ).rejects.toThrow('Failed to get collected payments: Query failed')
    })
  })
})
