/**
 * Affiliate System SDK - 型別定義
 *
 * 此檔案包含所有 SDK 所需的 TypeScript 型別定義
 * 支援 Node.js 18+ 和 Edge Runtime（Cloudflare Workers、Vercel Edge）
 *
 * @version 1.0.0
 */

// ==================== 配置型別 ====================

/**
 * Affiliate 客戶端配置
 *
 * @example
 * ```typescript
 * const config: AffiliateClientConfig = {
 *   baseUrl: 'https://affiliate.1wayseo.com',
 *   webhookSecret: process.env.AFFILIATE_WEBHOOK_SECRET!,
 *   productCode: 'my-product',
 * };
 * ```
 */
export interface AffiliateClientConfig {
  /**
   * Affiliate System 的基礎 URL
   * 例如：'https://affiliate.1wayseo.com'
   */
  baseUrl: string;

  /**
   * 產品的 Webhook Secret
   * 從 Affiliate System Admin 後台取得
   * 用於驗證 API 呼叫的身份
   */
  webhookSecret: string;

  /**
   * 產品代碼
   * 從 Affiliate System Admin 後台取得
   * 例如：'1wayseo', 'my-saas'
   */
  productCode: string;
}

// ==================== 點擊追蹤 ====================

/**
 * 點擊追蹤參數
 *
 * 用於記錄訪客點擊推薦連結的事件
 * 此 API 不需要認證，可在前端或後端呼叫
 *
 * @example
 * ```typescript
 * await client.trackClick({
 *   referralCode: 'ABC12345',
 *   landingUrl: 'https://example.com/pricing',
 *   utmSource: 'facebook',
 *   utmMedium: 'social',
 * });
 * ```
 */
export interface TrackClickParams {
  /**
   * 推薦碼（8 位大寫英數字）
   * 格式：/^[A-Z0-9]{8}$/
   * 例如：'ABC12345'
   */
  referralCode: string;

  /**
   * Session ID（可選）
   * 用於關聯同一訪客的多次點擊
   * 建議使用 UUID 或隨機字串
   */
  sessionId?: string;

  /**
   * 著陸頁 URL（可選）
   * 訪客點擊後到達的頁面
   */
  landingUrl?: string;

  /**
   * 來源頁 URL（可選）
   * 訪客點擊前所在的頁面（HTTP Referer）
   */
  referrerUrl?: string;

  // UTM 參數（可選）
  /** UTM 來源，例如：'google', 'facebook' */
  utmSource?: string;
  /** UTM 媒介，例如：'cpc', 'social', 'email' */
  utmMedium?: string;
  /** UTM 活動名稱 */
  utmCampaign?: string;
  /** UTM 關鍵字 */
  utmTerm?: string;
  /** UTM 內容 */
  utmContent?: string;
}

// ==================== 註冊追蹤 ====================

/**
 * 註冊追蹤參數
 *
 * 用於建立推薦關係，當被推薦用戶完成註冊時呼叫
 * 需要 webhook_secret 認證，只能在後端呼叫
 *
 * @example
 * ```typescript
 * await client.trackRegistration({
 *   referralCode: 'ABC12345',
 *   referredUserId: 'user-uuid-xxx',
 *   referredUserEmail: 'user@example.com',
 *   sourceUrl: 'https://example.com/signup',
 * });
 * ```
 */
export interface TrackRegistrationParams {
  /**
   * 推薦碼（8 位大寫英數字）
   * 通常從 Cookie 中的 'affiliate_ref' 取得
   */
  referralCode: string;

  /**
   * 被推薦用戶的 UUID
   * 您系統中用戶的唯一識別碼
   */
  referredUserId: string;

  /**
   * 被推薦用戶的 Email（可選但建議提供）
   * 用於追蹤和通知
   */
  referredUserEmail?: string;

  /**
   * 註冊來源頁面 URL（可選）
   */
  sourceUrl?: string;

