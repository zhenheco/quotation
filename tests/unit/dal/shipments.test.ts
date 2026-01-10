/**
 * 出貨單 DAL 單元測試
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getShipments,
  getShipmentById,
  createShipment,
  updateShipment,
  shipShipment,
  deliverShipment,
  cancelShipment,
  deleteShipment,
  getShipmentItems,
  createShipmentItem,
  deleteShipmentItem,
  getShipmentStats,
  getShipmentsByOrderId,
} from '@/lib/dal/shipments'
import {
  mockSupabaseClient,
  resetQueryBuilder,
  setQueryResult,
  createMockShipment,
} from '../../mocks/supabase'

// Mock supabase-client
vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  SupabaseClient: vi.fn(),
}))

describe('Shipments DAL', () => {
  const testCompanyId = 'test-company-id'
  const testShipmentId = 'test-shipment-id'
  const testOrderId = 'test-order-id'

  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryBuilder()
  })

  describe('getShipments', () => {
    it('應返回出貨單列表', async () => {
      const mockShipments = [
        { ...createMockShipment({ id: '1' }), order: null, customer: null },
        { ...createMockShipment({ id: '2' }), order: null, customer: null },
      ]

      setQueryResult({
        data: mockShipments,
        error: null,
      })

      const result = await getShipments(mockSupabaseClient as never, {
        companyId: testCompanyId,
      })

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shipments')
    })

    it('應支援 status 過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getShipments(mockSupabaseClient as never, {
        companyId: testCompanyId,
        status: 'in_transit',
      })

      expect(result).toEqual([])
    })

    it('應支援 orderId 過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getShipments(mockSupabaseClient as never, {
        companyId: testCompanyId,
        orderId: testOrderId,
      })

      expect(result).toEqual([])
    })

    it('應支援日期範圍過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getShipments(mockSupabaseClient as never, {
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
        getShipments(mockSupabaseClient as never, { companyId: testCompanyId })
      ).rejects.toThrow('Failed to get shipments: Database error')
    })
  })

  describe('getShipmentById', () => {
    it('應返回指定出貨單', async () => {
      const mockShipment = { ...createMockShipment(), order: null, customer: null }

      setQueryResult({
        data: mockShipment,
        error: null,
      })

      const result = await getShipmentById(
        mockSupabaseClient as never,
        testCompanyId,
        testShipmentId
      )

      expect(result).toBeDefined()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shipments')
    })

    it('不存在時應返回 null', async () => {
      setQueryResult({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getShipmentById(
        mockSupabaseClient as never,
        testCompanyId,
        'non-existent'
      )

      expect(result).toBeNull()
    })
  })

  describe('createShipment', () => {
    it('應創建新出貨單', async () => {
      const mockCreated = createMockShipment()

      setQueryResult({
        data: mockCreated,
        error: null,
      })

      const result = await createShipment(mockSupabaseClient as never, {
        company_id: testCompanyId,
        order_id: testOrderId,
      })

      expect(result).toEqual(mockCreated)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shipments')
    })

    it('創建失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Insert failed' },
      })

      await expect(
        createShipment(mockSupabaseClient as never, {
          company_id: testCompanyId,
          order_id: testOrderId,
        })
      ).rejects.toThrow('Failed to create shipment: Insert failed')
    })
  })

  describe('updateShipment', () => {
    it('應更新出貨單', async () => {
      const mockUpdated = createMockShipment({ status: 'in_transit' })

      setQueryResult({
        data: mockUpdated,
        error: null,
      })

      const result = await updateShipment(
        mockSupabaseClient as never,
        testCompanyId,
        testShipmentId,
        { status: 'in_transit' }
      )

      expect(result.status).toBe('in_transit')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shipments')
    })
  })

  describe('shipShipment', () => {
    it('應標記出貨（從待處理變為運送中）', async () => {
      setQueryResult({
        data: { status: 'pending' },
        error: null,
      })

      await shipShipment(
        mockSupabaseClient as never,
        testCompanyId,
        testShipmentId,
        '2025-01-18',
        'FedEx',
        'TRK123456'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalled()
    })

    it('非待處理出貨單應拋出錯誤', async () => {
      setQueryResult({
        data: { status: 'delivered' },
        error: null,
      })

      await expect(
        shipShipment(
          mockSupabaseClient as never,
          testCompanyId,
          testShipmentId
        )
      ).rejects.toThrow('Only pending shipments can be shipped')
    })
  })

  describe('deliverShipment', () => {
    it('應標記送達', async () => {
      setQueryResult({
        data: { status: 'in_transit' },
        error: null,
      })

      await deliverShipment(
        mockSupabaseClient as never,
        testCompanyId,
        testShipmentId,
        '2025-01-20'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalled()
    })

    it('已取消出貨單不能標記送達', async () => {
      setQueryResult({
        data: { status: 'cancelled' },
        error: null,
      })

      await expect(
        deliverShipment(
          mockSupabaseClient as never,
          testCompanyId,
          testShipmentId
        )
      ).rejects.toThrow('Only in-transit or pending shipments can be delivered')
    })
  })

  describe('cancelShipment', () => {
    it('應取消出貨單', async () => {
      setQueryResult({
        data: { status: 'pending' },
        error: null,
      })

      await cancelShipment(
        mockSupabaseClient as never,
        testCompanyId,
        testShipmentId
      )

      expect(mockSupabaseClient.from).toHaveBeenCalled()
    })

    it('已送達出貨單不能取消', async () => {
      setQueryResult({
        data: { status: 'delivered' },
        error: null,
      })

      await expect(
        cancelShipment(
          mockSupabaseClient as never,
          testCompanyId,
          testShipmentId
        )
      ).rejects.toThrow('Cannot cancel shipment with status: delivered')
    })
  })

  describe('deleteShipment', () => {
    it('應刪除待處理出貨單', async () => {
      setQueryResult({
        data: { status: 'pending' },
        error: null,
      })

      await expect(
        deleteShipment(mockSupabaseClient as never, testCompanyId, testShipmentId)
      ).resolves.not.toThrow()
    })

    it('非待處理出貨單不能刪除', async () => {
      setQueryResult({
        data: { status: 'in_transit' },
        error: null,
      })

      await expect(
        deleteShipment(mockSupabaseClient as never, testCompanyId, testShipmentId)
      ).rejects.toThrow('Only pending shipments can be deleted')
    })
  })

  describe('getShipmentItems', () => {
    it('應返回出貨明細', async () => {
      const mockItems = [
        { id: '1', shipment_id: testShipmentId, quantity_shipped: 2 },
        { id: '2', shipment_id: testShipmentId, quantity_shipped: 3 },
      ]

      setQueryResult({
        data: mockItems,
        error: null,
      })

      const result = await getShipmentItems(mockSupabaseClient as never, testShipmentId)

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shipment_items')
    })
  })

  describe('createShipmentItem', () => {
    it('應創建出貨明細', async () => {
      const mockItem = {
        id: 'item-1',
        shipment_id: testShipmentId,
        quantity_shipped: 2,
        unit_price: 1000,
        amount: 2000,
      }

      setQueryResult({
        data: mockItem,
        error: null,
      })

      const result = await createShipmentItem(mockSupabaseClient as never, {
        shipment_id: testShipmentId,
        quantity_shipped: 2,
      })

      expect(result).toEqual(mockItem)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shipment_items')
    })
  })

  describe('deleteShipmentItem', () => {
    it('應刪除出貨明細', async () => {
      setQueryResult({
        error: null,
        data: null,
      })

      await expect(
        deleteShipmentItem(mockSupabaseClient as never, 'item-id')
      ).resolves.not.toThrow()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shipment_items')
    })
  })

  describe('getShipmentStats', () => {
    it('應返回出貨單統計', async () => {
      const mockShipments = [
        { status: 'pending' },
        { status: 'pending' },
        { status: 'in_transit' },
        { status: 'delivered' },
        { status: 'delivered' },
      ]

      setQueryResult({
        data: mockShipments,
        error: null,
      })

      const result = await getShipmentStats(mockSupabaseClient as never, testCompanyId)

      expect(result.total).toBe(5)
      expect(result.pending).toBe(2)
      expect(result.in_transit).toBe(1)
      expect(result.delivered).toBe(2)
      expect(result.cancelled).toBe(0)
    })
  })

  describe('getShipmentsByOrderId', () => {
    it('應返回訂單的所有出貨單', async () => {
      const mockShipments = [
        createMockShipment({ id: '1' }),
        createMockShipment({ id: '2' }),
      ]

      setQueryResult({
        data: mockShipments,
        error: null,
      })

      const result = await getShipmentsByOrderId(
        mockSupabaseClient as never,
        testOrderId
      )

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shipments')
    })
  })
})
