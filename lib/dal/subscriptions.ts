/**
 * Subscription System DAL (Data Access Layer)
 *
 * 訂閱系統資料存取層
 * - 訂閱方案查詢
 * - 公司訂閱管理
 * - 功能存取檢查
 * - 用量追蹤
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionTier = 'FREE' | 'STARTER' | 'STANDARD' | 'PROFESSIONAL'
export type BillingCycle = 'MONTHLY' | 'YEARLY'
export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED'
export type FeatureCategory = 'QUOTA' | 'FEATURE' | 'INTEGRATION'

export interface SubscriptionPlan {
  id: string
  tier: SubscriptionTier
  name: string
  name_en: string
  description: string | null
  description_en: string | null
  monthly_price: number
  yearly_price: number
  currency: string
  max_products: number
  max_customers: number
  max_quotations_per_month: number
  max_companies: number
  is_active: boolean
  is_popular: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SubscriptionFeature {
  id: string
  code: string
  name: string
  name_en: string
  description: string | null
  category: FeatureCategory
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PlanFeature {
  id: string
  plan_id: string
  feature_id: string
  is_enabled: boolean
  quota_limit: number | null
  created_at: string
}

export interface CompanySubscription {
  id: string
  company_id: string
  plan_id: string
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  started_at: string
  current_period_start: string
  current_period_end: string
  trial_ends_at: string | null
  cancelled_at: string | null
  last_payment_at: string | null
  next_payment_at: string | null
  external_subscription_id: string | null
  external_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface UsageTracking {
  id: string
  company_id: string
  feature_code: string
  period_start: string
  period_end: string
  usage_count: number
  quota_limit: number | null
  created_at: string
  updated_at: string
}

export interface SubscriptionHistory {
  id: string
  subscription_id: string
  previous_plan_id: string | null
  new_plan_id: string | null
  previous_status: SubscriptionStatus | null
  new_status: SubscriptionStatus | null
  change_type: string
  change_reason: string | null
  amount: number | null
  proration_amount: number | null
  changed_by: string | null
  created_at: string
}

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

/**
 * 取得所有有效的訂閱方案
 */
export async function getActiveSubscriptionPlans(
  db: SupabaseClient
): Promise<SubscriptionPlan[]> {
  const { data, error } = await db
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to get subscription plans: ${error.message}`)
  }

  return data || []
}

/**
 * 根據層級取得訂閱方案
 */
export async function getSubscriptionPlanByTier(
  db: SupabaseClient,
  tier: SubscriptionTier
): Promise<SubscriptionPlan | null> {
  const { data, error } = await db
    .from('subscription_plans')
    .select('*')
    .eq('tier', tier)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get subscription plan: ${error.message}`)
  }

  return data
}

/**
 * 取得方案的所有功能
 */
export async function getPlanFeatures(
  db: SupabaseClient,
  planId: string
): Promise<(PlanFeature & { feature: SubscriptionFeature })[]> {
  const { data, error } = await db
    .from('plan_features')
    .select(`
      *,
      feature:subscription_features(*)
    `)
    .eq('plan_id', planId)

  if (error) {
    throw new Error(`Failed to get plan features: ${error.message}`)
  }

  return (data || []).map((row) => ({
    ...row,
    feature: row.feature as unknown as SubscriptionFeature,
  }))
}

// ============================================================================
// COMPANY SUBSCRIPTIONS
// ============================================================================

/**
 * 取得公司的訂閱資訊
 */
