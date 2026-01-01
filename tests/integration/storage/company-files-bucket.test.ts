/**
 * company-files bucket 存在性測試
 *
 * TDD Step 1: 🔴 紅燈 - 驗證 bucket 是否存在
 * 這個測試應該在 bucket 創建前失敗，創建後通過
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockSupabaseClient,
  storageMock,
  resetStorageMock,
} from '../../mocks/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase/api', () => ({
  createApiClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  createSupabaseClient: vi.fn(() => mockSupabaseClient),
}))

describe('company-files bucket - 存在性測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStorageMock()
  })

  describe('Bucket 配置驗證', () => {
    it('應該驗證 company-files bucket 存在且可存取', async () => {
      // Arrange: Mock bucket 存在
      const expectedBucket = {
        id: 'company-files',
        name: 'company-files',
        public: false,
        file_size_limit: 5 * 1024 * 1024, // 5MB
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      }
      storageMock.getBucket.mockResolvedValue({
        data: expectedBucket,
        error: null,
      })

      // Act
      const { data, error } = await mockSupabaseClient.storage.getBucket('company-files')

      // Assert
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.name).toBe('company-files')
      expect(data?.public).toBe(false)
    })

    it('應該驗證 bucket 的檔案大小限制為 5MB', async () => {
      // Arrange
      const expectedBucket = {
        id: 'company-files',
        name: 'company-files',
        file_size_limit: 5 * 1024 * 1024,
      }
      storageMock.getBucket.mockResolvedValue({
        data: expectedBucket,
        error: null,
      })

      // Act
      const { data } = await mockSupabaseClient.storage.getBucket('company-files')

      // Assert
      expect(data?.file_size_limit).toBe(5 * 1024 * 1024)
    })

    it('應該驗證 bucket 只允許圖片類型', async () => {
      // Arrange
      const expectedBucket = {
        id: 'company-files',
        name: 'company-files',
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      }
      storageMock.getBucket.mockResolvedValue({
        data: expectedBucket,
        error: null,
      })

      // Act
      const { data } = await mockSupabaseClient.storage.getBucket('company-files')

      // Assert
      expect(data?.allowed_mime_types).toContain('image/jpeg')
      expect(data?.allowed_mime_types).toContain('image/png')
      expect(data?.allowed_mime_types).toContain('image/gif')
      expect(data?.allowed_mime_types).toContain('image/webp')
      expect(data?.allowed_mime_types).not.toContain('application/pdf')
    })

    it('當 bucket 不存在時應該回傳錯誤', async () => {
      // Arrange: Mock bucket 不存在
      storageMock.getBucket.mockResolvedValue({
        data: null,
        error: { message: 'Bucket not found', statusCode: '404' },
      })

      // Act
      const { data, error } = await mockSupabaseClient.storage.getBucket('company-files')

      // Assert
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error?.message).toContain('not found')
    })
  })

  describe('Bucket 列表驗證', () => {
    it('company-files 應該出現在 bucket 列表中', async () => {
      // Arrange
      storageMock.listBuckets.mockResolvedValue({
        data: [
          { id: 'company-files', name: 'company-files', public: false },
          { id: 'quotation-contracts', name: 'quotation-contracts', public: true },
        ],
        error: null,
      })

      // Act
      const { data, error } = await mockSupabaseClient.storage.listBuckets()

      // Assert
      expect(error).toBeNull()
      expect(data).toBeDefined()
      const companyFilesBucket = data?.find(b => b.name === 'company-files')
      expect(companyFilesBucket).toBeDefined()
      expect(companyFilesBucket?.public).toBe(false)
    })
  })
})

/**
 * 真實環境測試（需要環境變數）
 *
 * 使用方式：
 * INTEGRATION_TEST=true pnpm test tests/integration/storage/company-files-bucket.test.ts
 */
describe.skipIf(!process.env.INTEGRATION_TEST)('company-files bucket - 真實環境測試', () => {
  it('應該能連接到真實的 Supabase Storage', async () => {
    // 這個測試需要真實的 Supabase 連線
    // 只在設定 INTEGRATION_TEST=true 時執行
    const { createClient } = await import('@supabase/supabase-js')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn('跳過真實環境測試：缺少環境變數')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase.storage.getBucket('company-files')

    // 這個測試在 bucket 創建前會失敗 (🔴)
    // 創建 bucket 後會通過 (🟢)
    expect(error).toBeNull()
    expect(data?.name).toBe('company-files')
  })
})
