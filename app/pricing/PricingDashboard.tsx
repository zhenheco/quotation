'use client'

import { useState, useMemo } from 'react'
import { useCompany } from '@/hooks/useCompany'
import {
  useSubscriptionPlans,
  useCompanySubscription,
  useUpgradePlan,
  type SubscriptionTier,
  type BillingCycle,
  type SubscriptionPlan,
  isUpgrade,
  isDowngrade,
  getYearlyDiscount,
  TIER_ORDER,
} from '@/hooks/use-subscription'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

// 功能列表定義
const PLAN_FEATURES: Record<SubscriptionTier, string[]> = {
  FREE: [
    '產品上限 50 個',
    '客戶上限 20 個',
    '每月報價單 10 份',
    '基本報表',
  ],
  STARTER: [
    '產品上限 200 個',
    '客戶上限 100 個',
    '每月報價單 50 份',
    '營業稅計算',
    'Email 支援',
  ],
  STANDARD: [
    '產品數量無限制',
    '客戶數量無限制',
    '報價單無限制',
    '401 媒體檔匯出',
    '營所稅申報',
    '最多 3 間公司',
    '優先客服支援',
  ],
  PROFESSIONAL: [
    '包含所有標準版功能',
    'AI 現金流分析',
    'AI 應收風險分析',
    'AI 稅務優化建議',
    'API 存取',
    '最多 10 間公司',
    '專屬客服經理',
  ],
}

/**
 * 定價頁面儀表板
 */