  // UTM 參數（可選）
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/**
 * 註冊追蹤結果
 */
export interface RegistrationResult {
  /** 是否成功 */
  success: boolean;
  /** 建立的推薦關係 ID */
  referralId: string;
}

// ==================== 佣金建立 ====================

/**
 * 訂單類型
 */
export type OrderType =
  | "subscription" // 訂閱付款
  | "addon" // 加購項目
  | "renewal" // 續訂
  | "upgrade" // 升級方案
  | "one_time"; // 一次性付款

/**
 * 佣金建立參數
 *
 * 用於在付款成功時建立佣金記錄
 * 需要 webhook_secret 認證，只能在後端呼叫
 *
 * @example
 * ```typescript
 * await client.createCommission({
 *   referredUserId: 'user-uuid-xxx',
 *   externalOrderId: 'ORDER-2025-001',
 *   orderAmount: 1990,
 *   orderType: 'subscription',
 * });
 * ```
 */
export interface CreateCommissionParams {
  /**
   * 付款用戶的 UUID
   * 必須與註冊追蹤時的 referredUserId 相同
   */
  referredUserId: string;

  /**
   * 您系統中的訂單 ID
   * 用於冪等性檢查，防止重複建立佣金
   */
  externalOrderId: string;

  /**
   * 訂單金額（正整數）
   * 單位：最小貨幣單位（如新台幣的元）
   */
  orderAmount: number;

  /**
   * 訂單類型
   */
  orderType: OrderType;

  /**
   * 貨幣代碼（可選）
   * 預設：'TWD'
   */
  currency?: string;
}

/**
 * 佣金建立結果
 */
export interface CommissionResult {
  /** 是否成功 */
  success: boolean;
  /** 建立的佣金記錄 ID */
  commissionId: string;
  /** 基礎佣金比例（百分比） */
  baseRate: number;
  /** 等級加成（百分比） */
  tierBonus: number;
  /** 有效佣金比例 = baseRate + tierBonus */
  effectiveRate: number;
  /** 佣金金額 = orderAmount * effectiveRate / 100 */
  commissionAmount: number;
  /** 佣金解鎖時間（ISO 8601 格式） */
  unlockAt: string;
}

// ==================== 客戶端介面 ====================

/**
 * Affiliate 客戶端介面
 *
 * @example
 * ```typescript
 * const client = createAffiliateClient({
 *   baseUrl: 'https://affiliate.1wayseo.com',
 *   webhookSecret: process.env.AFFILIATE_WEBHOOK_SECRET!,
 *   productCode: 'my-product',
 * });
 *
 * // 檢查配置
 * if (client.isConfigured()) {
 *   await client.trackRegistration({ ... });
 * }
 * ```
 */
export interface AffiliateClient {
  /**
   * 檢查客戶端是否已正確配置
   * @returns 如果所有必要配置都已設定則返回 true
   */
  isConfigured(): boolean;

  /**
   * 追蹤點擊事件
   *
   * 此方法不需要認證，可在前端或後端呼叫
   * 失敗時返回 false，不會拋出錯誤
   *
   * @param params - 點擊追蹤參數
   * @returns 成功返回 true，失敗返回 false
   */
  trackClick(params: TrackClickParams): Promise<boolean>;

  /**
   * 追蹤用戶註冊
   *
   * 在用戶註冊成功後呼叫，建立推薦關係
   * 只能在後端呼叫（需要 webhook_secret）
   *
   * @param params - 註冊追蹤參數
   * @returns 成功返回結果物件，失敗返回 null
   *
   * @remarks
   * - 如果推薦關係已存在（409），返回 null（正常情況）
   * - 如果推薦碼無效或停用，返回 null
   * - 此方法永不拋出錯誤，失敗時靜默返回 null
   */
  trackRegistration(
    params: TrackRegistrationParams
  ): Promise<RegistrationResult | null>;

  /**
   * 建立佣金記錄
   *
   * 在付款成功後呼叫，為推薦人建立佣金
   * 只能在後端呼叫（需要 webhook_secret）
   *
   * @param params - 佣金建立參數
   * @returns 成功返回結果物件，失敗或無推薦關係時返回 null
   *
   * @remarks
   * - 如果用戶沒有推薦關係（非推薦用戶），返回 null（正常情況）
   * - 如果訂單已存在（409），返回 null（冪等處理）
   * - 此方法永不拋出錯誤，失敗時靜默返回 null
   */
  createCommission(
    params: CreateCommissionParams
  ): Promise<CommissionResult | null>;
}

// ==================== 錯誤型別 ====================

/**
 * API 錯誤回應
 * @internal
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}
