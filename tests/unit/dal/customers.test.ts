/**
 * 客戶 DAL 單元測試
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCustomers,
  getCustomerById,
  getCustomerByIdOnly,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomersByIds,
  searchCustomers,
  generateCustomerNumber,
} from '@/lib/dal/customers'
import {
  mockSupabaseClient,
  resetQueryBuilder,
  setQueryResult,
  createMockCustomer,
} from '../../mocks/supabase'

// Mock supabase-client
vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  SupabaseClient: vi.fn(),
}))

// Mock security module
vi.mock('@/lib/security', () => ({
  sanitizeSearchQuery: vi.fn((query: string) => query.replace(/[%_]/g, '')),
}))

describe('Customers DAL', () => {
  const testUserId = 'test-user-id'
  const testCustomerId = 'test-customer-id'
  const testCompanyId = 'test-company-id'

  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryBuilder()
  })

  describe('getCustomers', () => {
    it('應返回客戶列表', async () => {
      const mockCustomers = [
        createMockCustomer({ id: '1' }),
        createMockCustomer({ id: '2' }),
      ]

      setQueryResult({
        data: mockCustomers,
        error: null,
      })

      const result = await getCustomers(mockSupabaseClient as never, testUserId)

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers')
    })

    it('應支援 companyId 過濾', async () => {
      setQueryResult({
        data: [createMockCustomer()],
        error: null,
      })

      const result = await getCustomers(mockSupabaseClient as never, testUserId, {
        companyId: testCompanyId,
      })

      expect(result).toBeDefined()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers')
    })

    it('應支援 owner 過濾', async () => {
      const ownerId = 'owner-123'
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getCustomers(mockSupabaseClient as never, testUserId, {
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
        getCustomers(mockSupabaseClient as never, testUserId)
      ).rejects.toThrow('Failed to get customers: Database error')
    })

    it('應返回空陣列當沒有資料', async () => {
      setQueryResult({
        data: null,
        error: null,
      })

      const result = await getCustomers(mockSupabaseClient as never, testUserId)

      expect(result).toEqual([])
    })
  })

  describe('getCustomerById', () => {
    it('應返回指定客戶', async () => {
      const mockCustomer = createMockCustomer()

      setQueryResult({
        data: mockCustomer,
        error: null,
      })

      const result = await getCustomerById(
        mockSupabaseClient as never,
        testUserId,
        testCustomerId
      )

      expect(result).toEqual(mockCustomer)
    })

    it('不存在時應返回 null', async () => {
      setQueryResult({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getCustomerById(
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
        getCustomerById(mockSupabaseClient as never, testUserId, testCustomerId)
      ).rejects.toThrow('Failed to get customer: Unexpected error')
    })
  })

  describe('getCustomerByIdOnly', () => {
    it('應返回客戶（不限制 user_id）', async () => {
      const mockCustomer = createMockCustomer()

      setQueryResult({
        data: mockCustomer,
        error: null,
      })

      const result = await getCustomerByIdOnly(
        mockSupabaseClient as never,
        testCustomerId
      )

      expect(result).toEqual(mockCustomer)
    })

    it('不存在時應返回 null', async () => {
      setQueryResult({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getCustomerByIdOnly(
        mockSupabaseClient as never,
        'non-existent-id'
      )

      expect(result).toBeNull()
    })
  })

  describe('createCustomer', () => {
    it('應創建新客戶', async () => {
      const mockCreated = createMockCustomer()

      setQueryResult({
        data: mockCreated,
        error: null,
      })

      const result = await createCustomer(mockSupabaseClient as never, testUserId, {
        name: { zh: '新客戶', en: 'New Customer' },
        email: 'new@example.com',
      })

      expect(result).toEqual(mockCreated)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers')
    })

    it('應設置預設值', async () => {
      const mockCreated = createMockCustomer()

      setQueryResult({
        data: mockCreated,
        error: null,
      })

      await createCustomer(mockSupabaseClient as never, testUserId, {
        name: { zh: '客戶', en: 'Customer' },
        email: 'test@example.com',
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers')
    })

    it('創建失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Insert failed' },
      })

      await expect(
        createCustomer(mockSupabaseClient as never, testUserId, {
          name: { zh: '客戶', en: 'Customer' },
          email: 'test@example.com',
        })
      ).rejects.toThrow('Failed to create customer: Insert failed')
    })
  })

  describe('updateCustomer', () => {
    it('應更新客戶', async () => {
      const mockUpdated = createMockCustomer({ email: 'updated@example.com' })

      setQueryResult({
        data: mockUpdated,
        error: null,
      })

      const result = await updateCustomer(
        mockSupabaseClient as never,
        testUserId,
        testCustomerId,
        { email: 'updated@example.com' }
      )

      expect(result.email).toBe('updated@example.com')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers')
    })

    it('更新失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Update failed' },
      })

      await expect(
        updateCustomer(mockSupabaseClient as never, testUserId, testCustomerId, {
          email: 'test@example.com',
        })
      ).rejects.toThrow('Failed to update customer: Update failed')
    })
  })

  describe('deleteCustomer', () => {
    it('應刪除客戶', async () => {
      setQueryResult({
        error: null,
        data: null,
        count: 1,
      })

      await expect(
        deleteCustomer(mockSupabaseClient as never, testUserId, testCustomerId)
      ).resolves.not.toThrow()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers')
    })

    it('刪除失敗時應拋出錯誤', async () => {
      setQueryResult({
        error: { message: 'Delete failed' },
        data: null,
        count: 0,
      })

      await expect(
        deleteCustomer(mockSupabaseClient as never, testUserId, testCustomerId)
      ).rejects.toThrow('Failed to delete customer: Delete failed')
    })

    it('找不到客戶時應拋出錯誤', async () => {
      setQueryResult({
        error: null,
        data: null,
        count: 0,
      })

      await expect(
        deleteCustomer(mockSupabaseClient as never, testUserId, 'non-existent')
      ).rejects.toThrow('Customer not found or already deleted')
    })
  })

  describe('getCustomersByIds', () => {
    it('應批量獲取客戶', async () => {
      const mockCustomers = [
        createMockCustomer({ id: '1' }),
        createMockCustomer({ id: '2' }),
      ]

      setQueryResult({
        data: mockCustomers,
        error: null,
      })

      const result = await getCustomersByIds(
        mockSupabaseClient as never,
        testUserId,
        ['1', '2']
      )

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(2)
      expect(result.get('1')).toBeDefined()
      expect(result.get('2')).toBeDefined()
    })

    it('空陣列時應返回空 Map', async () => {
      const result = await getCustomersByIds(
        mockSupabaseClient as never,
        testUserId,
        []
      )

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('應去除重複 ID', async () => {
      setQueryResult({
        data: [createMockCustomer({ id: '1' })],
        error: null,
      })

      const result = await getCustomersByIds(
        mockSupabaseClient as never,
        testUserId,
        ['1', '1', '1']
      )

      expect(result.size).toBe(1)
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Query failed' },
      })

      await expect(
        getCustomersByIds(mockSupabaseClient as never, testUserId, ['1'])
      ).rejects.toThrow('Failed to get customers: Query failed')
    })
  })

  describe('searchCustomers', () => {
    it('應搜尋客戶', async () => {
      const mockCustomers = [createMockCustomer()]

      setQueryResult({
        data: mockCustomers,
        error: null,
      })

      const result = await searchCustomers(
        mockSupabaseClient as never,
        testUserId,
        'test'
      )

      expect(result).toHaveLength(1)
    })

    it('空查詢應返回空陣列', async () => {
      const { sanitizeSearchQuery } = await import('@/lib/security')
      vi.mocked(sanitizeSearchQuery).mockReturnValueOnce('')

      const result = await searchCustomers(
        mockSupabaseClient as never,
        testUserId,
        ''
      )

      expect(result).toEqual([])
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('應支援 companyId 過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await searchCustomers(
        mockSupabaseClient as never,
        testUserId,
        'test',
        testCompanyId
      )

      expect(result).toEqual([])
    })

    it('搜尋失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Search failed' },
      })

      await expect(
        searchCustomers(mockSupabaseClient as never, testUserId, 'test')
      ).rejects.toThrow('Failed to search customers: Search failed')
    })
  })

  describe('generateCustomerNumber', () => {
    it('應生成客戶編號', async () => {
      const mockNumber = 'CUS-2025-0001'

      const mockRpc = vi.fn().mockResolvedValue({
        data: mockNumber,
        error: null,
      })
      const mockClient = { ...mockSupabaseClient, rpc: mockRpc }

      const result = await generateCustomerNumber(mockClient as never, testCompanyId)

      expect(result).toBe(mockNumber)
      expect(mockRpc).toHaveBeenCalledWith('generate_customer_number_atomic', {
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
        generateCustomerNumber(mockClient as never, testCompanyId)
      ).rejects.toThrow('Failed to generate customer number: RPC failed')
    })

    it('無返回資料時應拋出錯誤', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })
      const mockClient = { ...mockSupabaseClient, rpc: mockRpc }

      await expect(
        generateCustomerNumber(mockClient as never, testCompanyId)
      ).rejects.toThrow('Failed to generate customer number: no data returned')
    })
  })
})
