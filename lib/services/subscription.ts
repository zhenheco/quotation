/**
 * Subscription Service
 *
 * 訂閱系統服務層
 * - 方案管理
 * - 訂閱建立/升級/降級
 * - 功能存取控制
 * - 用量管理
 */

import { SupabaseClient, getSupabaseClient } from '@/lib/db/supabase-client'
import {
  SubscriptionTier,
  BillingCycle,
  SubscriptionStatus,
  SubscriptionPlan,
  CompanySubscription,
  getActiveSubscriptionPlans,
  getSubscriptionPlanByTier,
  getCompanySubscription,
  getCompanySubscriptionTier,
  createSubscription as dalCreateSubscription,
  updateSubscription,
  createSubscriptionHistory,
  checkFeatureAccess,
  checkUsageLimit,
  incrementUsage,
  ensureFreeSubscription,
  getPlanFeatures,
} from '@/lib/dal/subscriptions'

// Re-export createSubscription from DAL for external usage
export { dalCreateSubscription as createSubscriptionDirect }

// ============================================================================
// TIER ORDER (for upgrade/downgrade logic)
// ============================================================================

const TIER_ORDER: Record<SubscriptionTier, number> = {
  FREE: 0,
  STARTER: 1,
  STANDARD: 2,
  PROFESSIONAL: 3,
}

function isUpgrade(from: SubscriptionTier, to: SubscriptionTier): boolean {
  return TIER_ORDER[to] > TIER_ORDER[from]
}

function isDowngrade(from: SubscriptionTier, to: SubscriptionTier): boolean {
  return TIER_ORDER[to] < TIER_ORDER[from]
}

// ============================================================================
// PLAN QUERIES
// ============================================================================

/**
 * 取得所有可用的訂閱方案
 */
export async function getAllPlans(db?: SupabaseClient): Promise<SubscriptionPlan[]> {
  const client = db || getSupabaseClient()
  return getActiveSubscriptionPlans(client)
}

/**
 * 取得方案詳情（含功能列表）
 */
