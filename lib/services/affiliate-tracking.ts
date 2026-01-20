/**
 * Affiliate 追蹤服務
 *
 * 整合官方 Affiliate SDK，提供推薦追蹤和佣金管理功能
 *
 * @see https://affiliate.1wayseo.com/docs
 */

import {
  createAffiliateClient,
  type AffiliateClient,
  type RegistrationResult,
  type CreateCommissionParams as SDKCreateCommissionParams,
  type CommissionResult,
  type TrackClickParams,
} from '@/lib/sdk/affiliate-client';

// ============================================================================
// 類型定義
// ============================================================================

/**
 * 向後相容的註冊追蹤參數
 */
export interface TrackRegistrationParamsCompat {
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
 * 向後相容的佣金建立參數
 */
export interface CreateCommissionParamsCompat {
  /** 外部訂單 ID */
  externalOrderId: string
  /** 訂單金額 */
  orderAmount: number
  /** 訂單類型 */
  orderType: string
  /** 被推薦用戶 ID */
  referredUserId: string
  /** 貨幣（預設 TWD） */
  currency?: string
}

// ============================================================================
// 客戶端管理
// ============================================================================

let clientInstance: AffiliateClient | null = null;

function getClient(): AffiliateClient {
  if (!clientInstance) {
    const systemUrl = process.env.AFFILIATE_SYSTEM_URL?.trim() || process.env.AFFILIATE_API_URL?.trim();

    clientInstance = createAffiliateClient({
      baseUrl: systemUrl || '',
      webhookSecret: process.env.AFFILIATE_WEBHOOK_SECRET?.trim() || '',
      productCode: process.env.AFFILIATE_PRODUCT_CODE?.trim() || '',
    });
  }
  return clientInstance;
}

// ============================================================================
// 核心功能
// ============================================================================

/**
 * 追蹤推薦註冊
 *
 * @param params - 追蹤參數
 * @returns 追蹤結果
 *
 * @example
 * ```typescript
 * const result = await trackRegistration({
 *   referralCode: 'G3PHSQ71',
 *   referredUserId: user.id,
 *   referredUserEmail: user.email,
 * });
 * ```
 */
export async function trackRegistration(
  params: TrackRegistrationParamsCompat
): Promise<RegistrationResult | null> {
  const client = getClient();
  const sdkParams = { ...params };

  return client.trackRegistration(sdkParams);
}

/**
 * 建立佣金記錄
 *
 * @param params - 佣金參數
 * @returns 佣金建立結果
 *
 * @example
 * ```typescript
 * const result = await createCommission({
 *   externalOrderId: 'ORDER-001',
 *   orderAmount: 299,
 *   orderType: 'subscription',
 *   referredUserId: user.id,
 * });
 * ```
 */
export async function createCommission(
  params: CreateCommissionParamsCompat
): Promise<CommissionResult | null> {
  const client = getClient();
  const sdkParams: SDKCreateCommissionParams = {
    ...params,
    currency: params.currency || 'TWD',
    orderType: params.orderType as SDKCreateCommissionParams['orderType'],
  };

  return client.createCommission(sdkParams);
}

// ============================================================================
// 點擊追蹤
// ============================================================================

/**
 * 追蹤推薦連結點擊
 *
 * @param params - 點擊參數
 * @returns 是否成功
 *
 * @example
 * ```typescript
 * await trackClick({
 *   referralCode: 'G3PHSQ71',
 *   landingUrl: window.location.href,
 * });
 * ```
 */
export async function trackClick(params: TrackClickParams): Promise<boolean> {
  return getClient().trackClick(params);
}

// ============================================================================
// 推薦碼工具
// ============================================================================

/**
 * 從 URL 解析推薦碼
 */
export function parseReferralCodeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const refCode = urlObj.searchParams.get('ref') || urlObj.searchParams.get('referral');
    return refCode && isValidReferralCode(refCode) ? refCode.toUpperCase() : null;
  } catch {
    return null;
  }
}

/**
 * 驗證推薦碼格式
 */
export function isValidReferralCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code.toUpperCase());
}

/**
 * 從 Cookie 取得推薦碼
 */
export function getReferralCodeFromCookie(cookieString: string): string | null {
  const cookies = cookieString.split(';').map(c => c.trim());

  for (const cookie of cookies) {
    if (cookie.startsWith('affiliate_ref=') || cookie.startsWith('ref_code=') || cookie.startsWith('ref=')) {
      const equalIndex = cookie.indexOf('=');
      const code = cookie.substring(equalIndex + 1);
      return isValidReferralCode(code) ? code.toUpperCase() : null;
    }
  }

  return null;
}

/**
 * 儲存推薦碼到 Cookie
 */
export function setReferralCodeCookie(
  code: string,
  options: { days?: number } = {}
): void {
  if (typeof document === 'undefined') {
    console.warn('[Affiliate] setReferralCodeCookie 只能在瀏覽器環境中使用');
    return;
  }

  const { days = 30 } = options;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = `affiliate_ref=${code}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

// ============================================================================
// 工具函數
// ============================================================================

/**
 * 檢查 Affiliate 配置是否已設定
 */
export function isAffiliateConfigured(): boolean {
  return getClient().isConfigured();
}

/**
 * 取得 Affiliate 系統 URL
 */
export function getAffiliateUrl(): string | null {
  return process.env.AFFILIATE_SYSTEM_URL?.trim() ||
         process.env.AFFILIATE_API_URL?.trim() ||
         null;
}

// ============================================================================
// 重新導出官方 SDK 類型
// ============================================================================

export type {
  AffiliateClient,
  AffiliateClientConfig,
  CommissionResult,
  CreateCommissionParams,
  RegistrationResult,
  TrackClickParams,
  TrackRegistrationParams as SDKTrackRegistrationParams,
} from '@/lib/sdk/affiliate-client';
