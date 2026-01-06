/**
 * Affiliate Payment Integration Service
 *
 * 整合 affiliate 系統的金流 SDK 進行訂閱付款
 * 使用 PAYUNi（藍新金流）處理付款
 */

import {
  PaymentGatewayClient,
  PaymentGatewayConfig,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  WebhookEvent,
  PaymentGatewayError,
  Environment,
} from '@/lib/sdk/payment-gateway-client'

// ============================================================================
// 配置
// ============================================================================

/**
 * 取得 SDK 配置
 * 從環境變數讀取配置
 */
function getPaymentConfig(): PaymentGatewayConfig {
  const apiKey = process.env.AFFILIATE_PAYMENT_API_KEY?.trim()
  const siteCode = process.env.AFFILIATE_PAYMENT_SITE_CODE?.trim()
  const webhookSecret = process.env.AFFILIATE_PAYMENT_WEBHOOK_SECRET?.trim()
  const environment = (process.env.AFFILIATE_PAYMENT_ENV?.trim() || 'production') as Environment

  if (!apiKey) {
    throw new PaymentGatewayError('AFFILIATE_PAYMENT_API_KEY 環境變數未設定', 'CONFIG_ERROR')
  }

  if (!siteCode) {
    throw new PaymentGatewayError('AFFILIATE_PAYMENT_SITE_CODE 環境變數未設定', 'CONFIG_ERROR')
  }

  return {
    apiKey,
    siteCode,
    webhookSecret,
    environment,
  }
}

// 單例模式的 SDK 客戶端
let _client: PaymentGatewayClient | null = null

/**
 * 取得 SDK 客戶端（單例）
 */
export function getPaymentClient(): PaymentGatewayClient {
  if (!_client) {
    _client = new PaymentGatewayClient(getPaymentConfig())
  }
  return _client
}

// ============================================================================
// 訂閱付款
// ============================================================================

/**
 * 訂閱方案付款參數
 */
export interface SubscriptionPaymentParams {
  /** 公司 ID */
  companyId: string
  /** 方案層級 */
  tier: 'STARTER' | 'STANDARD' | 'PROFESSIONAL'
  /** 帳單週期 */
  billingCycle: 'MONTHLY' | 'YEARLY'
  /** 付款人 Email */
  email: string
  /** 付款人姓名 */
  payerName?: string
  /** 付款人電話 */
  payerPhone?: string
  /** 付款完成後的回調 URL */
  callbackUrl?: string
}

/**
 * 方案價格表（新台幣）
 */
const PLAN_PRICES: Record<string, Record<string, number>> = {
  STARTER: {
    MONTHLY: 299,
    YEARLY: 2990, // 約 17% 折扣
  },
  STANDARD: {
    MONTHLY: 599,
    YEARLY: 5990, // 約 17% 折扣
  },
  PROFESSIONAL: {
    MONTHLY: 1299,
    YEARLY: 12990, // 約 17% 折扣
  },
}

/**
 * 方案名稱
 */
const PLAN_NAMES: Record<string, string> = {
  STARTER: '入門版',
  STANDARD: '標準版',
  PROFESSIONAL: '專業版',
}

/**
 * 建立訂閱付款
 *
 * @param params 付款參數
 * @returns 付款結果（包含 PAYUNi 表單資料）
 */
export async function createSubscriptionPayment(
  params: SubscriptionPaymentParams
): Promise<PaymentResult> {
  const { companyId, tier, billingCycle, email, payerName, payerPhone, callbackUrl } = params

  // 驗證方案
  const price = PLAN_PRICES[tier]?.[billingCycle]
  if (!price) {
    throw new PaymentGatewayError(
      `無效的方案組合: ${tier} / ${billingCycle}`,
      'VALIDATION_ERROR'
    )
  }

  const planName = PLAN_NAMES[tier] || tier
  const cycleLabel = billingCycle === 'MONTHLY' ? '月繳' : '年繳'

  // 生成訂單 ID
  const timestamp = Date.now()
  const orderId = `SUB-${companyId.substring(0, 8)}-${timestamp}`

  const client = getPaymentClient()

  const paymentParams: CreatePaymentParams = {
    orderId,
    amount: price,
    description: `報價系統 ${planName}（${cycleLabel}）`,
    email,
    payerName,
    payerPhone,
    callbackUrl,
    metadata: {
      company_id: companyId,
      tier,
      billing_cycle: billingCycle,
      type: 'subscription',
    },
  }

  return client.createPayment(paymentParams)
}

/**
 * 建立定期定額訂閱付款
 *
 * @param params 付款參數
 * @returns 付款結果
 */