export async function getCompanySubscription(
  db: SupabaseClient,
  companyId: string
): Promise<(CompanySubscription & { plan: SubscriptionPlan }) | null> {
  const { data, error } = await db
    .from('company_subscriptions')
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq('company_id', companyId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get company subscription: ${error.message}`)
  }

  if (!data) return null

  return {
    ...data,
    plan: data.plan as unknown as SubscriptionPlan,
  }
}

/**
 * 取得公司目前的訂閱層級
 */
export async function getCompanySubscriptionTier(
  db: SupabaseClient,
  companyId: string
): Promise<SubscriptionTier> {
  const subscription = await getCompanySubscription(db, companyId)

  if (!subscription || !['ACTIVE', 'TRIAL'].includes(subscription.status)) {
    return 'FREE'
  }

  return subscription.plan.tier
}

/**
 * 為公司建立訂閱
 */
export async function createSubscription(
  db: SupabaseClient,
  data: {
    company_id: string
    plan_id: string
    billing_cycle?: BillingCycle
    status?: SubscriptionStatus
    trial_ends_at?: string | null
    external_subscription_id?: string | null
    external_customer_id?: string | null
  }
): Promise<CompanySubscription> {
  const now = new Date()
  const billingCycle = data.billing_cycle || 'MONTHLY'
  const periodEnd = new Date(now)

  if (billingCycle === 'MONTHLY') {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  }

  const { data: subscription, error } = await db
    .from('company_subscriptions')
    .upsert(
      {
        company_id: data.company_id,
        plan_id: data.plan_id,
        status: data.status || 'ACTIVE',
        billing_cycle: billingCycle,
        started_at: now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_ends_at: data.trial_ends_at || null,
        external_subscription_id: data.external_subscription_id || null,
        external_customer_id: data.external_customer_id || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        onConflict: 'company_id',
      }
    )
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to create subscription: ${error.message}`)
  }

  return subscription
}

/**
 * 更新訂閱
 */
export async function updateSubscription(
  db: SupabaseClient,
  subscriptionId: string,
  data: Partial<{
    plan_id: string
    status: SubscriptionStatus
    billing_cycle: BillingCycle
    current_period_start: string
    current_period_end: string
    cancelled_at: string | null
    last_payment_at: string | null
    next_payment_at: string | null
    external_subscription_id: string | null
    external_customer_id: string | null
  }>
): Promise<CompanySubscription> {
  const { data: subscription, error } = await db
    .from('company_subscriptions')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`)
  }

  return subscription
}

/**
 * 記錄訂閱變更歷史
 */
export async function createSubscriptionHistory(
  db: SupabaseClient,
  data: {
    subscription_id: string
    previous_plan_id?: string | null
    new_plan_id?: string | null
    previous_status?: SubscriptionStatus | null
    new_status?: SubscriptionStatus | null
    change_type: string
    change_reason?: string | null
    amount?: number | null
    proration_amount?: number | null
    changed_by?: string | null
  }
): Promise<SubscriptionHistory> {
  const { data: history, error } = await db
    .from('subscription_history')
    .insert({
      subscription_id: data.subscription_id,
      previous_plan_id: data.previous_plan_id || null,
      new_plan_id: data.new_plan_id || null,
      previous_status: data.previous_status || null,
      new_status: data.new_status || null,
      change_type: data.change_type,
      change_reason: data.change_reason || null,
      amount: data.amount || null,
      proration_amount: data.proration_amount || null,
      changed_by: data.changed_by || null,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to create subscription history: ${error.message}`)
  }

  return history
}

// ============================================================================
// FEATURE ACCESS
// ============================================================================

/**
 * 檢查公司是否有某功能的存取權
 */
export async function checkFeatureAccess(
  db: SupabaseClient,
  companyId: string,
  featureCode: string
): Promise<{
  has_access: boolean
  feature_code: string
  current_tier: SubscriptionTier
  quota_limit: number | null
}> {
  // 取得公司的訂閱
  const subscription = await getCompanySubscription(db, companyId)

  if (!subscription || !['ACTIVE', 'TRIAL'].includes(subscription.status)) {
    return {
      has_access: false,
      feature_code: featureCode,
      current_tier: 'FREE',
      quota_limit: null,
    }
  }

  // 取得方案的功能
  const planFeatures = await getPlanFeatures(db, subscription.plan_id)
  const planFeature = planFeatures.find((pf) => pf.feature.code === featureCode)

  return {
    has_access: planFeature?.is_enabled ?? false,
    feature_code: featureCode,
    current_tier: subscription.plan.tier,
    quota_limit: planFeature?.quota_limit ?? null,
  }
}

