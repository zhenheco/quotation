/**
 * Phase 1: Email 發送功能單元測試
 * 測試路徑: app/api/quotations/[id]/email/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/quotations/[id]/email/route'
import { mockSupabaseClient, createMockUser, createMockQuotation, createMockQuotationItem } from '../mocks/supabase'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/lib/email/service', () => ({
  sendQuotationEmail: vi.fn(),
}))

vi.mock('@/lib/middleware/rate-limiter', () => ({
  emailRateLimiter: vi.fn((req, handler) => handler()),
}))

describe('Email API - Phase 1 測試', () => {
  const mockUser = createMockUser()
  const mockQuotation = createMockQuotation()
  const mockItems = [createMockQuotationItem()]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('認證和授權', () => {
    it('應該拒絕未認證的請求', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'test@example.com',
        }),
      })

      const response = await POST(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('應該驗證報價單屬於當前用戶', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'test@example.com',
        }),
      })

      const response = await POST(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Quotation not found')
    })
  })

  describe('Email 格式驗證', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
    })

    it('應該拒絕無效的收件人 Email', async () => {
      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'invalid-email',
        }),
      })

      const response = await POST(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid recipient email is required')
    })

    it('應該拒絕缺少收件人 Email', async () => {
      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: '',
        }),
      })

      const response = await POST(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid recipient email is required')
    })

    it('應該拒絕無效的 CC Email', async () => {
      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'valid@example.com',
          ccEmails: ['valid@example.com', 'invalid-email', 'another@example.com'],
        }),
      })

      const response = await POST(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid CC emails')
      expect(data.error).toContain('invalid-email')
    })

    it('應該限制 CC 收件人數量（最多 10 個）', async () => {
      const ccEmails = Array.from({ length: 11 }, (_, i) => `cc${i}@example.com`)

      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'test@example.com',
          ccEmails,
        }),
      })

      const response = await POST(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Maximum 10 CC recipients allowed')
    })
  })

  describe('成功發送 Email', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: mockQuotation,
        error: null,
      })

      mockSupabaseClient.from().order.mockResolvedValueOnce({
        data: mockItems,
        error: null,
      })
    })

    it('應該成功發送 Email 給單一收件人', async () => {
      const { sendQuotationEmail } = await import('@/lib/email/service')
      vi.mocked(sendQuotationEmail).mockResolvedValue({ success: true, data: { id: 'email-id' } })

      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'customer@example.com',
          locale: 'zh',
        }),
      })

      const response = await POST(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Email sent successfully')
      expect(sendQuotationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          locale: 'zh',
        })
      )
    })

    it('應該成功發送 Email 給主收件人和 CC', async () => {
      const { sendQuotationEmail } = await import('@/lib/email/service')
      vi.mocked(sendQuotationEmail).mockResolvedValue({ success: true, data: { id: 'email-id' } })

      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'customer@example.com',
          ccEmails: ['cc1@example.com', 'cc2@example.com'],
          locale: 'en',
        }),
      })

      const response = await POST(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.ccRecipients).toHaveLength(2)
      expect(sendQuotationEmail).toHaveBeenCalledTimes(3) // 1 主收件人 + 2 CC
    })

    it('應該在發送後更新草稿狀態為已發送', async () => {
      const { sendQuotationEmail } = await import('@/lib/email/service')
      vi.mocked(sendQuotationEmail).mockResolvedValue({ success: true, data: { id: 'email-id' } })

      const draftQuotation = { ...mockQuotation, status: 'draft' }
      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: draftQuotation,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'customer@example.com',
        }),
      })

      await POST(request, { params: { id: 'test-id' } })

      // 驗證狀態更新
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('quotations')
      // update 應該被調用
      const updateCalls = mockSupabaseClient.from().update.mock.calls
      expect(updateCalls.length).toBeGreaterThan(0)
    })
  })

  describe('雙語支援', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockQuotation,
        error: null,
      })

      mockSupabaseClient.from().order.mockResolvedValue({
        data: mockItems,
        error: null,
      })
    })

    it('應該支援繁體中文 Email', async () => {
      const { sendQuotationEmail } = await import('@/lib/email/service')
      vi.mocked(sendQuotationEmail).mockResolvedValue({ success: true })

      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'customer@example.com',
          locale: 'zh',
        }),
      })

      await POST(request, { params: { id: 'test-id' } })

      expect(sendQuotationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'zh',
        })
      )
    })

    it('應該支援英文 Email', async () => {
      const { sendQuotationEmail } = await import('@/lib/email/service')
      vi.mocked(sendQuotationEmail).mockResolvedValue({ success: true })

      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'customer@example.com',
          locale: 'en',
        }),
      })

      await POST(request, { params: { id: 'test-id' } })

      expect(sendQuotationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'en',
        })
      )
    })
  })

  describe('錯誤處理', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockQuotation,
        error: null,
      })

      mockSupabaseClient.from().order.mockResolvedValue({
        data: mockItems,
        error: null,
      })
    })

    it('應該處理 Email 發送失敗', async () => {
      const { sendQuotationEmail } = await import('@/lib/email/service')
      vi.mocked(sendQuotationEmail).mockResolvedValue({
        success: false,
        error: 'Failed to send email',
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'customer@example.com',
        }),
      })

      const response = await POST(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to send email')
    })

    it('應該處理資料庫查詢錯誤', async () => {
      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      })

      const request = new NextRequest('http://localhost:3000/api/quotations/test-id/email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'customer@example.com',
        }),
      })

      const response = await POST(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Quotation not found')
    })
  })
})
