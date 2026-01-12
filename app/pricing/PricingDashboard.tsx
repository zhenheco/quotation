'use client'

import { useState, useMemo, useCallback } from 'react'
import { useCompany } from '@/hooks/useCompany'
import {
  useSubscriptionPlans,
  useCompanySubscription,
  type SubscriptionTier,
  type BillingCycle,
  type SubscriptionPlan,
  TIER_ORDER,
} from '@/hooks/use-subscription'
import { submitPaymentForm } from '@/lib/sdk/payment-gateway-client'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// 新元件
import { PricingHero } from './components/PricingHero'
import { PricingCardsGrid } from './components/PricingCard'
import { FeatureComparisonTable } from './components/FeatureComparisonTable'
import { CheckoutModal } from './components/CheckoutModal'
import { PricingFAQ } from './components/PricingFAQ'
import { FinalCTA } from './components/FinalCTA'

/**
 * 定價頁面儀表板
 *
 * 整合所有新設計的定價頁面元件：
 * - PricingHero: Hero Section + 計費切換
 * - PricingCardsGrid: 方案卡片網格
 * - FeatureComparisonTable: 功能比較表
 * - PricingFAQ: 常見問題
 * - FinalCTA: 最終 CTA
 * - CheckoutModal: 付款確認 Modal
 */
export default function PricingDashboard() {
  const { company } = useCompany()

  // 計費週期切換
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('YEARLY')

  // Checkout Modal 狀態
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // 取得方案列表
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans()

  // 取得公司訂閱（如果已登入）
  const { data: subscription, isLoading: subscriptionLoading } = useCompanySubscription(company?.id)

  // 當前方案層級
  const currentTier = subscription?.plan?.tier || null

  // 排序後的方案列表
  const sortedPlans = useMemo(() => {
    if (!plans) return []
    return [...plans].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])
  }, [plans])

  // 處理方案選擇
  const handleSelectPlan = useCallback(
    (tier: SubscriptionTier) => {
      if (!company?.id) {
        // 未登入，導向登入頁面
        window.location.href = '/login?redirect=/pricing'
        return
      }

      if (tier === currentTier) {
        return // 已是當前方案
      }

      if (tier === 'FREE') {
        // 降級到免費版，導向設定頁面
        window.location.href = '/settings/subscription'
        return
      }

      // 找到選中的方案
      const plan = sortedPlans.find((p) => p.tier === tier)
      if (plan) {
        setSelectedPlan(plan)
        setIsCheckoutOpen(true)
      }
    },
    [company?.id, currentTier, sortedPlans]
  )

  // 關閉 Checkout Modal
  const handleCloseCheckout = useCallback(() => {
    setIsCheckoutOpen(false)
    setSelectedPlan(null)
  }, [])

  // 確認付款
  const handleConfirmCheckout = useCallback(async () => {
    if (!selectedPlan || !company?.id) {
      throw new Error('缺少必要資訊')
    }

    // 呼叫 checkout API
    const response = await fetch('/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: selectedPlan.tier,
        billing_cycle: billingCycle,
        company_id: company.id,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '付款建立失敗')
    }

    // 提交表單到 PAYUNi
    if (result.data?.paymentForm) {
      submitPaymentForm(result.data.paymentForm)
    } else {
      throw new Error('無法取得付款表單')
    }
  }, [selectedPlan, company?.id, billingCycle])

  // 載入中狀態
  if (plansLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      {/* Hero Section + 計費切換 */}
      <PricingHero billingCycle={billingCycle} onBillingCycleChange={setBillingCycle} />

      {/* 方案卡片 */}
      <PricingCardsGrid
        plans={sortedPlans}
        billingCycle={billingCycle}
        currentTier={currentTier}
        isLoading={subscriptionLoading}
        onSelect={handleSelectPlan}
      />

      {/* 功能比較表 */}
      <FeatureComparisonTable currentTier={currentTier} />

      {/* FAQ */}
      <PricingFAQ />

      {/* 最終 CTA */}
      <FinalCTA />

      {/* 付款確認 Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={handleCloseCheckout}
        onConfirm={handleConfirmCheckout}
        plan={selectedPlan}
        billingCycle={billingCycle}
        currentTier={currentTier}
      />
    </div>
  )
}
