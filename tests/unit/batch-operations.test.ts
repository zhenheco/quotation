/**
 * Phase 3: 批次操作單元測試
 * 測試路徑:
 * - app/api/quotations/batch/delete/route.ts
 * - app/api/quotations/batch/status/route.ts
 * - app/api/quotations/batch/export/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as deleteBatch } from '@/app/api/quotations/batch/delete/route'
import { POST as updateStatus } from '@/app/api/quotations/batch/status/route'
import { POST as exportBatch } from '@/app/api/quotations/batch/export/route'
import { mockSupabaseClient, createMockUser, createMockQuotation } from '../mocks/supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/lib/middleware/rate-limiter', () => ({
  batchRateLimiter: vi.fn((req, handler) => handler()),
}))

vi.mock('@/lib/pdf/generator', () => ({
  generateQuotationPDF: vi.fn(() => Promise.resolve(new Blob(['test pdf']))),
}))

describe('Batch Operations - Phase 3 測試', () => {
  const mockUser = createMockUser()
  const mockQuotations = [
    createMockQuotation({ id: 'q1' }),
    createMockQuotation({ id: 'q2' }),
    createMockQuotation({ id: 'q3' }),
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
  })

  describe('批次刪除測試', () => {
    it('應該拒絕未認證的請求', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/delete', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1', 'q2'] }),
      })

      const response = await deleteBatch(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('應該拒絕空的 IDs 陣列', async () => {
      const request = new NextRequest('http://localhost:3000/api/quotations/batch/delete', {
        method: 'POST',
        body: JSON.stringify({ ids: [] }),
      })

      const response = await deleteBatch(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ids array required')
    })

    it('應該拒絕無效的 IDs 格式', async () => {
      const request = new NextRequest('http://localhost:3000/api/quotations/batch/delete', {
        method: 'POST',
        body: JSON.stringify({ ids: 'not-an-array' }),
      })

      const response = await deleteBatch(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ids array required')
    })

    it('應該驗證所有報價單屬於當前用戶', async () => {
      mockSupabaseClient.from().in.mockResolvedValueOnce({
        data: [{ id: 'q1' }], // 只返回 1 個，但請求了 2 個
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/delete', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1', 'q2'] }),
      })

      const response = await deleteBatch(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('not found or unauthorized')
    })

    it('應該成功刪除多個報價單（包含項目）', async () => {
      mockSupabaseClient.from().in.mockResolvedValueOnce({
        data: mockQuotations,
        error: null,
      })

      // Mock 刪除項目
      mockSupabaseClient.from().delete.mockResolvedValueOnce({
        error: null,
      })

      // Mock 刪除報價單
      mockSupabaseClient.from().delete.mockResolvedValueOnce({
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/delete', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1', 'q2', 'q3'] }),
      })

      const response = await deleteBatch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.deletedCount).toBe(3)
      expect(data.message).toContain('Successfully deleted')
    })

    it('應該先刪除關聯項目再刪除報價單', async () => {
      mockSupabaseClient.from().in.mockResolvedValueOnce({
        data: mockQuotations,
        error: null,
      })

      const deleteCallOrder: string[] = []

      mockSupabaseClient.from.mockImplementation((table: string) => {
        return {
          select: vi.fn().mockReturnThis(),
          delete: vi.fn(() => {
            deleteCallOrder.push(table)
            return Promise.resolve({ error: null })
          }),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
        }
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/delete', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1', 'q2'] }),
      })

      await deleteBatch(request)

      // 驗證刪除順序：先 quotation_items，再 quotations
      expect(deleteCallOrder[0]).toBe('quotation_items')
      expect(deleteCallOrder[1]).toBe('quotations')
    })
  })

  describe('批次狀態更新測試', () => {
    it('應該拒絕未認證的請求', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/status', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1'], status: 'sent' }),
      })

      const response = await updateStatus(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('應該拒絕無效的狀態值', async () => {
      mockSupabaseClient.from().in.mockResolvedValue({
        data: mockQuotations,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/status', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1'], status: 'invalid-status' }),
      })

      const response = await updateStatus(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid status')
    })

    it('應該接受所有有效的狀態值', async () => {
      const validStatuses = ['draft', 'sent', 'accepted', 'rejected']

      for (const status of validStatuses) {
        mockSupabaseClient.from().in.mockResolvedValue({
          data: [mockQuotations[0]],
          error: null,
        })

        mockSupabaseClient.from().select.mockResolvedValue({
          data: [{ ...mockQuotations[0], status }],
          error: null,
        })

        const request = new NextRequest('http://localhost:3000/api/quotations/batch/status', {
          method: 'POST',
          body: JSON.stringify({ ids: ['q1'], status }),
        })

        const response = await updateStatus(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.status).toBe(status)
      }
    })

    it('應該成功更新多個報價單狀態', async () => {
      mockSupabaseClient.from().in.mockResolvedValueOnce({
        data: mockQuotations,
        error: null,
      })

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: mockQuotations.map((q) => ({ ...q, status: 'sent' })),
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/status', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1', 'q2', 'q3'], status: 'sent' }),
      })

      const response = await updateStatus(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.updatedCount).toBe(3)
      expect(data.status).toBe('sent')
    })

    it('應該更新 updated_at 時間戳', async () => {
      mockSupabaseClient.from().in.mockResolvedValue({
        data: [mockQuotations[0]],
        error: null,
      })

      let updateData: any = null
      mockSupabaseClient.from().update.mockImplementationOnce((data) => {
        updateData = data
        return {
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
        }
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/status', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1'], status: 'accepted' }),
      })

      await updateStatus(request)

      expect(updateData).toBeDefined()
      expect(updateData.status).toBe('accepted')
      expect(updateData.updated_at).toBeDefined()
    })
  })

  describe('批次 PDF 匯出測試', () => {
    it('應該拒絕未認證的請求', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/export', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1'], locale: 'zh' }),
      })

      const response = await exportBatch(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('應該限制最多 20 個報價單', async () => {
      const manyIds = Array.from({ length: 21 }, (_, i) => `q${i}`)

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/export', {
        method: 'POST',
        body: JSON.stringify({ ids: manyIds, locale: 'zh' }),
      })

      const response = await exportBatch(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Maximum 20 quotations')
    })

    it('應該驗證所有報價單存在且屬於用戶', async () => {
      mockSupabaseClient.from().in.mockResolvedValueOnce({
        data: [mockQuotations[0]], // 只返回 1 個，但請求了 2 個
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/export', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1', 'q2'], locale: 'zh' }),
      })

      const response = await exportBatch(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('not found or unauthorized')
    })

    it('應該生成 ZIP 文件包含所有 PDF', async () => {
      mockSupabaseClient.from().in.mockResolvedValueOnce({
        data: mockQuotations,
        error: null,
      })

      mockSupabaseClient.from().order.mockResolvedValue({
        data: [],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/export', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1', 'q2', 'q3'], locale: 'zh' }),
      })

      const response = await exportBatch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/zip')
      expect(response.headers.get('Content-Disposition')).toContain('quotations_')
    })

    it('應該支援雙語 PDF 匯出', async () => {
      const locales = ['zh', 'en']

      for (const locale of locales) {
        mockSupabaseClient.from().in.mockResolvedValue({
          data: [mockQuotations[0]],
          error: null,
        })

        mockSupabaseClient.from().order.mockResolvedValue({
          data: [],
          error: null,
        })

        const request = new NextRequest('http://localhost:3000/api/quotations/batch/export', {
          method: 'POST',
          body: JSON.stringify({ ids: ['q1'], locale }),
        })

        const response = await exportBatch(request)

        expect(response.status).toBe(200)
      }
    })

    it('應該處理部分 PDF 生成失敗的情況', async () => {
      mockSupabaseClient.from().in.mockResolvedValueOnce({
        data: mockQuotations,
        error: null,
      })

      mockSupabaseClient.from().order.mockResolvedValue({
        data: [],
        error: null,
      })

      const { generateQuotationPDF } = await import('@/lib/pdf/generator')
      vi.mocked(generateQuotationPDF)
        .mockResolvedValueOnce(new Blob(['pdf1']))
        .mockRejectedValueOnce(new Error('PDF generation failed'))
        .mockResolvedValueOnce(new Blob(['pdf3']))

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/export', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1', 'q2', 'q3'], locale: 'zh' }),
      })

      const response = await exportBatch(request)

      // 應該返回部分成功的 ZIP
      expect(response.status).toBe(200)
    })

    it('應該在所有 PDF 生成失敗時返回錯誤', async () => {
      mockSupabaseClient.from().in.mockResolvedValueOnce({
        data: mockQuotations,
        error: null,
      })

      mockSupabaseClient.from().order.mockResolvedValue({
        data: [],
        error: null,
      })

      const { generateQuotationPDF } = await import('@/lib/pdf/generator')
      vi.mocked(generateQuotationPDF).mockRejectedValue(new Error('PDF generation failed'))

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/export', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1', 'q2'], locale: 'zh' }),
      })

      const response = await exportBatch(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to generate any PDFs')
    })
  })

  describe('速率限制測試', () => {
    it('批次操作應該受到速率限制', async () => {
      const { batchRateLimiter } = await import('@/lib/middleware/rate-limiter')

      const request = new NextRequest('http://localhost:3000/api/quotations/batch/delete', {
        method: 'POST',
        body: JSON.stringify({ ids: ['q1'] }),
      })

      await deleteBatch(request)

      expect(batchRateLimiter).toHaveBeenCalled()
    })
  })
})
