/**
 * POST /api/webhooks/affiliate-payment 測試
 *
 * 測試範圍：
 * 1. 簽名驗證（有效/無效/缺少）
 * 2. 付款成功處理（月繳/年繳）
 * 3. 付款失敗處理
 * 4. 付款取消處理
 * 5. 退款處理
 * 6. 訂閱升級邏輯
 * 7. 佣金建立邏輯
 * 8. 錯誤處理（缺少 metadata、升級失敗）
 *
 * ⚠️ 重要：此測試採用整合測試策略，直接測試 API 路由層
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { POST } from '@/app/api/webhooks/affiliate-payment/route'

// Mock 外部依賴
vi.mock('@/lib/services/affiliate-payment', () => ({
  parsePaymentWebhook: vi.fn(),
  handlePaymentFailed: vi.fn(),
  PaymentGatewayError: class MockError extends Error {
    constructor(message: string, public code: string) {
      super(message)
      this.name = 'PaymentGatewayError'
    }
  },
}))

vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/services/affiliate-tracking', () => ({
  createCommission: vi.fn(),
}))

vi.mock('@/lib/services/subscription', () => ({
  upgradePlan: vi.fn(),
}))

import { parsePaymentWebhook, handlePaymentFailed } from '@/lib/services/affiliate-payment'
import type { PaymentGatewayError } from '@/lib/services/affiliate-payment'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { createCommission } from '@/lib/services/affiliate-tracking'
import { upgradePlan } from '@/lib/services/subscription'

describe('POST /api/webhooks/affiliate-payment', () => {
  const mockPaymentId = 'pay_test_1234567890'
  const mockOrderId = 'SUB-testcomp-1737372000000'
  const mockCompanyId = 'test-company-id-12345678'
  const mockUserId = 'test-user-id'

  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks()

    // 設置環境變數
    process.env.AFFILIATE_PAYMENT_API_KEY = 'test-api-key'
    process.env.AFFILIATE_PAYMENT_SITE_CODE = 'TESTSITE'
    process.env.AFFILIATE_PAYMENT_WEBHOOK_SECRET = 'test-webhook-secret'

    // Mock getSupabaseClient
    const mockDb = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_user_id: mockUserId },
        error: null,
      }),
    }

    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as any)

    // Mock upgradePlan 成功
    vi.mocked(upgradePlan).mockResolvedValue({
      success: true,
      subscription: {
        id: 'sub_123',
        company_id: mockCompanyId,
        tier: 'STARTER',
        billing_cycle: 'MONTHLY',
      },
    })

    // Mock createCommission 成功
    vi.mocked(createCommission).mockResolvedValue({
      success: true,
      commissionId: 'comm_123',
      commissionAmount: 149,
    })
  })

  describe('✅ 簽名驗證', () => {
    it('有效簽名應通過驗證並處理付款成功', async () => {
      // Mock parsePaymentWebhook 返回有效事件
      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'SUCCESS',
        amount: 299,
        paidAt: '2025-01-20T12:00:00Z',
        metadata: {
          company_id: mockCompanyId,
          tier: 'STARTER',
          billing_cycle: 'MONTHLY',
          type: 'subscription',
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'SUCCESS',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Payment processed successfully')
    })

    it('無效簽名應返回 401', async () => {
      // 動態取得當前 mock 的 Error 類別
      const { PaymentGatewayError } = await import('@/lib/services/affiliate-payment')
      const error = new PaymentGatewayError('Invalid signature', 'INVALID_SIGNATURE')
      vi.mocked(parsePaymentWebhook).mockRejectedValue(error)

      const rawBody = JSON.stringify({ paymentId: mockPaymentId })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'invalid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.error).toContain('Invalid signature')
      expect(result.code).toBe('INVALID_SIGNATURE')
    })

    it('缺少簽名應返回 401', async () => {
      const { PaymentGatewayError } = await import('@/lib/services/affiliate-payment')
      const error = new PaymentGatewayError('Missing signature', 'MISSING_SIGNATURE')
      vi.mocked(parsePaymentWebhook).mockRejectedValue(error)

      const rawBody = JSON.stringify({ paymentId: mockPaymentId })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request as any)

      expect(response.status).toBe(401)
    })
  })

  describe('✅ 付款成功處理', () => {
    it('月繳付款成功應升級訂閱', async () => {
      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'SUCCESS',
        amount: 299,
        paidAt: '2025-01-20T12:00:00Z',
        metadata: {
          company_id: mockCompanyId,
          tier: 'STARTER',
          billing_cycle: 'MONTHLY',
          type: 'subscription',
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'SUCCESS',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(upgradePlan).toHaveBeenCalledWith(
        mockCompanyId,
        'STARTER',
        expect.objectContaining({
          billingCycle: 'MONTHLY',
          changedBy: 'system:affiliate-payment',
          externalSubscriptionId: mockPaymentId,
        }),
        expect.anything()
      )
    })

    it('年繳付款成功應升級訂閱', async () => {
      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'SUCCESS',
        amount: 2990,
        paidAt: '2025-01-20T12:00:00Z',
        metadata: {
          company_id: mockCompanyId,
          tier: 'STARTER',
          billing_cycle: 'YEARLY',
          type: 'subscription',
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'SUCCESS',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(upgradePlan).toHaveBeenCalledWith(
        mockCompanyId,
        'STARTER',
        expect.objectContaining({
          billingCycle: 'YEARLY',
        }),
        expect.anything()
      )
    })

    it('付款成功且有推薦關係應建立佣金', async () => {
      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'SUCCESS',
        amount: 299,
        paidAt: '2025-01-20T12:00:00Z',
        metadata: {
          company_id: mockCompanyId,
          tier: 'STARTER',
          billing_cycle: 'MONTHLY',
          type: 'subscription',
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'SUCCESS',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(createCommission).toHaveBeenCalledWith({
        externalOrderId: mockOrderId,
        orderAmount: 299,
        orderType: 'subscription',
        referredUserId: mockUserId,
      })
    })

    it('付款成功但無推薦關係不應建立佣金', async () => {
      // Mock 資料庫返回無 owner
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      vi.mocked(getSupabaseClient).mockReturnValue(mockDb as any)

      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'SUCCESS',
        amount: 299,
        paidAt: '2025-01-20T12:00:00Z',
        metadata: {
          company_id: mockCompanyId,
          tier: 'STARTER',
          billing_cycle: 'MONTHLY',
          type: 'subscription',
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'SUCCESS',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(createCommission).not.toHaveBeenCalled()
    })
  })

  describe('✅ 付款失敗處理', () => {
    it('付款失敗應記錄錯誤', async () => {
      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'FAILED',
        errorMessage: 'Insufficient funds',
        metadata: {
          company_id: mockCompanyId,
          tier: 'STARTER',
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'FAILED',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Failure logged')
    })
  })

  describe('✅ 付款取消處理', () => {
    it('付款取消應記錄日誌', async () => {
      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'CANCELLED',
        metadata: {
          company_id: mockCompanyId,
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'CANCELLED',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Cancellation noted')
    })
  })

  describe('✅ 退款處理', () => {
    it('退款應記錄日誌', async () => {
      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'REFUNDED',
        amount: 299,
        metadata: {
          company_id: mockCompanyId,
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'REFUNDED',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Refund noted')
    })
  })

  describe('❌ 錯誤處理', () => {
    it('缺少 metadata 應返回 400', async () => {
      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'SUCCESS',
        amount: 299,
        paidAt: '2025-01-20T12:00:00Z',
        metadata: {},
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'SUCCESS',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('Missing required metadata')
    })

    it('缺少 company_id 應返回 400', async () => {
      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'SUCCESS',
        amount: 299,
        metadata: {
          tier: 'STARTER',
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'SUCCESS',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('Missing required metadata')
    })

    it('訂閱升級失敗應記錄錯誤但返回成功', async () => {
      vi.mocked(upgradePlan).mockResolvedValue({
        success: false,
        error: 'Subscription not found',
      })

      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'SUCCESS',
        amount: 299,
        paidAt: '2025-01-20T12:00:00Z',
        metadata: {
          company_id: mockCompanyId,
          tier: 'STARTER',
          billing_cycle: 'MONTHLY',
          type: 'subscription',
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'SUCCESS',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
    })

    it('未知狀態應返回 200', async () => {
      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'UNKNOWN_STATUS' as any,
        metadata: {
          company_id: mockCompanyId,
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'UNKNOWN_STATUS',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Status noted')
    })

    it('伺服器內部錯誤應返回 500', async () => {
      vi.mocked(getSupabaseClient).mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      vi.mocked(parsePaymentWebhook).mockResolvedValue({
        paymentId: mockPaymentId,
        orderId: mockOrderId,
        status: 'SUCCESS',
        amount: 299,
        metadata: {
          company_id: mockCompanyId,
          tier: 'STARTER',
        },
      })

      const rawBody = JSON.stringify({
        paymentId: mockPaymentId,
        status: 'SUCCESS',
      })

      const request = new Request('http://localhost:3000/api/webhooks/affiliate-payment', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'valid_signature',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toContain('Internal server error')
    })
  })
})