export default function PricingDashboard() {
  const { company } = useCompany()

  // 計費週期切換
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('YEARLY')

  // 取得方案列表
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans()

  // 取得公司訂閱（如果已登入）
  const { data: subscription, isLoading: subscriptionLoading } = useCompanySubscription(company?.id)

  // 升級方案 mutation
  const upgradeMutation = useUpgradePlan()

  // 當前方案層級
  const currentTier = subscription?.plan?.tier || 'FREE'

  // 排序後的方案列表
  const sortedPlans = useMemo(() => {
    if (!plans) return []
    return [...plans].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])
  }, [plans])

  // 處理方案選擇
  const handleSelectPlan = async (tier: SubscriptionTier) => {
    if (!company?.id) {
      // 未登入，導向登入頁面
      window.location.href = '/login?redirect=/pricing'
      return
    }

    if (tier === currentTier) {
      return // 已是當前方案
    }

    // 檢查是升級還是降級
    if (isUpgrade(currentTier, tier)) {
      try {
        await upgradeMutation.mutateAsync({
          companyId: company.id,
          newTier: tier,
          billingCycle,
        })
      } catch (error) {
        console.error('Upgrade failed:', error)
      }
    } else if (isDowngrade(currentTier, tier)) {
      // 降級需要確認，這裡可以加入對話框
      // 暫時直接導向設定頁面
      window.location.href = '/settings/subscription'
    }
  }

  if (plansLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* 標題區域 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">選擇適合您的方案</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          選擇適合您業務需求的方案，隨時可以升級或降級
        </p>
      </div>

      {/* 計費週期切換 */}
      <div className="flex justify-center items-center gap-4 mb-12">
        <span
          className={`text-sm font-medium ${billingCycle === 'MONTHLY' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          月繳
        </span>
        <Switch
          checked={billingCycle === 'YEARLY'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'YEARLY' : 'MONTHLY')}
        />
        <span
          className={`text-sm font-medium ${billingCycle === 'YEARLY' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          年繳
        </span>
        {billingCycle === 'YEARLY' && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            省 17%
          </span>
        )}
      </div>

      {/* 方案卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sortedPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            currentTier={currentTier}
            isLoading={subscriptionLoading || upgradeMutation.isPending}
            onSelect={handleSelectPlan}
          />
        ))}
      </div>

      {/* 功能比較表 */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          功能比較
        </h2>
        <FeatureComparisonTable plans={sortedPlans} />
      </div>

      {/* FAQ 區域 */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          常見問題
        </h2>
        <FaqSection />
      </div>
    </div>
  )
}

// ============================================
// 方案卡片元件
// ============================================

interface PlanCardProps {
  plan: SubscriptionPlan
  billingCycle: BillingCycle
  currentTier: SubscriptionTier
  isLoading: boolean
  onSelect: (tier: SubscriptionTier) => void
}

function PlanCard({
  plan,
  billingCycle,
  currentTier,
  isLoading,
  onSelect,
}: PlanCardProps) {
  const price = billingCycle === 'MONTHLY' ? plan.monthly_price : plan.yearly_price
  const pricePerMonth = billingCycle === 'YEARLY' ? Math.round(plan.yearly_price / 12) : plan.monthly_price
  const discount = getYearlyDiscount(plan.monthly_price, plan.yearly_price)

  const isCurrentPlan = plan.tier === currentTier
  const canUpgrade = isUpgrade(currentTier, plan.tier)
  const canDowngrade = isDowngrade(currentTier, plan.tier)

  // 取得方案名稱（使用中文）
  const planName = plan.name
  const planDescription = plan.description

  // 取得功能列表
  const featureList = PLAN_FEATURES[plan.tier] || []

  return (
    <Card
      className={`relative flex flex-col ${
        plan.is_popular ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''
      } ${isCurrentPlan ? 'bg-muted/30' : ''}`}
    >
      {/* 熱門標籤 */}
      {plan.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
            最受歡迎
          </span>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{planName}</CardTitle>
        {planDescription && (
          <CardDescription className="min-h-[40px]">{planDescription}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        {/* 價格 */}
        <div className="text-center mb-6">
          {plan.tier === 'FREE' ? (
            <div className="text-4xl font-bold">免費</div>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-sm text-muted-foreground">NT$</span>
                <span className="text-4xl font-bold">{pricePerMonth.toLocaleString('zh-TW')}</span>
                <span className="text-sm text-muted-foreground">/月</span>
              </div>
              {billingCycle === 'YEARLY' && discount > 0 && (
                <div className="text-sm text-green-600 mt-1">
                  省 {discount}%
                </div>
              )}
              {billingCycle === 'YEARLY' && (
                <div className="text-xs text-muted-foreground mt-1">
                  年繳 NT${price.toLocaleString('zh-TW')}
                </div>
              )}
            </>
          )}
        </div>

        {/* 功能列表 */}
        <ul className="space-y-3">
          {featureList.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          className="w-full"
          variant={isCurrentPlan ? 'outline' : canUpgrade ? 'default' : 'secondary'}
          disabled={isCurrentPlan || isLoading}
          onClick={() => onSelect(plan.tier)}
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : isCurrentPlan ? (
            '目前方案'
          ) : canUpgrade ? (
            '升級方案'
          ) : canDowngrade ? (
            '降級方案'
          ) : (
            '選擇方案'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

// ============================================
// 功能比較表
// ============================================

interface FeatureComparisonTableProps {
  plans: SubscriptionPlan[]
}

function FeatureComparisonTable({ plans }: FeatureComparisonTableProps) {
  const features = [
    { key: 'max_products', label: '產品數量上限' },
    { key: 'max_customers', label: '客戶數量上限' },
    { key: 'max_quotations_per_month', label: '每月報價單上限' },
    { key: 'max_companies', label: '公司數量上限' },
    { key: 'vat_filing', label: '營業稅計算' },
    { key: 'media_401', label: '401 媒體檔匯出' },
    { key: 'income_tax_filing', label: '營所稅申報' },
    { key: 'ai_cash_flow', label: 'AI 現金流分析' },
    { key: 'ai_receivable_risk', label: 'AI 應收風險分析' },
    { key: 'ai_tax_optimization', label: 'AI 稅務優化建議' },
    { key: 'api_access', label: 'API 存取' },
  ]

  // 功能對應到方案層級
  const featureAvailability: Record<string, Record<SubscriptionTier, string | boolean>> = {
    max_products: { FREE: '50', STARTER: '200', STANDARD: '無限制', PROFESSIONAL: '無限制' },
    max_customers: { FREE: '20', STARTER: '100', STANDARD: '無限制', PROFESSIONAL: '無限制' },
    max_quotations_per_month: { FREE: '10', STARTER: '50', STANDARD: '無限制', PROFESSIONAL: '無限制' },
    max_companies: { FREE: '1', STARTER: '1', STANDARD: '3', PROFESSIONAL: '10' },
    vat_filing: { FREE: false, STARTER: true, STANDARD: true, PROFESSIONAL: true },
    media_401: { FREE: false, STARTER: false, STANDARD: true, PROFESSIONAL: true },
    income_tax_filing: { FREE: false, STARTER: false, STANDARD: true, PROFESSIONAL: true },
    ai_cash_flow: { FREE: false, STARTER: false, STANDARD: false, PROFESSIONAL: true },
    ai_receivable_risk: { FREE: false, STARTER: false, STANDARD: false, PROFESSIONAL: true },
    ai_tax_optimization: { FREE: false, STARTER: false, STANDARD: false, PROFESSIONAL: true },
    api_access: { FREE: false, STARTER: false, STANDARD: false, PROFESSIONAL: true },
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-4 px-4 text-left font-medium">功能</th>
            {plans.map((plan) => (
              <th key={plan.id} className="py-4 px-4 text-center font-medium min-w-[120px]">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.key} className="border-b hover:bg-muted/50">
              <td className="py-3 px-4 text-sm">{feature.label}</td>
              {plans.map((plan) => {
                const value = featureAvailability[feature.key]?.[plan.tier]
                return (
                  <td key={`${plan.id}-${feature.key}`} className="py-3 px-4 text-center">
                    {typeof value === 'boolean' ? (
                      value ? (
                        <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <XIcon className="w-5 h-5 text-gray-300 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm font-medium">{value}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================
// FAQ 區域
// ============================================

function FaqSection() {
  const faqs = [
    {
      question: '我可以隨時升級或降級嗎？',
      answer: '是的，您可以隨時升級至更高的方案，升級立即生效。降級則會在當前計費週期結束後生效。',
    },
    {
      question: '年繳方案可以退款嗎？',
      answer: '年繳方案在購買後 14 天內可申請全額退款。超過 14 天則按比例計算退款金額。',
    },
    {
      question: 'AI 分析功能有使用限制嗎？',
      answer: 'AI 分析功能每月有使用次數限制。現金流分析每月 20 次，應收風險分析每月 10 次，稅務優化每月 5 次。',
    },
    {
      question: '如何取消訂閱？',
      answer: '您可以在設定頁面隨時取消訂閱。取消後，您的帳戶將在當前計費週期結束後降級為免費版。',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {faqs.map((faq, index) => (
        <div key={index} className="border rounded-lg p-6">
          <h3 className="font-semibold mb-2">{faq.question}</h3>
          <p className="text-muted-foreground text-sm">{faq.answer}</p>
        </div>
      ))}
    </div>
  )
}

// ============================================
// 圖示元件
// ============================================

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  )
}
