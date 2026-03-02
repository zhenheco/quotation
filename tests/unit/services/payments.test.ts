/**
 * Payments Service 單元測試
 * 測試核心業務邏輯：摘要統計、記錄付款、逾期檢查、標記逾期、批量標記
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockSupabaseClient,
  resetQueryBuilder,
  createMockPayment,
} from '../../mocks/supabase'

// Mock supabase/server
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Mock RBAC
const mockHasPermission = vi.fn()
vi.mock('@/lib/services/rbac', () => ({
  hasPermission: (...args: unknown[]) => mockHasPermission(...args),
}))

// Mock contracts service (side effects)
vi.mock('@/lib/services/contracts', () => ({
  markScheduleAsPaid: vi.fn().mockResolvedValue(undefined),
  updateCustomerNextPayment: vi.fn().mockResolvedValue(undefined),
}))

import {
  getPaymentSummary,
  recordPayment,
  checkOverduePayments,
  markPaymentAsOverdue,
  batchMarkOverduePayments,
} from '@/lib/services/payments'

/**
 * 建立可以追蹤多次 from() 呼叫的 mock，每次呼叫返回不同結果
 * 返回包含 single() 支援的完整 chainable proxy
 */
function createSequentialFromMock(results: { data: unknown; error: unknown }[]) {
  let callCount = 0

  return vi.fn().mockImplementation(() => {
    const currentCall = callCount++
    const result = results[currentCall] || { data: null, error: null }

    // 建立真正的 Proxy，確保返回的是 proxy 本身（而非原始 target）
    const handler: ProxyHandler<object> = {
      get(_target, prop: string) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => resolve(result)
        }
        if (prop === 'single' || prop === 'maybeSingle') {
          return () => Promise.resolve(result)
        }
        // 所有其他方法都返回 proxy 本身（支持鏈式調用）
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return (..._: unknown[]) => proxy
      },
    }
    const proxy = new Proxy({}, handler)
    return proxy
  })
}