export async function getPlanDetails(
  tier: SubscriptionTier,
  db?: SupabaseClient
): Promise<{
  plan: SubscriptionPlan
  features: Array<{
    code: string
    name: string
    name_en: string
    is_enabled: boolean
    quota_limit: number | null
  }>
} | null> {
  const client = db || getSupabaseClient()

  const plan = await getSubscriptionPlanByTier(client, tier)
  if (!plan) return null

  const planFeatures = await getPlanFeatures(client, plan.id)

  return {
    plan,
    features: planFeatures.map((pf) => ({
      code: pf.feature.code,
      name: pf.feature.name,
      name_en: pf.feature.name_en,
      is_enabled: pf.is_enabled,
      quota_limit: pf.quota_limit,
    })),
  }
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * 取得公司的訂閱資訊
 */
export async function getSubscription(
  companyId: string,
  db?: SupabaseClient
): Promise<(CompanySubscription & { plan: SubscriptionPlan }) | null> {
  const client = db || getSupabaseClient()
  return getCompanySubscription(client, companyId)
}

/**
 * 取得公司的訂閱層級
 */
export async function getTier(
  companyId: string,
  db?: SupabaseClient
): Promise<SubscriptionTier> {
  const client = db || getSupabaseClient()
  return getCompanySubscriptionTier(client, companyId)
}

/**
 * 為公司建立免費訂閱（如果沒有的話）
 */
export async function createFreeSubscription(
  companyId: string,
  db?: SupabaseClient
): Promise<CompanySubscription | null> {
  const client = db || getSupabaseClient()
  return ensureFreeSubscription(client, companyId)
}

/**
 * 升級訂閱方案
 */
export async function upgradePlan(
  companyId: string,
  newTier: SubscriptionTier,
  options?: {
    billingCycle?: BillingCycle
    prorate?: boolean
    changedBy?: string
    externalSubscriptionId?: string
    externalCustomerId?: string
  },
  db?: SupabaseClient
): Promise<{
  success: boolean
  subscription?: CompanySubscription
  error?: string
}> {
  const client = db || getSupabaseClient()

  try {
    // 取得目前訂閱
    const currentSubscription = await getCompanySubscription(client, companyId)
    if (!currentSubscription) {
      return { success: false, error: 'No existing subscription found' }
    }

    const currentTier = currentSubscription.plan.tier

    // 檢查是否真的是升級
    if (!isUpgrade(currentTier, newTier)) {
      return {
        success: false,
        error: `Cannot upgrade from ${currentTier} to ${newTier}. Use downgradePlan for downgrades.`,
      }
    }

    // 取得新方案
    const newPlan = await getSubscriptionPlanByTier(client, newTier)
    if (!newPlan) {
      return { success: false, error: `Plan ${newTier} not found` }
    }

    // 計算新週期
    const now = new Date()
    const billingCycle = options?.billingCycle || currentSubscription.billing_cycle
    const periodEnd = new Date(now)

    if (billingCycle === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }

    // 更新訂閱
    const updatedSubscription = await updateSubscription(client, currentSubscription.id, {
      plan_id: newPlan.id,
      billing_cycle: billingCycle,
      status: 'ACTIVE',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      last_payment_at: now.toISOString(),
      external_subscription_id: options?.externalSubscriptionId || null,
      external_customer_id: options?.externalCustomerId || null,
    })

    // 記錄歷史
    await createSubscriptionHistory(client, {
      subscription_id: currentSubscription.id,
      previous_plan_id: currentSubscription.plan_id,
      new_plan_id: newPlan.id,
      previous_status: currentSubscription.status,
      new_status: 'ACTIVE',
      change_type: 'upgrade',
      changed_by: options?.changedBy,
    })

    return { success: true, subscription: updatedSubscription }
  } catch (error) {
    console.error('[Subscription] Upgrade failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 降級訂閱方案
 */
export async function downgradePlan(
  companyId: string,
  newTier: SubscriptionTier,
  options?: {
    effectiveAt?: 'immediately' | 'end_of_period'
    changedBy?: string
    reason?: string
  },
  db?: SupabaseClient
): Promise<{
  success: boolean
  subscription?: CompanySubscription
  error?: string
}> {
  const client = db || getSupabaseClient()

  try {
    // 取得目前訂閱
    const currentSubscription = await getCompanySubscription(client, companyId)
    if (!currentSubscription) {
      return { success: false, error: 'No existing subscription found' }
    }

    const currentTier = currentSubscription.plan.tier

    // 檢查是否真的是降級
    if (!isDowngrade(currentTier, newTier)) {
      return {
        success: false,
        error: `Cannot downgrade from ${currentTier} to ${newTier}. Use upgradePlan for upgrades.`,
      }
    }

    // 取得新方案
    const newPlan = await getSubscriptionPlanByTier(client, newTier)
    if (!newPlan) {
      return { success: false, error: `Plan ${newTier} not found` }
    }

    const effectiveAt = options?.effectiveAt || 'end_of_period'
    const now = new Date()

    if (effectiveAt === 'immediately') {
      // 立即降級
      const updatedSubscription = await updateSubscription(client, currentSubscription.id, {
        plan_id: newPlan.id,
        status: 'ACTIVE',
        current_period_start: now.toISOString(),
      })

      await createSubscriptionHistory(client, {
        subscription_id: currentSubscription.id,
        previous_plan_id: currentSubscription.plan_id,
        new_plan_id: newPlan.id,
        previous_status: currentSubscription.status,
        new_status: 'ACTIVE',
        change_type: 'downgrade',
        change_reason: options?.reason,
        changed_by: options?.changedBy,
      })

      return { success: true, subscription: updatedSubscription }
    } else {
      // 週期結束時降級（需要排程任務處理，這裡只記錄意圖）
      // TODO: 實作排程任務在週期結束時自動降級

      await createSubscriptionHistory(client, {
        subscription_id: currentSubscription.id,
        previous_plan_id: currentSubscription.plan_id,
        new_plan_id: newPlan.id,
        previous_status: currentSubscription.status,
        new_status: currentSubscription.status,
        change_type: 'downgrade',
        change_reason: `Scheduled for end of period: ${options?.reason || ''}`,
        changed_by: options?.changedBy,
      })

      return {
        success: true,
        subscription: currentSubscription,
      }
    }
  } catch (error) {
    console.error('[Subscription] Downgrade failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 取消訂閱
 */
export async function cancelSubscription(
  companyId: string,
  options?: {
    effectiveAt?: 'immediately' | 'end_of_period'
    reason?: string
    changedBy?: string
  },
  db?: SupabaseClient
): Promise<{
  success: boolean
  subscription?: CompanySubscription
  error?: string
}> {
  const client = db || getSupabaseClient()

  try {
    const currentSubscription = await getCompanySubscription(client, companyId)
    if (!currentSubscription) {
      return { success: false, error: 'No existing subscription found' }
    }

    // 免費版不能取消
    if (currentSubscription.plan.tier === 'FREE') {
      return { success: false, error: 'Cannot cancel free subscription' }
    }

    const effectiveAt = options?.effectiveAt || 'end_of_period'
    const now = new Date()

    if (effectiveAt === 'immediately') {
      // 立即取消，降級到免費版
      const freePlan = await getSubscriptionPlanByTier(client, 'FREE')
      if (!freePlan) {
        return { success: false, error: 'FREE plan not found' }
      }

      const updatedSubscription = await updateSubscription(client, currentSubscription.id, {
        plan_id: freePlan.id,
        status: 'CANCELLED',
        cancelled_at: now.toISOString(),
      })

      await createSubscriptionHistory(client, {
        subscription_id: currentSubscription.id,
        previous_plan_id: currentSubscription.plan_id,
        new_plan_id: freePlan.id,
        previous_status: currentSubscription.status,
        new_status: 'CANCELLED',
        change_type: 'cancel',
        change_reason: options?.reason,
        changed_by: options?.changedBy,
      })

      return { success: true, subscription: updatedSubscription }
    } else {
      // 標記為將在週期結束時取消
      const updatedSubscription = await updateSubscription(client, currentSubscription.id, {
        cancelled_at: now.toISOString(),
      })

      await createSubscriptionHistory(client, {
        subscription_id: currentSubscription.id,
        previous_plan_id: currentSubscription.plan_id,
        previous_status: currentSubscription.status,
        new_status: currentSubscription.status,
        change_type: 'cancel',
        change_reason: `Scheduled for end of period: ${options?.reason || ''}`,
        changed_by: options?.changedBy,
      })

      return { success: true, subscription: updatedSubscription }
    }
  } catch (error) {
    console.error('[Subscription] Cancel failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// FEATURE ACCESS CONTROL
// ============================================================================

/**
 * 檢查公司是否有某功能的存取權
 */
export async function hasFeatureAccess(
  companyId: string,
  featureCode: string,
  db?: SupabaseClient
): Promise<boolean> {
  const client = db || getSupabaseClient()
  const result = await checkFeatureAccess(client, companyId, featureCode)
  return result.has_access
}

/**
 * 驗證功能存取權（如無權限則拋出錯誤）
 */
export async function requireFeatureAccess(
  companyId: string,
  featureCode: string,
  db?: SupabaseClient
): Promise<void> {
  const hasAccess = await hasFeatureAccess(companyId, featureCode, db)

  if (!hasAccess) {
    const tier = await getTier(companyId, db)
    throw new FeatureNotAvailableError(featureCode, tier)
  }
}

/**
 * 功能不可用錯誤
 */
export class FeatureNotAvailableError extends Error {
  public readonly featureCode: string
  public readonly currentTier: SubscriptionTier
  public readonly statusCode = 402 // Payment Required

  constructor(featureCode: string, currentTier: SubscriptionTier) {
    super(`Feature '${featureCode}' is not available in the ${currentTier} plan`)
    this.name = 'FeatureNotAvailableError'
    this.featureCode = featureCode
    this.currentTier = currentTier
  }
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * 檢查用量是否在限制內
 */
export async function isWithinUsageLimit(
  companyId: string,
  featureCode: string,
  db?: SupabaseClient
): Promise<boolean> {
  const client = db || getSupabaseClient()
  const result = await checkUsageLimit(client, companyId, featureCode)
  return result.is_within_limit
}

/**
 * 驗證用量限制（如超過則拋出錯誤）
 */
export async function requireUsageWithinLimit(
  companyId: string,
  featureCode: string,
  db?: SupabaseClient
): Promise<void> {
  const client = db || getSupabaseClient()
  const result = await checkUsageLimit(client, companyId, featureCode)

  if (!result.is_within_limit) {
    throw new UsageLimitExceededError(
      featureCode,
      result.current_usage,
      result.quota_limit!
    )
  }
}

/**
 * 記錄用量
 */
export async function trackUsage(
  companyId: string,
  featureCode: string,
  amount: number = 1,
  db?: SupabaseClient
): Promise<void> {
  const client = db || getSupabaseClient()
  await incrementUsage(client, companyId, featureCode, amount)
}

/**
 * 用量超限錯誤
 */
export class UsageLimitExceededError extends Error {
  public readonly featureCode: string
  public readonly currentUsage: number
  public readonly quotaLimit: number
  public readonly statusCode = 402 // Payment Required

  constructor(featureCode: string, currentUsage: number, quotaLimit: number) {
    super(
      `Usage limit exceeded for '${featureCode}': ${currentUsage}/${quotaLimit}`
    )
    this.name = 'UsageLimitExceededError'
    this.featureCode = featureCode
    this.currentUsage = currentUsage
    this.quotaLimit = quotaLimit
  }
}

// ============================================================================
// SUBSCRIPTION SUMMARY
// ============================================================================

/**
 * 取得訂閱摘要（用於儀表板）
 */
export async function getSubscriptionSummary(
  companyId: string,
  db?: SupabaseClient
): Promise<{
  tier: SubscriptionTier
  tier_name: string
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  current_period_end: string
  days_remaining: number
  is_trial: boolean
  features: Array<{
    code: string
    name: string
    is_enabled: boolean
    quota_limit: number | null
  }>
}> {
  const client = db || getSupabaseClient()

  const subscription = await getCompanySubscription(client, companyId)

  if (!subscription) {
    // 預設返回免費版資訊
    const freePlanDetails = await getPlanDetails('FREE', client)

    return {
      tier: 'FREE',
      tier_name: '免費版',
      status: 'ACTIVE',
      billing_cycle: 'MONTHLY',
      current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      days_remaining: 36500,
      is_trial: false,
      features: freePlanDetails?.features || [],
    }
  }

  // 計算剩餘天數
  const periodEnd = new Date(subscription.current_period_end)
  const now = new Date()
  const daysRemaining = Math.max(
    0,
    Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )

  // 取得功能列表
  const planFeatures = await getPlanFeatures(client, subscription.plan_id)

  return {
    tier: subscription.plan.tier,
    tier_name: subscription.plan.name,
    status: subscription.status,
    billing_cycle: subscription.billing_cycle,
    current_period_end: subscription.current_period_end,
    days_remaining: daysRemaining,
    is_trial: subscription.status === 'TRIAL',
    features: planFeatures.map((pf) => ({
      code: pf.feature.code,
      name: pf.feature.name,
      is_enabled: pf.is_enabled,
      quota_limit: pf.quota_limit,
    })),
  }
}
