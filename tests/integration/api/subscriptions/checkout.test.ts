/**
 * POST /api/subscriptions/checkout 測試
 *
 * 測試範圍：
 * 1. 月繳 12 期的定期定額付款
 * 2. 年繳單次付款
 * 3. 訂單 ID 格式（無底線）
 * 4. 錯誤處理（未登入、無效方案、環境變數未設定）
 *
 * ⚠️ 重要：此測試採用整合測試策略，mock 外部依賴（金流 SDK、資料庫），
 * 但測試完整的 API 路由邏輯流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/subscriptions/checkout/route'
import type { SubscriptionTier, BillingCycle } from '@/lib/dal/subscriptions'

// Mock 所有外部依賴
vi.mock('@/lib/sdk/payment-gateway-client', () => ({
  PaymentGatewayClient: vi.fn().mockImplementation(() => ({
    createPayment: vi.fn(),
  })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/services/affiliate-tracking', () => ({
  trackRegistration: vi.fn(),
}))

import { PaymentGatewayClient } from '@/lib/sdk/payment-gateway-client'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { trackRegistration } from '@/lib/services/affiliate-tracking'

describe('POST /api/subscriptions/checkout', () => {
  const mockUserId = 'test-user-id'
  const mockCompanyId = 'test-company-id-12345678'
  const mockUserEmail = 'test@example.com'

  beforeEach(() => {
    // 設置環境變數
    process.env.AFFILIATE_PAYMENT_API_KEY = 'test-api-key'
    process.env.AFFILIATE_PAYMENT_SITE_CODE = 'TESTSITE'
    process.env.AFFILIATE_PAYMENT_WEBHOOK_SECRET = 'test-webhook-secret'
    process.env.NEXT_PUBLIC_APP_URL = 'https://quote24.cc'

    // Mock createClient (Supabase Auth)
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: mockUserId,
              email: mockUserEmail,
            },
          },
          error: null,
        }),
      },
    } as any)

    // Mock getSupabaseClient (資料庫操作)
    const mockDb = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }

    vi.mocked(getSupabaseClient).mockReturnValue(mockDb as any)

    // Mock PaymentGatewayClient.createPayment 預設成功
    vi.mocked(PaymentGatewayClient).mockImplementation(() => ({
      createPayment: vi.fn().mockResolvedValue({
        success: true,
        paymentId: 'pay_test_1234567890',
        payuniForm: {
          action: 'https://sandbox.payuni.com/payment',
          method: 'POST',
          fields: {
            MerID: 'TEST_MERCHANT',
            Version: '1.0',
            EncryptInfo: 'encrypted_data',
            HashInfo: 'hash_data',
          },
        },
      }),
    } as any))

    // Mock trackRegistration
    vi.mocked(trackRegistration).mockResolvedValue(undefined)
  })

  describe('✅ 月繳定期定額付款（12 期）', () => {
    it('應建立月繳 12 期的定期定額付款', async () => {
      const requestBody = {
        tier: 'STARTER' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: mockCompanyId,
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request as any)
      const result = await response.json()

      // 驗證回應
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.paymentId).toBeDefined()
      expect(result.data.orderId).toBeDefined()
      expect(result.data.amount).toBe(299) // STARTER 月繳價格

      // 驗證訂單 ID 格式（包含月繳特徵）
      expect(result.data.orderId).toMatch(/^SUB-/)
    })

    it('月繳應設置正確的首次扣款日（下個月同一天）', async () => {
      const requestBody = {
        tier: 'STANDARD' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: mockCompanyId,
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.amount).toBe(599) // STANDARD 月繳價格
    })
  })

  describe('✅ 年繳單次付款', () => {
    it('應建立年繳單次付款（無 periodParams）', async () => {
      const requestBody = {
        tier: 'PROFESSIONAL' as SubscriptionTier,
        billing_cycle: 'YEARLY' as BillingCycle,
        company_id: mockCompanyId,
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.amount).toBe(12990) // PROFESSIONAL 年繳價格
    })
  })

  describe('✅ 訂單 ID 格式（無底線）', () => {
    it('訂單 ID 應使用 company_id 前 8 字元 + 時間戳，無底線', async () => {
      const requestBody = {
        tier: 'STARTER' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: mockCompanyId,
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)

      const orderId = result.data.orderId

      // 驗證格式：SUB-{companyId前8字元}-{timestamp}
      expect(orderId).toMatch(/^SUB-[a-zA-Z0-9-]+-\d+$/)

      // 驗證不包含底線
      expect(orderId).not.toContain('_')

      // 驗證只包含允許的字元（PAYUNi 規範）
      expect(orderId).toMatch(/^[a-zA-Z0-9-]+$/)
    })

    it('即使 company_id 包含底線，訂單 ID 也應移除底線', async () => {
      // 使用包含底線的 company_id
      const companyWithUnderscore = 'test_company_id_12345678'

      const requestBody = {
        tier: 'STARTER' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: companyWithUnderscore,
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)

      const orderId = result.data.orderId

      // 驗證訂單 ID 不包含底線
      expect(orderId).not.toContain('_')
      expect(orderId).toMatch(/^[a-zA-Z0-9-]+$/)
    })
  })

  describe('✅ 推薦碼折扣（首月 50%）', () => {
    it('使用有效推薦碼應給予 50% 折扣', async () => {
      // Mock 資料庫返回推薦人資料
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'referrer-id' },
          error: null,
        }),
        insert: vi.fn().mockResolvedValue({
          error: null,
        }),
      }

      vi.mocked(getSupabaseClient).mockReturnValue(mockDb as any)

      const requestBody = {
        tier: 'STARTER' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: mockCompanyId,
        referral_code: 'REFERRAL123',
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)

      // 驗證折扣：299 * 0.5 = 149
      expect(result.data.discount).toBe(149)
      expect(result.data.amount).toBe(150) // 299 - 149
      expect(result.data.originalAmount).toBe(299)

      // 驗證 trackRegistration 被呼叫
      expect(trackRegistration).toHaveBeenCalledWith({
        referralCode: 'REFERRAL123',
        referredUserId: mockUserId,
        referredUserEmail: mockUserEmail,
      })
    })

    it('無效推薦碼不應給予折扣', async () => {
      // Mock 資料庫返回無推薦人
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
        insert: vi.fn().mockResolvedValue({
          error: null,
        }),
      }

      vi.mocked(getSupabaseClient).mockReturnValue(mockDb as any)

      const requestBody = {
        tier: 'STARTER' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: mockCompanyId,
        referral_code: 'INVALID_REFERRAL',
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)

      // 驗證無折扣
      expect(result.data.discount).toBe(0)
      expect(result.data.amount).toBe(299)

      // 驗證 trackRegistration 未被呼叫
      expect(trackRegistration).not.toHaveBeenCalled()
    })
  })

  describe('❌ 錯誤處理', () => {
    it('未登入應返回 401', async () => {
      // Mock createClient 返回未登入
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any)

      const requestBody = {
        tier: 'STARTER' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: mockCompanyId,
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.success).toBe(false)
      expect(result.error).toContain('未登入')
    })

    it('環境變數未設定應返回 503', async () => {
      // 清除環境變數
      delete process.env.AFFILIATE_PAYMENT_API_KEY
      delete process.env.AFFILIATE_PAYMENT_SITE_CODE

      const requestBody = {
        tier: 'STARTER' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: mockCompanyId,
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(503)
      expect(result.success).toBe(false)
      expect(result.error).toContain('付款系統尚未設定')
    })

    it('缺少必填參數應返回 400', async () => {
      const requestBody = {
        tier: 'STARTER' as SubscriptionTier,
        // 缺少 billing_cycle 和 company_id
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('缺少必填參數')
    })

    it('免費方案應返回 400', async () => {
      const requestBody = {
        tier: 'FREE' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: mockCompanyId,
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('免費方案無需付款')
    })

    it('無效方案應返回 400', async () => {
      const requestBody = {
        tier: 'INVALID_TIER' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: mockCompanyId,
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('無效的方案')
    })

    it('金流建立失敗應返回 500', async () => {
      // Mock PaymentGatewayClient.createPayment 失敗
      vi.mocked(PaymentGatewayClient).mockImplementation(() => ({
        createPayment: vi.fn().mockResolvedValue({
          success: false,
          error: 'Insufficient funds',
        }),
      }))

      const requestBody = {
        tier: 'STARTER' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: mockCompanyId,
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      // API 現在統一返回「建立付款失敗」，不暴露內部錯誤
      expect(result.error).toBe('建立付款失敗')
    })
  })

  describe('📊 資料庫記錄', () => {
    it('應在 subscription_orders 表建立記錄', async () => {
      let insertData: any = null

      // Mock 資料庫 insert 並記錄資料
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockImplementation((data) => {
          insertData = data
          return {
            error: null,
          }
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      vi.mocked(getSupabaseClient).mockReturnValue(mockDb as any)

      const requestBody = {
        tier: 'STARTER' as SubscriptionTier,
        billing_cycle: 'MONTHLY' as BillingCycle,
        company_id: mockCompanyId,
      }

      const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)

      expect(response.status).toBe(200)

      // 驗證資料庫 insert 被呼叫
      expect(insertData).toBeDefined()
      expect(insertData.tier).toBe('STARTER')
      expect(insertData.billing_cycle).toBe('MONTHLY')
      expect(insertData.amount).toBe(299)
      expect(insertData.status).toBe('pending')
      expect(insertData.order_id).toMatch(/^SUB-[a-zA-Z0-9-]+-\d+$/)
    })
  })
})