describe('Payments Service', () => {
  const testUserId = 'test-user-id'
  let originalFrom: typeof mockSupabaseClient.from

  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryBuilder()
    mockHasPermission.mockResolvedValue(true)
    // 保存原始 from 以便還原
    originalFrom = mockSupabaseClient.from
  })

  afterEach(() => {
    mockSupabaseClient.from = originalFrom
  })

  // ==========================================================================
  // getPaymentSummary
  // ==========================================================================
  describe('getPaymentSummary', () => {
    it('應計算正確的支付摘要 (happy path)', async () => {
      mockSupabaseClient.from = createSequentialFromMock([
        // 1st: payments (confirmed)
        { data: [{ amount: 5000 }, { amount: 3000 }], error: null },
        // 2nd: payment_schedules (pending)
        { data: [{ amount: 10000, paid_amount: 2000 }, { amount: 5000, paid_amount: 0 }], error: null },
        // 3rd: payment_schedules (overdue)
        { data: [{ amount: 8000, paid_amount: 1000 }], error: null },
      ])

      const summary = await getPaymentSummary(testUserId, 'TWD')

      expect(summary).toEqual({
        total_paid: 8000,       // 5000 + 3000
        total_pending: 13000,   // (10000-2000) + (5000-0)
        total_overdue: 7000,    // 8000-1000
        currency: 'TWD',
      })
    })

    it('空資料應返回 0', async () => {
      mockSupabaseClient.from = createSequentialFromMock([
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ])

      const summary = await getPaymentSummary(testUserId)

      expect(summary).toEqual({
        total_paid: 0,
        total_pending: 0,
        total_overdue: 0,
        currency: 'TWD',
      })
    })

    it('null 資料應返回 0（防禦性）', async () => {
      mockSupabaseClient.from = createSequentialFromMock([
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      const summary = await getPaymentSummary(testUserId)

      expect(summary).toEqual({
        total_paid: 0,
        total_pending: 0,
        total_overdue: 0,
        currency: 'TWD',
      })
    })

    it('查詢 paid 失敗時應拋出錯誤', async () => {
      mockSupabaseClient.from = createSequentialFromMock([
        { data: null, error: { message: 'DB error', code: '500' } },
      ])

      await expect(getPaymentSummary(testUserId)).rejects.toThrow()
    })

    it('應支援不同幣別參數', async () => {
      mockSupabaseClient.from = createSequentialFromMock([
        { data: [{ amount: 100 }], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ])

      const summary = await getPaymentSummary(testUserId, 'USD')

      expect(summary.currency).toBe('USD')
      expect(summary.total_paid).toBe(100)
    })
  })

  // ==========================================================================
  // recordPayment
  // ==========================================================================
  describe('recordPayment', () => {
    const validPaymentData = {
      quotation_id: 'quotation-123',
      customer_id: 'customer-123',
      payment_type: 'deposit' as const,
      payment_date: '2025-01-15',
      amount: 10000,
      currency: 'TWD',
    }

    it('應成功記錄付款 (happy path)', async () => {
      const mockPayment = createMockPayment({ id: 'new-payment-id', amount: 10000 })

      mockSupabaseClient.from = createSequentialFromMock([
        { data: mockPayment, error: null },
      ])

      const result = await recordPayment(testUserId, validPaymentData)

      expect(result).toBeDefined()
      expect(result.id).toBe('new-payment-id')
      expect(mockHasPermission).toHaveBeenCalledWith(testUserId, 'payments', 'write')
    })

    it('權限不足時應拋出錯誤', async () => {
      mockHasPermission.mockResolvedValue(false)

      await expect(
        recordPayment(testUserId, validPaymentData)
      ).rejects.toThrow('Insufficient permissions to record payment')
    })

    it('沒有 quotation_id 和 contract_id 時應拋出錯誤', async () => {
      const invalidData = {
        customer_id: 'customer-123',
        payment_type: 'deposit' as const,
        payment_date: '2025-01-15',
        amount: 10000,
        currency: 'TWD',
      }

      await expect(
        recordPayment(testUserId, invalidData)
      ).rejects.toThrow('Either quotation_id or contract_id must be provided')
    })

    it('資料庫插入失敗時應拋出錯誤', async () => {
      mockSupabaseClient.from = createSequentialFromMock([
        { data: null, error: { message: 'Insert failed', code: '500' } },
      ])

      await expect(
        recordPayment(testUserId, validPaymentData)
      ).rejects.toThrow()
    })

    it('有 schedule_id 時應更新排程狀態', async () => {
      const mockPayment = createMockPayment({ id: 'new-payment-id' })

      mockSupabaseClient.from = createSequentialFromMock([
        // insert payment
        { data: mockPayment, error: null },
        // update schedule
        { data: null, error: null },
      ])

      const result = await recordPayment(testUserId, {
        ...validPaymentData,
        contract_id: 'contract-123',
        schedule_id: 'schedule-123',
      })

      expect(result).toBeDefined()
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(2)
    })
  })

  // ==========================================================================
  // checkOverduePayments
  // ==========================================================================
  describe('checkOverduePayments', () => {
    it('應更新逾期的排程和報價單 (happy path)', async () => {
      mockSupabaseClient.from = createSequentialFromMock([
        // update payment_schedules
        { data: null, error: null },
        // update quotations
        { data: null, error: null },
      ])

      await expect(checkOverduePayments(testUserId)).resolves.toBeUndefined()
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(2)
    })

    it('排程更新失敗時應拋出錯誤', async () => {
      mockSupabaseClient.from = createSequentialFromMock([
        { data: null, error: { message: 'Schedule update failed' } },
      ])

      await expect(checkOverduePayments(testUserId)).rejects.toThrow()
    })

    it('報價單更新失敗時應拋出錯誤', async () => {
      mockSupabaseClient.from = createSequentialFromMock([
        { data: null, error: null },
        { data: null, error: { message: 'Quotation update failed' } },
      ])

      await expect(checkOverduePayments(testUserId)).rejects.toThrow()
    })
  })

  // ==========================================================================
  // markPaymentAsOverdue
  // ==========================================================================
  describe('markPaymentAsOverdue', () => {
    const testScheduleId = 'schedule-123'

    it('應成功標記逾期 (happy path)', async () => {
      const mockSchedule = {
        id: testScheduleId,
        due_date: '2025-01-01',
        status: 'overdue',
        days_overdue: 30,
      }

      mockSupabaseClient.from = createSequentialFromMock([
        // fetch schedule
        { data: { due_date: '2025-01-01' }, error: null },
        // update schedule
        { data: mockSchedule, error: null },
      ])

      const result = await markPaymentAsOverdue(testUserId, testScheduleId)

      expect(result).toBeDefined()
      expect(result.status).toBe('overdue')
      expect(mockHasPermission).toHaveBeenCalledWith(testUserId, 'payments', 'write')
    })

    it('權限不足時應拋出錯誤', async () => {
      mockHasPermission.mockResolvedValue(false)

      await expect(
        markPaymentAsOverdue(testUserId, testScheduleId)
      ).rejects.toThrow('Insufficient permissions to update payment schedule')
    })

    it('排程不存在時應拋出錯誤 (fetch error)', async () => {
      mockSupabaseClient.from = createSequentialFromMock([
        { data: null, error: { code: 'PGRST116', message: 'not found' } },
      ])

      await expect(
        markPaymentAsOverdue(testUserId, testScheduleId)
      ).rejects.toThrow()
    })

    it('已處理的排程應拋出錯誤', async () => {
      mockSupabaseClient.from = createSequentialFromMock([
        // fetch succeeds
        { data: { due_date: '2025-01-01' }, error: null },
        // update returns null (already processed)
        { data: null, error: null },
      ])

      await expect(
        markPaymentAsOverdue(testUserId, testScheduleId)
      ).rejects.toThrow('Payment schedule not found or already processed')
    })
  })

  // ==========================================================================
  // batchMarkOverduePayments
  // ==========================================================================
  describe('batchMarkOverduePayments', () => {
    it('應成功批量標記逾期 (happy path)', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ updated_count: 3, schedule_ids: ['s1', 's2', 's3'] }],
        error: null,
      })

      const result = await batchMarkOverduePayments(testUserId)

      expect(result).toEqual({
        updated_count: 3,
        schedule_ids: ['s1', 's2', 's3'],
      })
      expect(mockHasPermission).toHaveBeenCalledWith(testUserId, 'payments', 'write')
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('mark_overdue_payments', {
        p_user_id: testUserId,
      })
    })

    it('權限不足時應拋出錯誤', async () => {
      mockHasPermission.mockResolvedValue(false)

      await expect(
        batchMarkOverduePayments(testUserId)
      ).rejects.toThrow('Insufficient permissions to batch update payments')
    })

    it('RPC 呼叫失敗時應拋出錯誤', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      })

      await expect(
        batchMarkOverduePayments(testUserId)
      ).rejects.toThrow()
    })

    it('沒有逾期資料時應返回空結果', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await batchMarkOverduePayments(testUserId)

      expect(result).toEqual({
        updated_count: 0,
        schedule_ids: [],
      })
    })

    it('RPC 返回 null 時應返回空結果', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await batchMarkOverduePayments(testUserId)

      expect(result).toEqual({
        updated_count: 0,
        schedule_ids: [],
      })
    })
  })
})
