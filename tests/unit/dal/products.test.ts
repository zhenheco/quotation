/**
 * 產品 DAL 單元測試
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  generateProductNumber,
} from '@/lib/dal/products'
import {
  mockSupabaseClient,
  resetQueryBuilder,
  setQueryResult,
  createMockProduct,
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

describe('Products DAL', () => {
  const testUserId = 'test-user-id'
  const testProductId = 'test-product-id'
  const testCompanyId = 'test-company-id'

  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryBuilder()
  })

  describe('getProducts', () => {
    it('應返回商品列表', async () => {
      const mockProducts = [
        createMockProduct({ id: '1' }),
        createMockProduct({ id: '2' }),
      ]

      setQueryResult({
        data: mockProducts,
        error: null,
      })

      const result = await getProducts(mockSupabaseClient as never, testUserId)

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products')
    })

    it('應支援 companyId 過濾', async () => {
      setQueryResult({
        data: [createMockProduct()],
        error: null,
      })

      const result = await getProducts(mockSupabaseClient as never, testUserId, testCompanyId)

      expect(result).toBeDefined()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products')
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        getProducts(mockSupabaseClient as never, testUserId)
      ).rejects.toThrow('Failed to get products: Database error')
    })

    it('應返回空陣列當沒有資料', async () => {
      setQueryResult({
        data: null,
        error: null,
      })

      const result = await getProducts(mockSupabaseClient as never, testUserId)

      expect(result).toEqual([])
    })
  })

  describe('getProductById', () => {
    it('應返回指定商品', async () => {
      const mockProduct = createMockProduct()

      setQueryResult({
        data: mockProduct,
        error: null,
      })

      const result = await getProductById(
        mockSupabaseClient as never,
        testUserId,
        testProductId
      )

      expect(result).toEqual(mockProduct)
    })

    it('不存在時應返回 null', async () => {
      setQueryResult({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getProductById(
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
        getProductById(mockSupabaseClient as never, testUserId, testProductId)
      ).rejects.toThrow('Failed to get product: Unexpected error')
    })
  })

  describe('createProduct', () => {
    it('應創建新商品', async () => {
      const mockCreated = createMockProduct()

      setQueryResult({
        data: mockCreated,
        error: null,
      })

      const result = await createProduct(mockSupabaseClient as never, testUserId, {
        name: { zh: '新商品', en: 'New Product' },
        base_price: 1000,
        base_currency: 'TWD',
      })

      expect(result).toEqual(mockCreated)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products')
    })

    it('應設置預設值', async () => {
      const mockCreated = createMockProduct()

      setQueryResult({
        data: mockCreated,
        error: null,
      })

      await createProduct(mockSupabaseClient as never, testUserId, {
        name: { zh: '商品', en: 'Product' },
        base_price: 500,
        base_currency: 'USD',
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products')
    })

    it('創建失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Insert failed' },
      })

      await expect(
        createProduct(mockSupabaseClient as never, testUserId, {
          name: { zh: '商品', en: 'Product' },
          base_price: 100,
          base_currency: 'TWD',
        })
      ).rejects.toThrow('Failed to create product: Insert failed')
    })
  })

  describe('updateProduct', () => {
    it('應更新商品', async () => {
      const mockUpdated = createMockProduct({ base_price: 2000 })

      setQueryResult({
        data: mockUpdated,
        error: null,
      })

      const result = await updateProduct(
        mockSupabaseClient as never,
        testUserId,
        testProductId,
        { base_price: 2000 }
      )

      expect(result.base_price).toBe(2000)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products')
    })

    it('更新失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Update failed' },
      })

      await expect(
        updateProduct(mockSupabaseClient as never, testUserId, testProductId, {
          base_price: 999,
        })
      ).rejects.toThrow('Failed to update product: Update failed')
    })
  })

  describe('deleteProduct', () => {
    it('應刪除商品', async () => {
      setQueryResult({
        error: null,
        data: null,
        count: 1,
      })

      await expect(
        deleteProduct(mockSupabaseClient as never, testUserId, testProductId)
      ).resolves.not.toThrow()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products')
    })

    it('刪除失敗時應拋出錯誤', async () => {
      setQueryResult({
        error: { message: 'Delete failed' },
        data: null,
        count: 0,
      })

      await expect(
        deleteProduct(mockSupabaseClient as never, testUserId, testProductId)
      ).rejects.toThrow('Failed to delete product: Delete failed')
    })

    it('找不到商品時應拋出錯誤', async () => {
      setQueryResult({
        error: null,
        data: null,
        count: 0,
      })

      await expect(
        deleteProduct(mockSupabaseClient as never, testUserId, 'non-existent')
      ).rejects.toThrow('Product not found or already deleted')
    })
  })

  describe('searchProducts', () => {
    it('應搜尋商品', async () => {
      const mockProducts = [createMockProduct()]

      setQueryResult({
        data: mockProducts,
        error: null,
      })

      const result = await searchProducts(
        mockSupabaseClient as never,
        testUserId,
        'test'
      )

      expect(result).toHaveLength(1)
    })

    it('空查詢應返回空陣列', async () => {
      const { sanitizeSearchQuery } = await import('@/lib/security')
      vi.mocked(sanitizeSearchQuery).mockReturnValueOnce('')

      const result = await searchProducts(
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

      const result = await searchProducts(
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
        searchProducts(mockSupabaseClient as never, testUserId, 'test')
      ).rejects.toThrow('Failed to search products: Search failed')
    })
  })

  describe('generateProductNumber', () => {
    it('應生成商品編號', async () => {
      const mockNumber = 'PRD-2025-0001'

      const mockRpc = vi.fn().mockResolvedValue({
        data: mockNumber,
        error: null,
      })
      const mockClient = { ...mockSupabaseClient, rpc: mockRpc }

      const result = await generateProductNumber(mockClient as never, testCompanyId)

      expect(result).toBe(mockNumber)
      expect(mockRpc).toHaveBeenCalledWith('generate_product_number_atomic', {
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
        generateProductNumber(mockClient as never, testCompanyId)
      ).rejects.toThrow('Failed to generate product number: RPC failed')
    })

    it('無返回資料時應拋出錯誤', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })
      const mockClient = { ...mockSupabaseClient, rpc: mockRpc }

      await expect(
        generateProductNumber(mockClient as never, testCompanyId)
      ).rejects.toThrow('Failed to generate product number: no data returned')
    })
  })
})