export async function createRecurringSubscriptionPayment(
  params: SubscriptionPaymentParams
): Promise<PaymentResult> {
  const { companyId, tier, billingCycle, email, payerName, payerPhone, callbackUrl } = params

  // 定期定額只支援月繳
  if (billingCycle !== 'MONTHLY') {
    throw new PaymentGatewayError(
      '定期定額目前只支援月繳方案',
      'VALIDATION_ERROR'
    )
  }

  const price = PLAN_PRICES[tier]?.MONTHLY
  if (!price) {
    throw new PaymentGatewayError(`無效的方案: ${tier}`, 'VALIDATION_ERROR')
  }

  const planName = PLAN_NAMES[tier] || tier
  const timestamp = Date.now()
  const orderId = `RSUB-${companyId.substring(0, 8)}-${timestamp}`

  // 計算首次扣款日（下個月 1 號）
  const now = new Date()
  const firstDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const periodFirstdate = firstDate.toISOString().split('T')[0]

  const client = getPaymentClient()

  const paymentParams: CreatePaymentParams = {
    orderId,
    amount: price,
    description: `報價系統 ${planName}（每月定期扣款）`,
    email,
    payerName,
    payerPhone,
    callbackUrl,
    metadata: {
      company_id: companyId,
      tier,
      billing_cycle: billingCycle,
      type: 'recurring_subscription',
    },
    periodParams: {
      periodType: 'M', // 每月
      periodAmt: price,
      periodTimes: 12, // 共 12 期
      periodFirstdate,
    },
  }

  return client.createPayment(paymentParams)
}

// ============================================================================
// 付款狀態查詢
// ============================================================================

/**
 * 查詢付款狀態
 *
 * @param paymentId 付款 ID
 * @returns 付款狀態
 */
export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
  const client = getPaymentClient()
  return client.getPaymentStatus(paymentId)
}

// ============================================================================
// Webhook 處理
// ============================================================================

/**
 * 解析並驗證 Webhook 事件
 *
 * @param rawBody 原始請求 body
 * @param signature 請求簽名
 * @returns 驗證後的 Webhook 事件
 */
export async function parsePaymentWebhook(
  rawBody: string,
  signature: string | null
): Promise<WebhookEvent> {
  const client = getPaymentClient()
  return client.parseWebhookEvent(rawBody, signature)
}

/**
 * 處理付款成功事件
 * 更新公司訂閱狀態
 *
 * @param event Webhook 事件
 */
export async function handlePaymentSuccess(event: WebhookEvent): Promise<{
  success: boolean
  message: string
}> {
  const { orderId, paymentId, metadata, amount, paidAt } = event

  // 驗證 metadata
  if (!metadata?.company_id || !metadata?.tier) {
    console.error('[AffiliatePayment] Missing metadata in webhook:', event)
    return {
      success: false,
      message: 'Missing required metadata',
    }
  }

  const { company_id: companyId, tier, billing_cycle: billingCycle, type } = metadata

  console.log('[AffiliatePayment] Payment success:', {
    orderId,
    paymentId,
    companyId,
    tier,
    billingCycle,
    type,
    amount,
    paidAt,
  })

  // 這裡應該呼叫 subscription service 來升級訂閱
  // 實際實作需要 import subscription service
  // await upgradePlan(companyId, tier, { ... })

  return {
    success: true,
    message: `Payment processed for company ${companyId}, tier ${tier}`,
  }
}

/**
 * 處理付款失敗事件
 *
 * @param event Webhook 事件
 */
export async function handlePaymentFailed(event: WebhookEvent): Promise<{
  success: boolean
  message: string
}> {
  const { orderId, paymentId, errorMessage, metadata } = event

  console.error('[AffiliatePayment] Payment failed:', {
    orderId,
    paymentId,
    errorMessage,
    metadata,
  })

  // 可以發送通知給用戶
  // await sendPaymentFailedNotification(metadata?.company_id, errorMessage)

  return {
    success: true,
    message: `Payment failure logged for order ${orderId}`,
  }
}

// ============================================================================
// 工具函數
// ============================================================================

/**
 * 取得方案價格
 */
export function getPlanPrice(tier: string, billingCycle: string): number | null {
  return PLAN_PRICES[tier]?.[billingCycle] ?? null
}

/**
 * 取得方案名稱
 */
export function getPlanName(tier: string): string {
  return PLAN_NAMES[tier] || tier
}

/**
 * 檢查付款配置是否已設定
 */
export function isPaymentConfigured(): boolean {
  return !!(
    process.env.AFFILIATE_PAYMENT_API_KEY?.trim() &&
    process.env.AFFILIATE_PAYMENT_SITE_CODE?.trim()
  )
}

// Re-export 錯誤類別和類型
export { PaymentGatewayError }
export type { PaymentResult, PaymentStatusResult, WebhookEvent }
