/**
 * 報價單 DAL 單元測試
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getQuotationItems,
  createQuotationItem,
  deleteQuotationItem,
  generateQuotationNumber,
  validateCustomerOwnership,
} from '@/lib/dal/quotations'
import {
  mockSupabaseClient,
  resetQueryBuilder,
  setQueryResult,
  createMockQuotation,
  createMockQuotationItem,
} from '../../mocks/supabase'

// Mock supabase-client
vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  SupabaseClient: vi.fn(),
}))

describe('Quotations DAL', () => {
  const testUserId = 'test-user-id'
  const testQuotationId = 'test-quotation-id'
  const testCompanyId = 'test-company-id'

  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryBuilder()
  })

  describe('getQuotations', () => {
    it('應返回用戶的報價單列表', async () => {
      const mockQuotations = [
        createMockQuotation({ id: '1' }),
        createMockQuotation({ id: '2' }),
      ]

      setQueryResult({
        data: mockQuotations,
        error: null,
      })

      const result = await getQuotations(mockSupabaseClient as never, testUserId)

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('quotations')
    })

    it('應支援 companyId 過濾', async () => {
      setQueryResult({
        data: [createMockQuotation()],
        error: null,
      })

      const result = await getQuotations(mockSupabaseClient as never, testUserId, {
        companyId: testCompanyId,
      })

      expect(result).toBeDefined()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('quotations')
    })

    it('應支援 status 過濾', async () => {
      setQueryResult({
        data: [createMockQuotation({ status: 'sent' })],
        error: null,
      })

      const result = await getQuotations(mockSupabaseClient as never, testUserId, {
        status: 'sent',
      })

      expect(result).toBeDefined()
    })

    it('應支援 owner 過濾', async () => {
      const ownerId = 'owner-123'
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getQuotations(mockSupabaseClient as never, testUserId, {
        filterByOwner: true,
        ownerId,
      })

      expect(result).toEqual([])
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        getQuotations(mockSupabaseClient as never, testUserId)
      ).rejects.toThrow('Failed to get quotations: Database error')
    })

    it('應返回空陣列當沒有資料', async () => {
      setQueryResult({
        data: null,
        error: null,
      })

      const result = await getQuotations(mockSupabaseClient as never, testUserId)

      expect(result).toEqual([])
    })
  })

  describe('getQuotationById', () => {
    it('應返回指定報價單', async () => {
      const mockQuotation = createMockQuotation()
      const mockCompany = {
        logo_url: 'https://example.com/logo.png',
        name: { zh: '測試公司', en: 'Test Company' },
        tax_id: '12345678',
        phone: '0223456789',
        email: 'company@test.com',
        website: 'https://test.com',
        address: { zh: '台北市', en: 'Taipei' },
      }

      setQueryResult({
        data: { ...mockQuotation, companies: mockCompany },
        error: null,
      })

      const result = await getQuotationById(
        mockSupabaseClient as never,
        testUserId,
        testQuotationId
      )

      expect(result).toBeDefined()
      expect(result?.company_logo_url).toBe(mockCompany.logo_url)
      expect(result?.company_name).toEqual(mockCompany.name)
    })

    it('不存在時應返回 null', async () => {
      setQueryResult({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getQuotationById(
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
        getQuotationById(mockSupabaseClient as never, testUserId, testQuotationId)
      ).rejects.toThrow('Failed to get quotation: Unexpected error')
    })
  })

  describe('createQuotation', () => {
    it('應創建新報價單', async () => {
      const mockCreated = createMockQuotation()

      setQueryResult({
        data: mockCreated,
        error: null,
      })

      const result = await createQuotation(mockSupabaseClient as never, testUserId, {
        customer_id: 'customer-123',
        quotation_number: 'QT-2025-001',
        issue_date: '2025-01-01',
        valid_until: '2025-01-31',
        currency: 'TWD',
      })

      expect(result).toEqual(mockCreated)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('quotations')
    })

    it('應使用預設值', async () => {
      const mockCreated = createMockQuotation()

      setQueryResult({
        data: mockCreated,
        error: null,
      })

      await createQuotation(mockSupabaseClient as never, testUserId, {
        customer_id: 'customer-123',
        quotation_number: 'QT-2025-001',
        issue_date: '2025-01-01',
        valid_until: '2025-01-31',
        currency: 'TWD',
      })

      // 驗證 from 被呼叫
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('quotations')
    })

    it('創建失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Insert failed' },
      })

      await expect(
        createQuotation(mockSupabaseClient as never, testUserId, {
          customer_id: 'customer-123',
          quotation_number: 'QT-2025-001',
          issue_date: '2025-01-01',
          valid_until: '2025-01-31',
          currency: 'TWD',
        })
      ).rejects.toThrow('Failed to create quotation: Insert failed')
    })
  })

  describe('updateQuotation', () => {
    it('應更新報價單', async () => {
      const mockUpdated = createMockQuotation({ status: 'sent' })

      setQueryResult({
        data: mockUpdated,
        error: null,
      })

      const result = await updateQuotation(
        mockSupabaseClient as never,
        testUserId,
        testQuotationId,
        { status: 'sent' }
      )

      expect(result.status).toBe('sent')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('quotations')
    })

    it('更新失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Update failed' },
      })

      await expect(
        updateQuotation(mockSupabaseClient as never, testUserId, testQuotationId, {
          status: 'sent',
        })
      ).rejects.toThrow('Failed to update quotation: Update failed')
    })
  })

  describe('deleteQuotation', () => {
    it('應刪除報價單', async () => {
      setQueryResult({
        error: null,
        data: null,
        count: 1,
      })

      await expect(
        deleteQuotation(mockSupabaseClient as never, testUserId, testQuotationId)
      ).resolves.not.toThrow()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('quotations')
    })

    it('刪除失敗時應拋出錯誤', async () => {
      setQueryResult({
        error: { message: 'Delete failed' },
        data: null,
        count: 0,
      })

      await expect(
        deleteQuotation(mockSupabaseClient as never, testUserId, testQuotationId)
      ).rejects.toThrow('Failed to delete quotation: Delete failed')
    })

    it('找不到報價單時應拋出錯誤', async () => {
      setQueryResult({
        error: null,
        data: null,
        count: 0,
      })

      await expect(
        deleteQuotation(mockSupabaseClient as never, testUserId, 'non-existent')
      ).rejects.toThrow('Quotation not found or already deleted')
    })
  })

  describe('getQuotationItems', () => {
    it('應返回報價項目列表', async () => {
      const mockItems = [
        createMockQuotationItem({ id: '1' }),
        createMockQuotationItem({ id: '2' }),
      ]

      setQueryResult({
        data: mockItems,
        error: null,
      })

      const result = await getQuotationItems(
        mockSupabaseClient as never,
        testQuotationId
      )

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('quotation_items')
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Query failed' },
      })

      await expect(
        getQuotationItems(mockSupabaseClient as never, testQuotationId)
      ).rejects.toThrow('Failed to get quotation items: Query failed')
    })
  })

  describe('createQuotationItem', () => {
    it('應創建報價項目', async () => {
      const mockItem = createMockQuotationItem()

      setQueryResult({
        data: mockItem,
        error: null,
      })

      const result = await createQuotationItem(mockSupabaseClient as never, {
        quotation_id: testQuotationId,
        description: { zh: '測試項目', en: 'Test Item' },
        quantity: 2,
        unit_price: 1000,
        subtotal: 2000,
      })

      expect(result).toEqual(mockItem)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('quotation_items')
    })

    it('創建失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Insert failed' },
      })

      await expect(
        createQuotationItem(mockSupabaseClient as never, {
          quotation_id: testQuotationId,
          description: { zh: '測試', en: 'Test' },
          quantity: 1,
          unit_price: 100,
          subtotal: 100,
        })
      ).rejects.toThrow('Failed to create quotation item: Insert failed')
    })
  })

  describe('deleteQuotationItem', () => {
    it('應刪除報價項目', async () => {
      setQueryResult({
        error: null,
        data: null,
      })

      await expect(
        deleteQuotationItem(mockSupabaseClient as never, 'item-id')
      ).resolves.not.toThrow()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('quotation_items')
    })

    it('刪除失敗時應拋出錯誤', async () => {
      setQueryResult({
        error: { message: 'Delete failed' },
        data: null,
      })

      await expect(
        deleteQuotationItem(mockSupabaseClient as never, 'item-id')
      ).rejects.toThrow('Failed to delete quotation item: Delete failed')
    })
  })

  describe('generateQuotationNumber', () => {
    it('應生成唯一編號', async () => {
      const mockNumber = 'QT-2025-0001'

      const mockRpc = vi.fn().mockResolvedValue({
        data: mockNumber,
        error: null,
      })
      const mockClient = { ...mockSupabaseClient, rpc: mockRpc }

      const result = await generateQuotationNumber(
        mockClient as never,
        testCompanyId
      )

      expect(result).toBe(mockNumber)
      expect(mockRpc).toHaveBeenCalledWith('generate_quotation_number_atomic', {
        p_company_id: testCompanyId,
      })
    })

    it('生成失敗時應拋出錯誤', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      })
      const mockClient = { ...mockSupabaseClient, rpc: mockRpc }

      await expect(
        generateQuotationNumber(mockClient as never, testCompanyId)
      ).rejects.toThrow('Failed to generate quotation number: RPC failed')
    })

    it('無返回資料時應拋出錯誤', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })
      const mockClient = { ...mockSupabaseClient, rpc: mockRpc }

      await expect(
        generateQuotationNumber(mockClient as never, testCompanyId)
      ).rejects.toThrow('Failed to generate quotation number: no data returned')
    })
  })

  describe('validateCustomerOwnership', () => {
    it('應驗證客戶所有權 - 擁有', async () => {
      setQueryResult({
        data: { id: 'customer-123' },
        error: null,
      })

      const result = await validateCustomerOwnership(
        mockSupabaseClient as never,
        'customer-123',
        testUserId
      )

      expect(result).toBe(true)
    })

    it('應驗證客戶所有權 - 不擁有', async () => {
      setQueryResult({
        data: null,
        error: null,
      })

      const result = await validateCustomerOwnership(
        mockSupabaseClient as never,
        'customer-123',
        testUserId
      )

      expect(result).toBe(false)
    })
  })
})
