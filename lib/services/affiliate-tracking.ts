/**
 * Affiliate Tracking Integration Service
 *
 * 整合 affiliate 系統的推薦追蹤功能
 * 用於記錄推薦註冊和付款佣金
 */

// ============================================================================
// 配置
// ============================================================================

/**
 * Affiliate 系統配置
 */
interface AffiliateConfig {
  /** API 基礎 URL */
  baseUrl: string
  /** 產品代碼 */
  productCode: string
  /** Webhook Secret（用於驗證請求） */
  webhookSecret: string
  /** 請求超時時間（毫秒） */
  timeout?: number
}

/**
 * 從環境變數取得配置
 */
function getAffiliateConfig(): AffiliateConfig {
  const baseUrl = process.env.AFFILIATE_API_URL?.trim()
  const productCode = process.env.AFFILIATE_PRODUCT_CODE?.trim()
  const webhookSecret = process.env.AFFILIATE_WEBHOOK_SECRET?.trim()

  if (!baseUrl) {
    throw new AffiliateError('AFFILIATE_API_URL 環境變數未設定', 'CONFIG_ERROR')
  }

  if (!productCode) {
    throw new AffiliateError('AFFILIATE_PRODUCT_CODE 環境變數未設定', 'CONFIG_ERROR')
  }

  if (!webhookSecret) {
    throw new AffiliateError('AFFILIATE_WEBHOOK_SECRET 環境變數未設定', 'CONFIG_ERROR')
  }

  return {
    baseUrl,
    productCode,
    webhookSecret,
    timeout: 30000,
  }
}

// ============================================================================
// 錯誤類別
// ============================================================================

/**
 * Affiliate 服務錯誤
 */
export class AffiliateError extends Error {
  readonly code: string
  readonly statusCode?: number

  constructor(message: string, code: string, statusCode?: number) {
    super(message)
    this.name = 'AffiliateError'
    this.code = code
    this.statusCode = statusCode
  }
}

// ============================================================================
// 註冊追蹤
// ============================================================================

/**
 * 註冊追蹤參數
 */
export interface TrackRegistrationParams {
  /** 推薦碼（8 碼大寫英數字） */
  referralCode: string
  /** 被推薦用戶 ID（UUID） */
  referredUserId: string
  /** 被推薦用戶 Email */
  referredUserEmail?: string
  /** 來源 URL */
  sourceUrl?: string
  /** UTM 參數 */
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}

/**
 * 註冊追蹤結果
 */
export interface TrackRegistrationResult {
  success: boolean
  referralId?: string
  error?: string
}

/**
 * 追蹤推薦註冊
 *
 * 當用戶透過推薦連結註冊時，呼叫此函數建立推薦關係
 *
 * @param params 追蹤參數
 * @returns 追蹤結果
 */
export async function trackRegistration(
  params: TrackRegistrationParams
): Promise<TrackRegistrationResult> {
  const config = getAffiliateConfig()

  const url = `${config.baseUrl}/api/tracking/registration`

  const body = {
    referralCode: params.referralCode,
    productCode: config.productCode,
    referredUserId: params.referredUserId,
    referredUserEmail: params.referredUserEmail,
    sourceUrl: params.sourceUrl,
    utmSource: params.utmSource,
    utmMedium: params.utmMedium,
    utmCampaign: params.utmCampaign,
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': config.webhookSecret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data = await response.json()

    if (!response.ok) {
      console.error('[AffiliateTracking] Registration tracking failed:', data)
      return {
        success: false,
        error: data.error || 'Unknown error',
      }
    }

    return {
      success: true,
      referralId: data.referralId,
    }
  } catch (error) {
    console.error('[AffiliateTracking] Network error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// ============================================================================
// 佣金建立
// ============================================================================

/**
 * 佣金建立參數
 */
export interface CreateCommissionParams {
  /** 外部訂單 ID */
  externalOrderId: string
  /** 訂單金額 */
  orderAmount: number
  /** 訂單類型（如 subscription, one-time） */
  orderType: string
  /** 被推薦用戶 ID */
  referredUserId: string
  /** 貨幣（預設 TWD） */
  currency?: string
}

/**
 * 佣金建立結果
 */
export interface CreateCommissionResult {
  success: boolean
  commissionId?: string
  commissionAmount?: number
  effectiveRate?: number
  unlockAt?: string
  error?: string
}

/**
 * 建立佣金記錄
 *
 * 當用戶付款成功時，呼叫此函數為推薦人建立佣金
 *
 * @param params 佣金參數
 * @returns 佣金建立結果
 */
export async function createCommission(
  params: CreateCommissionParams
): Promise<CreateCommissionResult> {
  const config = getAffiliateConfig()

  const url = `${config.baseUrl}/api/commissions/create`

  const body = {
    productCode: config.productCode,
    externalOrderId: params.externalOrderId,
    orderAmount: params.orderAmount,
    orderType: params.orderType,
    referredUserId: params.referredUserId,
    currency: params.currency || 'TWD',
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': config.webhookSecret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data = await response.json()

    if (!response.ok) {
      // 409 表示重複訂單，這不是錯誤，而是正常情況
      if (response.status === 409) {
        console.log('[AffiliateTracking] Duplicate order, skipping:', params.externalOrderId)
        return {
          success: true,
          error: 'Duplicate order (already processed)',
        }
      }

      console.error('[AffiliateTracking] Commission creation failed:', data)
      return {
        success: false,
        error: data.error || 'Unknown error',
      }
    }

    return {
      success: true,
      commissionId: data.commissionId,
      commissionAmount: data.commissionAmount,
      effectiveRate: data.effectiveRate,
      unlockAt: data.unlockAt,
    }
  } catch (error) {
    console.error('[AffiliateTracking] Network error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// ============================================================================
// 推薦碼工具
// ============================================================================

/**
 * 從 URL 解析推薦碼
 *
 * @param url URL 字串
 * @returns 推薦碼或 null
 */
export function parseReferralCodeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const refCode = urlObj.searchParams.get('ref') || urlObj.searchParams.get('referral')
    if (refCode && /^[A-Z0-9]{8}$/.test(refCode.toUpperCase())) {
      return refCode.toUpperCase()
    }
    return null
  } catch {
    return null
  }
}

/**
 * 驗證推薦碼格式
 *
 * @param code 推薦碼
 * @returns 是否有效
 */
export function isValidReferralCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code.toUpperCase())
}

/**
 * 從 Cookie 取得推薦碼
 *
 * @param cookieString Cookie 字串
 * @returns 推薦碼或 null
 */
export function getReferralCodeFromCookie(cookieString: string): string | null {
  const cookies = cookieString.split(';').map((c) => c.trim())
  for (const cookie of cookies) {
    if (cookie.startsWith('ref_code=')) {
      const code = cookie.substring(9)
      if (isValidReferralCode(code)) {
        return code.toUpperCase()
      }
    }
  }
  return null
}

// ============================================================================
// 檢查配置
// ============================================================================

/**
 * 檢查 Affiliate 配置是否已設定
 */
export function isAffiliateConfigured(): boolean {
  return !!(
    process.env.AFFILIATE_API_URL?.trim() &&
    process.env.AFFILIATE_PRODUCT_CODE?.trim() &&
    process.env.AFFILIATE_WEBHOOK_SECRET?.trim()
  )
}

/**
 * 取得 Affiliate 系統 URL
 */
export function getAffiliateUrl(): string | null {
  return process.env.AFFILIATE_API_URL?.trim() || null
}
