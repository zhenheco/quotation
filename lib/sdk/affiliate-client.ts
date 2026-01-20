/**
 * Affiliate System SDK 客戶端
 *
 * 封裝與 Affiliate System 的 API 通訊，支援 Node.js 18+ 和 Edge Runtime
 *
 * @version 1.0.0
 * @example
 * ```typescript
 * const client = createAffiliateClient({
 *   baseUrl: process.env.AFFILIATE_SYSTEM_URL!,
 *   webhookSecret: process.env.AFFILIATE_WEBHOOK_SECRET!,
 *   productCode: process.env.AFFILIATE_PRODUCT_CODE!,
 * });
 *
 * // 追蹤註冊
 * await client.trackRegistration({
 *   referralCode: 'ABC12345',
 *   referredUserId: 'user-uuid',
 * });
 *
 * // 建立佣金
 * await client.createCommission({
 *   referredUserId: 'user-uuid',
 *   externalOrderId: 'ORDER-001',
 *   orderAmount: 1990,
 *   orderType: 'subscription',
 * });
 * ```
 */

import type {
  AffiliateClient,
  AffiliateClientConfig,
  ApiErrorResponse,
  CommissionResult,
  CreateCommissionParams,
  RegistrationResult,
  TrackClickParams,
  TrackRegistrationParams,
} from "./affiliate-types";

export type {
  AffiliateClient,
  AffiliateClientConfig,
  CommissionResult,
  CreateCommissionParams,
  RegistrationResult,
  TrackClickParams,
  TrackRegistrationParams,
} from "./affiliate-types";

/**
 * 建立 Affiliate 客戶端
 *
 * @param config - 客戶端配置
 * @returns Affiliate 客戶端實例
 *
 * @example
 * ```typescript
 * const client = createAffiliateClient({
 *   baseUrl: process.env.AFFILIATE_SYSTEM_URL!,
 *   webhookSecret: process.env.AFFILIATE_WEBHOOK_SECRET!,
 *   productCode: process.env.AFFILIATE_PRODUCT_CODE!,
 * });
 *
 * if (!client.isConfigured()) {
 *   console.warn('Affiliate SDK 未正確配置');
 * }
 * ```
 */
export function createAffiliateClient(
  config: Partial<AffiliateClientConfig>
): AffiliateClient {
  const baseUrl = config.baseUrl?.trim();
  const webhookSecret = config.webhookSecret?.trim();
  const productCode = config.productCode?.trim();

  const isConfigured = (): boolean => !!(baseUrl && webhookSecret && productCode);

  const trackClick = async (params: TrackClickParams): Promise<boolean> => {
    if (!isConfigured()) {
      console.warn("[AffiliateSDK] 系統未配置，跳過點擊追蹤");
      return false;
    }

    try {
      const response = await fetch(`${baseUrl}/api/tracking/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode, ...params }),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        console.error("[AffiliateSDK] 點擊追蹤失敗:", error.error || error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[AffiliateSDK] 點擊追蹤錯誤:", error);
      return false;
    }
  };

  const trackRegistration = async (
    params: TrackRegistrationParams
  ): Promise<RegistrationResult | null> => {
    if (!isConfigured()) {
      console.warn("[AffiliateSDK] 系統未配置，跳過註冊追蹤");
      return null;
    }

    try {
      const response = await fetch(`${baseUrl}/api/tracking/registration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": webhookSecret!,
        },
        body: JSON.stringify({ productCode, ...params }),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as ApiErrorResponse;

        // 處理常見的正常情況
        if (response.status === 409) {
          console.log("[AffiliateSDK] 推薦關係已存在");
          return null;
        }

        if (response.status === 400) {
          console.log("[AffiliateSDK] 推薦碼無效或停用");
          return null;
        }

        console.error("[AffiliateSDK] 註冊追蹤失敗:", error.error || error);
        return null;
      }

      const result = (await response.json()) as RegistrationResult;
      console.log("[AffiliateSDK] 註冊追蹤成功:", result.referralId);
      return result;
    } catch (error) {
      console.error("[AffiliateSDK] 註冊追蹤錯誤:", error);
      return null;
    }
  };

  const createCommission = async (
    params: CreateCommissionParams
  ): Promise<CommissionResult | null> => {
    if (!isConfigured()) {
      console.warn("[AffiliateSDK] 系統未配置，跳過佣金建立");
      return null;
    }

    try {
      const response = await fetch(`${baseUrl}/api/commissions/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": webhookSecret!,
        },
        body: JSON.stringify({
          productCode,
          currency: params.currency || "TWD",
          ...params,
        }),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as ApiErrorResponse;

        // 靜默處理常見情況
        if (response.status === 400) {
          return null;
        }

        // 處理重複訂單
        if (response.status === 409) {
          console.log("[AffiliateSDK] 訂單已存在");
          return null;
        }

        console.error("[AffiliateSDK] 佣金建立失敗:", error.error || error);
        return null;
      }

      const result = (await response.json()) as CommissionResult;
      console.log(`[AffiliateSDK] 佣金建立成功: ${result.commissionAmount} 元 (${result.effectiveRate}%)`);
      return result;
    } catch (error) {
      console.error("[AffiliateSDK] 佣金建立錯誤:", error);
      return null;
    }
  };

  return {
    isConfigured,
    trackClick,
    trackRegistration,
    createCommission,
  };
}

/**
 * 預設 Affiliate 客戶端（從環境變數自動配置）
 */
export const defaultClient = createAffiliateClient({
  baseUrl: process.env.AFFILIATE_SYSTEM_URL,
  webhookSecret: process.env.AFFILIATE_WEBHOOK_SECRET,
  productCode: process.env.AFFILIATE_PRODUCT_CODE,
});

// ==================== 向後相容的獨立函數 ====================

/**
 * 追蹤推薦註冊（使用預設客戶端）
 *
 * @example
 * ```typescript
 * await trackRegistration({
 *   referralCode: affiliateRef,
 *   referredUserId: user.id,
 *   referredUserEmail: user.email,
 * });
 * ```
 */
export async function trackRegistration(
  params: TrackRegistrationParams
): Promise<RegistrationResult | null> {
  return defaultClient.trackRegistration(params);
}

/**
 * 建立佣金記錄（使用預設客戶端）
 *
 * @example
 * ```typescript
 * await createCommission({
 *   referredUserId: order.userId,
 *   externalOrderId: order.id,
 *   orderAmount: order.amount,
 *   orderType: 'subscription',
 * });
 * ```
 */
export async function createCommission(
  params: CreateCommissionParams
): Promise<CommissionResult | null> {
  return defaultClient.createCommission(params);
}

/**
 * 追蹤點擊事件（使用預設客戶端）
 *
 * @example
 * ```typescript
 * await trackClick({
 *   referralCode: 'ABC12345',
 *   landingUrl: window.location.href,
 * });
 * ```
 */
export async function trackClick(params: TrackClickParams): Promise<boolean> {
  return defaultClient.trackClick(params);
}
