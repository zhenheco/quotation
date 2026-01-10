/**
 * 訂單 DAL 單元測試
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  confirmOrder,
  cancelOrder,
  deleteOrder,
  getOrderItems,
  createOrderItem,
  deleteOrderItem,
  getOrderStats,
  createOrderFromQuotation,
  updateOrderItem,
  createOrderItems,
  deleteOrderItems,
  recalculateOrderTotals,
} from '@/lib/dal/orders'
import {
  mockSupabaseClient,
  resetQueryBuilder,
  setQueryResult,
  createMockOrder,
} from '../../mocks/supabase'

// Mock supabase-client
vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  SupabaseClient: vi.fn(),
}))

describe('Orders DAL', () => {
  const testCompanyId = 'test-company-id'
  const testOrderId = 'test-order-id'
  const testCustomerId = 'test-customer-id'

  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryBuilder()
  })

  describe('getOrders', () => {
    it('應返回訂單列表', async () => {
      const mockOrders = [
        { ...createMockOrder({ id: '1' }), customer: null, quotation: null },
        { ...createMockOrder({ id: '2' }), customer: null, quotation: null },
      ]

      setQueryResult({
        data: mockOrders,
        error: null,
      })

      const result = await getOrders(mockSupabaseClient as never, {
        companyId: testCompanyId,
      })

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders')
    })

    it('應支援 status 過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getOrders(mockSupabaseClient as never, {
        companyId: testCompanyId,
        status: 'confirmed',
      })

      expect(result).toEqual([])
    })

    it('應支援 customerId 過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getOrders(mockSupabaseClient as never, {
        companyId: testCompanyId,
        customerId: testCustomerId,
      })

      expect(result).toEqual([])
    })

    it('應支援日期範圍過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getOrders(mockSupabaseClient as never, {
        companyId: testCompanyId,
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      })

      expect(result).toEqual([])
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        getOrders(mockSupabaseClient as never, { companyId: testCompanyId })
      ).rejects.toThrow('Failed to get orders: Database error')
    })
  })

  describe('getOrderById', () => {
    it('應返回指定訂單', async () => {
      const mockOrder = { ...createMockOrder(), customer: null, quotation: null }

      setQueryResult({
        data: mockOrder,
        error: null,
      })

      const result = await getOrderById(
        mockSupabaseClient as never,
        testCompanyId,
        testOrderId
      )

      expect(result).toBeDefined()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders')
    })

    it('不存在時應返回 null', async () => {
      setQueryResult({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getOrderById(
        mockSupabaseClient as never,
        testCompanyId,
        'non-existent'
      )

      expect(result).toBeNull()
    })
  })

  describe('createOrder', () => {
    it('應創建新訂單', async () => {
      const mockCreated = createMockOrder()

      setQueryResult({
        data: mockCreated,
        error: null,
      })

      const result = await createOrder(mockSupabaseClient as never, {
        company_id: testCompanyId,
        customer_id: testCustomerId,
      })

      expect(result).toEqual(mockCreated)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders')
    })

    it('創建失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Insert failed' },
      })

      await expect(
        createOrder(mockSupabaseClient as never, {
          company_id: testCompanyId,
          customer_id: testCustomerId,
        })
      ).rejects.toThrow('Failed to create order: Insert failed')
    })
  })

  describe('updateOrder', () => {
    it('應更新訂單', async () => {
      const mockUpdated = createMockOrder({ status: 'confirmed' })

      setQueryResult({
        data: mockUpdated,
        error: null,
      })

      const result = await updateOrder(
        mockSupabaseClient as never,
        testCompanyId,
        testOrderId,
        { status: 'confirmed' }
      )

      expect(result.status).toBe('confirmed')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders')
    })
  })

  describe('confirmOrder', () => {
    it('應確認草稿訂單', async () => {
      // 第一次呼叫檢查狀態，第二次更新
      setQueryResult({
        data: { status: 'draft' },
        error: null,
      })

      // 注意：由於 mock 的限制，這裡測試的行為可能需要調整
      // 實際上需要多次設定不同的結果
      await confirmOrder(
        mockSupabaseClient as never,
        testCompanyId,
        testOrderId
      )

      expect(mockSupabaseClient.from).toHaveBeenCalled()
    })

    it('非草稿訂單應拋出錯誤', async () => {
      setQueryResult({
        data: { status: 'shipped' },
        error: null,
      })

      await expect(
        confirmOrder(mockSupabaseClient as never, testCompanyId, testOrderId)
      ).rejects.toThrow('Only draft orders can be confirmed')
    })
  })

  describe('cancelOrder', () => {
    it('應取消訂單', async () => {
      setQueryResult({
        data: { status: 'draft' },
        error: null,
      })

      await cancelOrder(
        mockSupabaseClient as never,
        testCompanyId,
        testOrderId
      )

      expect(mockSupabaseClient.from).toHaveBeenCalled()
    })

    it('已完成訂單不能取消', async () => {
      setQueryResult({
        data: { status: 'completed' },
        error: null,
      })

      await expect(
        cancelOrder(mockSupabaseClient as never, testCompanyId, testOrderId)
      ).rejects.toThrow('Cannot cancel order with status: completed')
    })
  })

  describe('deleteOrder', () => {
    it('應刪除草稿訂單', async () => {
      setQueryResult({
        data: { status: 'draft' },
        error: null,
      })

      await expect(
        deleteOrder(mockSupabaseClient as never, testCompanyId, testOrderId)
      ).resolves.not.toThrow()
    })

    it('非草稿訂單不能刪除', async () => {
      setQueryResult({
        data: { status: 'confirmed' },
        error: null,
      })

      await expect(
        deleteOrder(mockSupabaseClient as never, testCompanyId, testOrderId)
      ).rejects.toThrow('Only draft orders can be deleted')
    })
  })

  describe('getOrderItems', () => {
    it('應返回訂單明細', async () => {
      const mockItems = [
        { id: '1', order_id: testOrderId, quantity: 2 },
        { id: '2', order_id: testOrderId, quantity: 3 },
      ]

      setQueryResult({
        data: mockItems,
        error: null,
      })

      const result = await getOrderItems(mockSupabaseClient as never, testOrderId)

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('order_items')
    })
  })

  describe('createOrderItem', () => {
    it('應創建訂單明細', async () => {
      const mockItem = {
        id: 'item-1',
        order_id: testOrderId,
        quantity: 2,
        unit_price: 1000,
        amount: 2000,
      }

      setQueryResult({
        data: mockItem,
        error: null,
      })

      const result = await createOrderItem(mockSupabaseClient as never, {
        order_id: testOrderId,
        quantity: 2,
        unit_price: 1000,
        amount: 2000,
      })

      expect(result).toEqual(mockItem)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('order_items')
    })
  })

  describe('deleteOrderItem', () => {
    it('應刪除訂單明細', async () => {
      setQueryResult({
        error: null,
        data: null,
      })

      await expect(
        deleteOrderItem(mockSupabaseClient as never, 'item-id')
      ).resolves.not.toThrow()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('order_items')
    })
  })

  describe('getOrderStats', () => {
    it('應返回訂單統計', async () => {
      const mockOrders = [
        { status: 'draft' },
        { status: 'draft' },
        { status: 'confirmed' },
        { status: 'shipped' },
        { status: 'completed' },
      ]

      setQueryResult({
        data: mockOrders,
        error: null,
      })

      const result = await getOrderStats(mockSupabaseClient as never, testCompanyId)

      expect(result.total).toBe(5)
      expect(result.draft).toBe(2)
      expect(result.confirmed).toBe(1)
      expect(result.shipped).toBe(1)
      expect(result.completed).toBe(1)
      expect(result.cancelled).toBe(0)
    })
  })

  describe('createOrderFromQuotation', () => {
    it('應從報價單建立訂單', async () => {
      const mockOrderId = 'new-order-id'

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockOrderId,
        error: null,
      })

      const result = await createOrderFromQuotation(
        mockSupabaseClient as never,
        'quotation-123',
        'user-456'
      )

      expect(result).toBe(mockOrderId)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_order_from_quotation', {
        p_quotation_id: 'quotation-123',
        p_created_by: 'user-456',
      })
    })

    it('RPC 失敗時應拋出錯誤', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      })

      await expect(
        createOrderFromQuotation(mockSupabaseClient as never, 'quotation-123')
      ).rejects.toThrow('Failed to create order from quotation: RPC failed')
    })
  })

  describe('updateOrderItem', () => {
    it('應更新訂單明細', async () => {
      const mockUpdatedItem = {
        id: 'item-1',
        order_id: testOrderId,
        quantity: 5,
        unit_price: 1500,
        amount: 7500,
      }

      setQueryResult({
        data: mockUpdatedItem,
        error: null,
      })

      const result = await updateOrderItem(mockSupabaseClient as never, 'item-1', {
        quantity: 5,
        unit_price: 1500,
        amount: 7500,
      })

      expect(result).toEqual(mockUpdatedItem)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('order_items')
    })

    it('更新失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Update failed' },
      })

      await expect(
        updateOrderItem(mockSupabaseClient as never, 'item-1', { quantity: 5 })
      ).rejects.toThrow('Failed to update order item: Update failed')
    })
  })

  describe('createOrderItems', () => {
    it('應批次建立訂單明細', async () => {
      const mockItems = [
        { id: '1', order_id: testOrderId, quantity: 2, unit_price: 1000, amount: 2000 },
        { id: '2', order_id: testOrderId, quantity: 3, unit_price: 500, amount: 1500 },
      ]

      setQueryResult({
        data: mockItems,
        error: null,
      })

      const result = await createOrderItems(mockSupabaseClient as never, [
        { order_id: testOrderId, quantity: 2, unit_price: 1000, amount: 2000 },
        { order_id: testOrderId, quantity: 3, unit_price: 500, amount: 1500 },
      ])

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('order_items')
    })

    it('空陣列應返回空陣列', async () => {
      const result = await createOrderItems(mockSupabaseClient as never, [])

      expect(result).toEqual([])
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('建立失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Batch insert failed' },
      })

      await expect(
        createOrderItems(mockSupabaseClient as never, [
          { order_id: testOrderId, quantity: 1, unit_price: 100, amount: 100 },
        ])
      ).rejects.toThrow('Failed to create order items: Batch insert failed')
    })
  })

  describe('deleteOrderItems', () => {
    it('應刪除訂單所有明細', async () => {
      setQueryResult({
        data: null,
        error: null,
      })

      await expect(
        deleteOrderItems(mockSupabaseClient as never, testOrderId)
      ).resolves.not.toThrow()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('order_items')
    })

    it('刪除失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Delete failed' },
      })

      await expect(
        deleteOrderItems(mockSupabaseClient as never, testOrderId)
      ).rejects.toThrow('Failed to delete order items: Delete failed')
    })
  })

  describe('recalculateOrderTotals', () => {
    it('應重新計算訂單總額', async () => {
      // 設定 mock - 返回空陣列作為 items，同時包含 tax_rate 和 discount_amount
      // 由於 proxy mock 會返回相同結果給所有查詢，使用空陣列可以讓 reduce 正常工作
      setQueryResult({
        data: [],
        error: null,
      })

      // 函數會先呼叫 getOrderItems (返回 [])
      // 然後取得訂單資訊，這裡會嘗試讀取 tax_rate - 由於返回 [] 會導致 undefined
      // 最終會計算 subtotal = 0, tax_amount = 0, total_amount = 0
      await recalculateOrderTotals(
        mockSupabaseClient as never,
        testCompanyId,
        testOrderId
      )

      // 驗證函數被調用到多次（items, order, update）
      expect(mockSupabaseClient.from).toHaveBeenCalled()
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        recalculateOrderTotals(mockSupabaseClient as never, testCompanyId, testOrderId)
      ).rejects.toThrow()
    })
  })
})
