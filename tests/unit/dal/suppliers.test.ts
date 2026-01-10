/**
 * 供應商 DAL 單元測試
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSuppliersByIds,
  searchSuppliers,
  generateSupplierNumber,
  getActiveSuppliers,
} from '@/lib/dal/suppliers'
import {
  mockSupabaseClient,
  resetQueryBuilder,
  setQueryResult,
  createMockSupplier,
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

describe('Suppliers DAL', () => {
  const testUserId = 'test-user-id'
  const testSupplierId = 'test-supplier-id'
  const testCompanyId = 'test-company-id'

  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryBuilder()
  })

  describe('getSuppliers', () => {
    it('應返回供應商列表', async () => {
      const mockSuppliers = [
        createMockSupplier({ id: '1' }),
        createMockSupplier({ id: '2' }),
      ]

      setQueryResult({
        data: mockSuppliers,
        error: null,
      })

      const result = await getSuppliers(mockSupabaseClient as never, testUserId)

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('suppliers')
    })

    it('應支援 companyId 過濾', async () => {
      setQueryResult({
        data: [createMockSupplier()],
        error: null,
      })

      const result = await getSuppliers(mockSupabaseClient as never, testUserId, {
        companyId: testCompanyId,
      })

      expect(result).toBeDefined()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('suppliers')
    })

    it('應支援 isActive 過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await getSuppliers(mockSupabaseClient as never, testUserId, {
        isActive: true,
      })

      expect(result).toEqual([])
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        getSuppliers(mockSupabaseClient as never, testUserId)
      ).rejects.toThrow('Failed to get suppliers: Database error')
    })
  })

  describe('getSupplierById', () => {
    it('應返回指定供應商', async () => {
      const mockSupplier = createMockSupplier()

      setQueryResult({
        data: mockSupplier,
        error: null,
      })

      const result = await getSupplierById(
        mockSupabaseClient as never,
        testSupplierId
      )

      expect(result).toEqual(mockSupplier)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('suppliers')
    })

    it('不存在時應返回 null', async () => {
      setQueryResult({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getSupplierById(
        mockSupabaseClient as never,
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
        getSupplierById(mockSupabaseClient as never, testSupplierId)
      ).rejects.toThrow('Failed to get supplier: Unexpected error')
    })
  })

  describe('createSupplier', () => {
    it('應創建新供應商', async () => {
      const mockCreated = createMockSupplier()

      setQueryResult({
        data: mockCreated,
        error: null,
      })

      const result = await createSupplier(mockSupabaseClient as never, testUserId, {
        company_id: testCompanyId,
        name: { zh: '新供應商', en: 'New Supplier' },
      })

      expect(result).toEqual(mockCreated)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('suppliers')
    })

    it('創建失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Insert failed' },
      })

      await expect(
        createSupplier(mockSupabaseClient as never, testUserId, {
          company_id: testCompanyId,
          name: { zh: '供應商', en: 'Supplier' },
        })
      ).rejects.toThrow('Failed to create supplier: Insert failed')
    })
  })

  describe('updateSupplier', () => {
    it('應更新供應商', async () => {
      const mockUpdated = createMockSupplier({ is_active: false })

      setQueryResult({
        data: mockUpdated,
        error: null,
      })

      const result = await updateSupplier(
        mockSupabaseClient as never,
        testSupplierId,
        { is_active: false }
      )

      expect(result.is_active).toBe(false)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('suppliers')
    })

    it('更新失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Update failed' },
      })

      await expect(
        updateSupplier(mockSupabaseClient as never, testSupplierId, {
          is_active: false,
        })
      ).rejects.toThrow('Failed to update supplier: Update failed')
    })
  })

  describe('deleteSupplier', () => {
    it('應刪除供應商', async () => {
      setQueryResult({
        error: null,
        data: null,
      })

      await expect(
        deleteSupplier(mockSupabaseClient as never, testSupplierId)
      ).resolves.not.toThrow()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('suppliers')
    })

    it('刪除失敗時應拋出錯誤', async () => {
      setQueryResult({
        error: { message: 'Delete failed' },
        data: null,
      })

      await expect(
        deleteSupplier(mockSupabaseClient as never, testSupplierId)
      ).rejects.toThrow('Failed to delete supplier: Delete failed')
    })
  })

  describe('getSuppliersByIds', () => {
    it('應批量獲取供應商', async () => {
      const mockSuppliers = [
        createMockSupplier({ id: '1' }),
        createMockSupplier({ id: '2' }),
      ]

      setQueryResult({
        data: mockSuppliers,
        error: null,
      })

      const result = await getSuppliersByIds(mockSupabaseClient as never, ['1', '2'])

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(2)
      expect(result.get('1')).toBeDefined()
      expect(result.get('2')).toBeDefined()
    })

    it('空陣列時應返回空 Map', async () => {
      const result = await getSuppliersByIds(mockSupabaseClient as never, [])

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('應去除重複 ID', async () => {
      setQueryResult({
        data: [createMockSupplier({ id: '1' })],
        error: null,
      })

      const result = await getSuppliersByIds(mockSupabaseClient as never, ['1', '1', '1'])

      expect(result.size).toBe(1)
    })
  })

  describe('searchSuppliers', () => {
    it('應搜尋供應商', async () => {
      const mockSuppliers = [createMockSupplier()]

      setQueryResult({
        data: mockSuppliers,
        error: null,
      })

      const result = await searchSuppliers(mockSupabaseClient as never, 'test')

      expect(result).toHaveLength(1)
    })

    it('空查詢應返回空陣列', async () => {
      const { sanitizeSearchQuery } = await import('@/lib/security')
      vi.mocked(sanitizeSearchQuery).mockReturnValueOnce('')

      const result = await searchSuppliers(mockSupabaseClient as never, '')

      expect(result).toEqual([])
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('應支援 companyId 過濾', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await searchSuppliers(mockSupabaseClient as never, 'test', testCompanyId)

      expect(result).toEqual([])
    })
  })

  describe('generateSupplierNumber', () => {
    it('應生成供應商編號', async () => {
      const mockNumber = 'SUP-2025-0001'

      const mockRpc = vi.fn().mockResolvedValue({
        data: mockNumber,
        error: null,
      })
      const mockClient = { ...mockSupabaseClient, rpc: mockRpc }

      const result = await generateSupplierNumber(mockClient as never, testCompanyId)

      expect(result).toBe(mockNumber)
      expect(mockRpc).toHaveBeenCalledWith('generate_supplier_number_atomic', {
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
        generateSupplierNumber(mockClient as never, testCompanyId)
      ).rejects.toThrow('Failed to generate supplier number: RPC failed')
    })

    it('無返回資料時應拋出錯誤', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })
      const mockClient = { ...mockSupabaseClient, rpc: mockRpc }

      await expect(
        generateSupplierNumber(mockClient as never, testCompanyId)
      ).rejects.toThrow('Failed to generate supplier number: no data returned')
    })
  })

  describe('getActiveSuppliers', () => {
    it('應返回啟用中的供應商', async () => {
      const mockSuppliers = [
        createMockSupplier({ is_active: true }),
      ]

      setQueryResult({
        data: mockSuppliers,
        error: null,
      })

      const result = await getActiveSuppliers(
        mockSupabaseClient as never,
        testCompanyId
      )

      expect(result).toHaveLength(1)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('suppliers')
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Query failed' },
      })

      await expect(
        getActiveSuppliers(mockSupabaseClient as never, testCompanyId)
      ).rejects.toThrow('Failed to get active suppliers: Query failed')
    })
  })
})