/**
 * 取得公司某功能的用量限制
 */
export async function getFeatureQuota(
  db: SupabaseClient,
  companyId: string,
  featureCode: string
): Promise<number | null> {
  const access = await checkFeatureAccess(db, companyId, featureCode)
  return access.quota_limit
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * 取得當前週期的用量
 */
export async function getCurrentUsage(
  db: SupabaseClient,
  companyId: string,
  featureCode: string
): Promise<UsageTracking | null> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const { data, error } = await db
    .from('usage_tracking')
    .select('*')
    .eq('company_id', companyId)
    .eq('feature_code', featureCode)
    .eq('period_start', periodStart)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get usage: ${error.message}`)
  }

  return data
}

/**
 * 增加用量計數
 */
export async function incrementUsage(
  db: SupabaseClient,
  companyId: string,
  featureCode: string,
  amount: number = 1
): Promise<UsageTracking> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // 取得用量限制
  const quota = await getFeatureQuota(db, companyId, featureCode)

  // 先嘗試更新現有記錄
  const { data: existing } = await db
    .from('usage_tracking')
    .select('*')
    .eq('company_id', companyId)
    .eq('feature_code', featureCode)
    .eq('period_start', periodStart.toISOString().split('T')[0])
    .single()

  if (existing) {
    const { data, error } = await db
      .from('usage_tracking')
      .update({
        usage_count: existing.usage_count + amount,
        updated_at: now.toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to update usage: ${error.message}`)
    }

    return data
  }

  // 建立新記錄
  const { data, error } = await db
    .from('usage_tracking')
    .insert({
      company_id: companyId,
      feature_code: featureCode,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      usage_count: amount,
      quota_limit: quota,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to create usage record: ${error.message}`)
  }

  return data
}

/**
 * 檢查是否超過用量限制
 */
export async function checkUsageLimit(
  db: SupabaseClient,
  companyId: string,
  featureCode: string
): Promise<{
  is_within_limit: boolean
  current_usage: number
  quota_limit: number | null
  remaining: number | null
}> {
  const [usage, quota] = await Promise.all([
    getCurrentUsage(db, companyId, featureCode),
    getFeatureQuota(db, companyId, featureCode),
  ])

  const currentUsage = usage?.usage_count ?? 0

  // null 或 -1 表示無限制
  if (quota === null || quota === -1) {
    return {
      is_within_limit: true,
      current_usage: currentUsage,
      quota_limit: quota,
      remaining: null,
    }
  }

  const remaining = quota - currentUsage
  return {
    is_within_limit: remaining > 0,
    current_usage: currentUsage,
    quota_limit: quota,
    remaining: Math.max(0, remaining),
  }
}

// ============================================================================
// FREE SUBSCRIPTION HELPER
// ============================================================================

/**
 * 為公司建立免費訂閱（如果沒有的話）
 * 這是 create_free_subscription_for_company 觸發器的 TypeScript 版本
 */
export async function ensureFreeSubscription(
  db: SupabaseClient,
  companyId: string
): Promise<CompanySubscription | null> {
  // 檢查是否已有訂閱
  const existing = await getCompanySubscription(db, companyId)
  if (existing) {
    return existing
  }

  // 取得免費方案
  const freePlan = await getSubscriptionPlanByTier(db, 'FREE')
  if (!freePlan) {
    console.error('[Subscription] FREE plan not found in database')
    return null
  }

  // 建立免費訂閱
  const subscription = await createSubscription(db, {
    company_id: companyId,
    plan_id: freePlan.id,
    billing_cycle: 'MONTHLY',
    status: 'ACTIVE',
  })

  // 設定永不過期
  await updateSubscription(db, subscription.id, {
    current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
  })

  console.log(`[Subscription] Created FREE subscription for company ${companyId}`)
  return subscription
}
