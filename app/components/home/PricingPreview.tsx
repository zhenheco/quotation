'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { useSubscriptionPlans, TIER_ORDER, type SubscriptionPlan } from '@/hooks/use-subscription'

// 方案功能描述（從資料庫讀取價格，但功能描述保留在前端）
// 強調報價系統與報稅系統的差異
const PLAN_FEATURES: Record<string, string[]> = {
  STARTER: [
    '📄 報價單 50 份/月',
    '🧾 營業稅計算',
    '⛔ 不含 401 媒體檔、營所稅',
  ],
  STANDARD: [
    '📄 報價單無限制',
    '📋 訂單 + 出貨管理',
    '🧾 完整報稅系統（401 + 營所稅）',
  ],
  PROFESSIONAL: [
    '📄 完整報價系統',
    '🧾 完整報稅系統',
    '🤖 AI 分析 + 稅務優化',
  ],
}

// 方案描述
const PLAN_DESCRIPTIONS: Record<string, string> = {
  STARTER: '基本報價 + 營業稅計算',
  STANDARD: '完整報價報稅系統',
  PROFESSIONAL: '企業級 + AI 智慧分析',
}

function PricingCardSkeleton() {
  return (
    <div className="p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-pulse">
      <div className="text-center mb-6">
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2" />
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-4" />
        <div className="h-12 w-28 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
      </div>
      <div className="space-y-3 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
      <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
  )
}

export function PricingPreview() {
  const { data: plans, isLoading } = useSubscriptionPlans()

  // 過濾掉免費方案，只顯示付費方案
  const paidPlans = plans
    ?.filter((p) => p.tier !== 'FREE')
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) || []

  return (
    <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* 標題 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            一杯咖啡的錢，換回你每天 2 小時
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            NT$249/月起，比請工讀生便宜，比 Excel 可靠。
          </p>
        </div>

        {/* 方案卡片 */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {isLoading ? (
            Array.from({ length: 3 }, (_, i) => (
              <PricingCardSkeleton key={i} />
            ))
          ) : (
            paidPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                features={PLAN_FEATURES[plan.tier] || []}
                description={PLAN_DESCRIPTIONS[plan.tier] || plan.description || ''}
                isPopular={plan.tier === 'STANDARD'}
              />
            ))
          )}
        </div>

        {/* 底部連結 */}
        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            查看完整功能比較
            <span className="text-xl">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

interface PricingCardProps {
  plan: SubscriptionPlan
  features: string[]
  description: string
  isPopular: boolean
}

function PricingCard({ plan, features, description, isPopular }: PricingCardProps) {
  const yearlyDiscount = Math.round((1 - plan.yearly_price / (plan.monthly_price * 12)) * 100)

  return (
    <div
      className={`relative p-8 rounded-2xl border-2 bg-white dark:bg-gray-800 transition-all hover:shadow-lg ${
        isPopular
          ? 'border-primary shadow-md scale-105'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 rounded-full bg-primary text-white text-sm font-medium">
            最受歡迎
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {plan.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {description}
        </p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            NT$ {plan.monthly_price.toLocaleString()}
          </span>
          <span className="text-gray-500">/月</span>
        </div>
        {yearlyDiscount > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            年繳 NT$ {plan.yearly_price.toLocaleString()}（省 {yearlyDiscount}%）
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/pricing"
        className={`block w-full py-3 rounded-lg text-center font-medium transition-colors ${
          isPopular
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        選擇方案
      </Link>
    </div>
  )
}
