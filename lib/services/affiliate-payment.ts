/**
 * Affiliate 付款服務
 *
 * 整合 PAYUNi 金流處理訂閱付款，支援定期定額付款
 */

import {
  PaymentGatewayClient,
  type PaymentGatewayConfig,
  type PaymentResult,
  type PaymentStatusResult,
  type WebhookEvent,
  PaymentGatewayError,
  type Environment,
} from '@/lib/sdk/payment-gateway-client'

// ============================================================================
// 配置
// ============================================================================

function getPaymentConfig(): PaymentGatewayConfig {
  const apiKey = process.env.AFFILIATE_PAYMENT_API_KEY?.trim()
  const siteCode = process.env.AFFILIATE_PAYMENT_SITE_CODE?.trim()
  const webhookSecret = process.env.AFFILIATE_PAYMENT_WEBHOOK_SECRET?.trim()
  const environment = (process.env.AFFILIATE_PAYMENT_ENV?.trim() || 'production') as Environment

  if (!apiKey) throw new PaymentGatewayError('AFFILIATE_PAYMENT_API_KEY 環境變數未設定', 'CONFIG_ERROR')
  if (!siteCode) throw new PaymentGatewayError('AFFILIATE_PAYMENT_SITE_CODE 環境變數未設定', 'CONFIG_ERROR')

  return { apiKey, siteCode, webhookSecret, environment }
}

// ============================================================================
// 客戶端管理
// ============================================================================

let _client: PaymentGatewayClient | null = null

export function getPaymentClient(): PaymentGatewayClient {
  if (!_client) {
    _client = new PaymentGatewayClient(getPaymentConfig())
  }
  return _client
}

// ============================================================================
// 方案配置
// ============================================================================

/**
 * 訂閱方案付款參數
 */
export interface SubscriptionPaymentParams {
  companyId: string
  tier: 'STARTER' | 'STANDARD' | 'PROFESSIONAL'
  billingCycle: 'MONTHLY' | 'YEARLY'
  email: string
  payerName?: string
  payerPhone?: string
  callbackUrl?: string
}

/**
 * 方案價格表（新台幣）
 */
const PLAN_PRICES: Record<string, Record<string, number>> = {
  STARTER: {
    MONTHLY: 299,
    YEARLY: 2990,
  },
  STANDARD: {
    MONTHLY: 599,
    YEARLY: 5990,
  },
  PROFESSIONAL: {
    MONTHLY: 1299,
    YEARLY: 12990,
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

// ============================================================================
// 付款功能
// ============================================================================

/**
 * 建立訂閱付款
 */
export async function createSubscriptionPayment(
  params: SubscriptionPaymentParams
): Promise<PaymentResult> {
  const { companyId, tier, billingCycle, email, payerName, payerPhone, callbackUrl } = params

  const price = PLAN_PRICES[tier]?.[billingCycle]
  if (!price) {
    throw new PaymentGatewayError(`無效的方案組合: ${tier} / ${billingCycle}`, 'VALIDATION_ERROR')
  }

  const planName = PLAN_NAMES[tier] || tier
  const cycleLabel = billingCycle === 'MONTHLY' ? '月繳' : '年繳'
  const timestamp = Date.now()
  const orderId = `SUB-${companyId.substring(0, 8)}-${timestamp}`

  return getPaymentClient().createPayment({
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
  })
}

/**
 * 建立定期定額訂閱付款
 */
export async function createRecurringSubscriptionPayment(
  params: SubscriptionPaymentParams
): Promise<PaymentResult> {
  const { companyId, tier, billingCycle, email, payerName, payerPhone, callbackUrl } = params

  if (billingCycle !== 'MONTHLY') {
    throw new PaymentGatewayError('定期定額目前只支援月繳方案', 'VALIDATION_ERROR')
  }

  const price = PLAN_PRICES[tier]?.MONTHLY
  if (!price) throw new PaymentGatewayError(`無效的方案: ${tier}`, 'VALIDATION_ERROR')

  const planName = PLAN_NAMES[tier] || tier
  const timestamp = Date.now()
  const orderId = `RSUB-${companyId.substring(0, 8)}-${timestamp}`

  // 計算首次扣款日（下個月 1 號）
  const now = new Date()
  const firstDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const periodFirstdate = firstDate.toISOString().split('T')[0]

  return getPaymentClient().createPayment({
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
      periodType: 'M',
      periodAmt: price,
      periodTimes: 12,
      periodFirstdate,
    },
  })
}

// ============================================================================
// Webhook 處理
// ============================================================================

/**
 * 查詢付款狀態
 */
export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
  return getPaymentClient().getPaymentStatus(paymentId)
}

/**
 * 解析並驗證 Webhook 事件
 */
export async function parsePaymentWebhook(
  rawBody: string,
  signature: string | null
): Promise<WebhookEvent> {
  return getPaymentClient().parseWebhookEvent(rawBody, signature)
}

/**
 * 處理付款成功事件
 */
export async function handlePaymentSuccess(event: WebhookEvent): Promise<{
  success: boolean
  message: string
}> {
  const { orderId, paymentId, metadata, amount, paidAt } = event

  if (!metadata?.company_id || !metadata?.tier) {
    console.error('[AffiliatePayment] Missing metadata in webhook:', event)
    return { success: false, message: 'Missing required metadata' }
  }

  const { company_id: companyId, tier, billing_cycle: billingCycle, type } = metadata

  console.log('[AffiliatePayment] Payment success:', {
    orderId, paymentId, companyId, tier, billingCycle, type, amount, paidAt,
  })

  // TODO: 呼叫 subscription service 來升級訂閱
  // await upgradePlan(companyId, tier, { ... })

  return {
    success: true,
    message: `Payment processed for company ${companyId}, tier ${tier}`,
  }
}

/**
 * 處理付款失敗事件
 */
export async function handlePaymentFailed(event: WebhookEvent): Promise<{
  success: boolean
  message: string
}> {
  const { orderId, paymentId, errorMessage, metadata } = event

  console.error('[AffiliatePayment] Payment failed:', {
    orderId, paymentId, errorMessage, metadata,
  })

  // TODO: 發送通知給用戶
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
  return !!(process.env.AFFILIATE_PAYMENT_API_KEY?.trim() && process.env.AFFILIATE_PAYMENT_SITE_CODE?.trim())
}

// Re-export
export { PaymentGatewayError }
export type { PaymentResult, PaymentStatusResult, WebhookEvent }
