/**
 * Subscription React Query Hooks
 *
 * 訂閱系統 React Query Hooks
 * - 方案列表查詢
 * - 公司訂閱狀態
 * - 訂閱操作（升級/降級/取消）
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionTier = 'FREE' | 'STARTER' | 'STANDARD' | 'PROFESSIONAL'
export type BillingCycle = 'MONTHLY' | 'YEARLY'
export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED'

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
}

export interface SubscriptionFeature {
  code: string
  name: string
  name_en: string
  is_enabled: boolean
  quota_limit: number | null
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
  plan: SubscriptionPlan
}

export interface SubscriptionSummary {
  tier: SubscriptionTier
  tier_name: string
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  current_period_end: string
  days_remaining: number
  is_trial: boolean
  features: SubscriptionFeature[]
}

export interface PlanDetails {
  plan: SubscriptionPlan
  features: SubscriptionFeature[]
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const subscriptionKeys = {
  all: ['subscription'] as const,
  plans: () => [...subscriptionKeys.all, 'plans'] as const,
  planDetails: (tier: SubscriptionTier) => [...subscriptionKeys.plans(), tier] as const,
  company: (companyId: string) => [...subscriptionKeys.all, 'company', companyId] as const,
  summary: (companyId: string) => [...subscriptionKeys.company(companyId), 'summary'] as const,
}

// ============================================================================
// PLAN QUERIES
// ============================================================================

/**
 * 取得所有訂閱方案列表
 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans(),
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const response = await fetch('/api/subscriptions/plans')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch subscription plans')
      }
      const data = await response.json()
      return data.plans
    },
    staleTime: 1000 * 60 * 60, // 1 hour - plans don't change often
  })
}

/**
 * 取得特定方案的詳細資訊（含功能列表）
 */
export function usePlanDetails(tier: SubscriptionTier | null) {
  return useQuery({
    queryKey: subscriptionKeys.planDetails(tier!),
    queryFn: async (): Promise<PlanDetails> => {
      const response = await fetch(`/api/subscriptions/plans?tier=${tier}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch plan details')
      }
      return response.json()
    },
    enabled: !!tier,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

// ============================================================================
// COMPANY SUBSCRIPTION QUERIES
// ============================================================================

/**
 * 取得公司的訂閱資訊
 */
export function useCompanySubscription(companyId: string | null | undefined) {
  return useQuery({
    queryKey: subscriptionKeys.company(companyId!),
    queryFn: async (): Promise<CompanySubscription | null> => {
      const response = await fetch(`/api/subscriptions?company_id=${companyId}`)
      if (!response.ok) {
        if (response.status === 404) return null
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch company subscription')
      }
      const data = await response.json()
      return data.subscription
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * 取得公司的訂閱摘要（用於儀表板）
 */
export function useSubscriptionSummary(companyId: string | null | undefined) {
  return useQuery({
    queryKey: subscriptionKeys.summary(companyId!),
    queryFn: async (): Promise<SubscriptionSummary> => {
      const response = await fetch(`/api/subscriptions?company_id=${companyId}&summary=true`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch subscription summary')
      }
      const data = await response.json()
      return data.summary
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// ============================================================================
// SUBSCRIPTION MUTATIONS
// ============================================================================

interface UpgradePlanParams {
  companyId: string
  newTier: SubscriptionTier
  billingCycle?: BillingCycle
}

/**
 * 升級訂閱方案
 */
export function useUpgradePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpgradePlanParams): Promise<CompanySubscription> => {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upgrade',
          company_id: params.companyId,
          new_tier: params.newTier,
          billing_cycle: params.billingCycle,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upgrade plan')
      }
      const data = await response.json()
      return data.subscription
    },
    onSuccess: (_data, variables) => {
      // Invalidate subscription queries
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.company(variables.companyId),
      })
    },
  })
}

interface DowngradePlanParams {
  companyId: string
  newTier: SubscriptionTier
  effectiveAt?: 'immediately' | 'end_of_period'
}

/**
 * 降級訂閱方案
 */
export function useDowngradePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: DowngradePlanParams): Promise<CompanySubscription> => {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'downgrade',
          company_id: params.companyId,
          new_tier: params.newTier,
          effective_at: params.effectiveAt,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to downgrade plan')
      }
      const data = await response.json()
      return data.subscription
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.company(variables.companyId),
      })
    },
  })
}

interface CancelSubscriptionParams {
  companyId: string
  effectiveAt?: 'immediately' | 'end_of_period'
  reason?: string
}

/**
 * 取消訂閱
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CancelSubscriptionParams): Promise<CompanySubscription> => {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          company_id: params.companyId,
          effective_at: params.effectiveAt,
          reason: params.reason,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel subscription')
      }
      const data = await response.json()
      return data.subscription
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.company(variables.companyId),
      })
    },
  })
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * 使快取失效
 */
export function useInvalidateSubscription() {
  const queryClient = useQueryClient()

  return (companyId?: string) => {
    if (companyId) {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.company(companyId),
      })
    } else {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.all,
      })
    }
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * 方案層級順序
 */
export const TIER_ORDER: Record<SubscriptionTier, number> = {
  FREE: 0,
  STARTER: 1,
  STANDARD: 2,
  PROFESSIONAL: 3,
}

/**
 * 判斷是否為升級
 */
export function isUpgrade(from: SubscriptionTier, to: SubscriptionTier): boolean {
  return TIER_ORDER[to] > TIER_ORDER[from]
}

/**
 * 判斷是否為降級
 */
export function isDowngrade(from: SubscriptionTier, to: SubscriptionTier): boolean {
  return TIER_ORDER[to] < TIER_ORDER[from]
}

/**
 * 計算年繳折扣百分比
 */
export function getYearlyDiscount(monthlyPrice: number, yearlyPrice: number): number {
  const fullYearPrice = monthlyPrice * 12
  if (fullYearPrice === 0) return 0
  return Math.round((1 - yearlyPrice / fullYearPrice) * 100)
}
