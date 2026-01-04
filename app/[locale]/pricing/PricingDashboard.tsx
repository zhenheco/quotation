'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
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
// formatAmount not needed - using toLocaleString directly
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

// 功能列表定義
const PLAN_FEATURES: Record<SubscriptionTier, string[]> = {
  FREE: [
    'products_limit_50',
    'customers_limit_20',
    'quotations_per_month_10',
    'basic_reporting',
  ],
  STARTER: [
    'products_limit_200',
    'customers_limit_100',
    'quotations_per_month_50',
    'vat_calculation',
    'email_support',
  ],
  STANDARD: [
    'products_limit_unlimited',
    'customers_limit_unlimited',
    'quotations_per_month_unlimited',
    'media_401_export',
    'income_tax_filing',
    'companies_limit_3',
    'priority_support',
  ],
  PROFESSIONAL: [
    'all_standard_features',
    'ai_cash_flow',
    'ai_receivable_risk',
    'ai_tax_optimization',
    'api_access',
    'companies_limit_10',
    'dedicated_support',
  ],
}

/**
 * 定價頁面儀表板
 */
export default function PricingDashboard() {
  const t = useTranslations()
  const locale = useLocale()
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
      window.location.href = `/${locale}/login?redirect=/${locale}/pricing`
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
      window.location.href = `/${locale}/settings/subscription`
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
        <h1 className="text-4xl font-bold mb-4">{t('subscription.title')}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('subscription.description', { defaultValue: '選擇適合您業務需求的方案' })}
        </p>
      </div>

      {/* 計費週期切換 */}
      <div className="flex justify-center items-center gap-4 mb-12">
        <span
          className={`text-sm font-medium ${billingCycle === 'MONTHLY' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {t('subscription.monthly')}
        </span>
        <Switch
          checked={billingCycle === 'YEARLY'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'YEARLY' : 'MONTHLY')}
        />
        <span
          className={`text-sm font-medium ${billingCycle === 'YEARLY' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {t('subscription.yearly')}
        </span>
        {billingCycle === 'YEARLY' && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {t('subscription.yearlyDiscount', { percent: 17 })}
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
            locale={locale}
            t={t}
          />
        ))}
      </div>

      {/* 功能比較表 */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          {t('subscription.featureComparison', { defaultValue: '功能比較' })}
        </h2>
        <FeatureComparisonTable plans={sortedPlans} locale={locale} t={t} />
      </div>

      {/* FAQ 區域 */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          {t('subscription.faq', { defaultValue: '常見問題' })}
        </h2>
        <FaqSection t={t} />
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
  locale: string
  t: ReturnType<typeof useTranslations>
}

function PlanCard({
  plan,
  billingCycle,
  currentTier,
  isLoading,
  onSelect,
  locale,
  t,
}: PlanCardProps) {
  const price = billingCycle === 'MONTHLY' ? plan.monthly_price : plan.yearly_price
  const pricePerMonth = billingCycle === 'YEARLY' ? Math.round(plan.yearly_price / 12) : plan.monthly_price
  const discount = getYearlyDiscount(plan.monthly_price, plan.yearly_price)

  const isCurrentPlan = plan.tier === currentTier
  const canUpgrade = isUpgrade(currentTier, plan.tier)
  const canDowngrade = isDowngrade(currentTier, plan.tier)

  // 取得方案名稱
  const planName = locale === 'zh' ? plan.name : plan.name_en
  const planDescription = locale === 'zh' ? plan.description : plan.description_en

  // 取得功能列表
  const featureKeys = PLAN_FEATURES[plan.tier] || []

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
            {t('subscription.popular', { defaultValue: '最受歡迎' })}
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
            <div className="text-4xl font-bold">{t('subscription.free')}</div>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-sm text-muted-foreground">NT$</span>
                <span className="text-4xl font-bold">{pricePerMonth.toLocaleString('zh-TW')}</span>
                <span className="text-sm text-muted-foreground">{t('subscription.perMonth')}</span>
              </div>
              {billingCycle === 'YEARLY' && discount > 0 && (
                <div className="text-sm text-green-600 mt-1">
                  {t('subscription.yearlyDiscount', { percent: discount })}
                </div>
              )}
              {billingCycle === 'YEARLY' && (
                <div className="text-xs text-muted-foreground mt-1">
                  {t('subscription.billedAnnually', { defaultValue: '年繳' })} NT${price.toLocaleString('zh-TW')}
                </div>
              )}
            </>
          )}
        </div>

        {/* 功能列表 */}
        <ul className="space-y-3">
          {featureKeys.map((featureKey) => (
            <li key={featureKey} className="flex items-start gap-2 text-sm">
              <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>{t(`subscription.featureList.${featureKey}`, { defaultValue: featureKey })}</span>
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
            t('subscription.currentPlan')
          ) : canUpgrade ? (
            t('subscription.upgradePlan')
          ) : canDowngrade ? (
            t('subscription.downgradePlan')
          ) : (
            t('subscription.selectPlan', { defaultValue: '選擇方案' })
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
  locale: string
  t: ReturnType<typeof useTranslations>
}

function FeatureComparisonTable({ plans, locale, t }: FeatureComparisonTableProps) {
  const features = [
    { key: 'max_products', label: t('subscription.featureCodes.products_limit') },
    { key: 'max_customers', label: t('subscription.featureCodes.customers_limit') },
    { key: 'max_quotations_per_month', label: t('subscription.featureCodes.quotations_per_month') },
    { key: 'max_companies', label: t('subscription.featureCodes.companies_limit') },
    { key: 'vat_filing', label: t('subscription.featureCodes.vat_filing') },
    { key: 'media_401', label: t('subscription.featureCodes.media_401') },
    { key: 'income_tax_filing', label: t('subscription.featureCodes.income_tax_filing') },
    { key: 'ai_cash_flow', label: t('subscription.featureCodes.ai_cash_flow') },
    { key: 'ai_receivable_risk', label: t('subscription.featureCodes.ai_receivable_risk') },
    { key: 'ai_tax_optimization', label: t('subscription.featureCodes.ai_tax_optimization') },
    { key: 'api_access', label: t('subscription.featureCodes.api_access') },
  ]

  // 功能對應到方案層級
  const featureAvailability: Record<string, Record<SubscriptionTier, string | boolean>> = {
    max_products: { FREE: '50', STARTER: '200', STANDARD: t('subscription.unlimited'), PROFESSIONAL: t('subscription.unlimited') },
    max_customers: { FREE: '20', STARTER: '100', STANDARD: t('subscription.unlimited'), PROFESSIONAL: t('subscription.unlimited') },
    max_quotations_per_month: { FREE: '10', STARTER: '50', STANDARD: t('subscription.unlimited'), PROFESSIONAL: t('subscription.unlimited') },
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
            <th className="py-4 px-4 text-left font-medium">{t('subscription.features')}</th>
            {plans.map((plan) => (
              <th key={plan.id} className="py-4 px-4 text-center font-medium min-w-[120px]">
                {locale === 'zh' ? plan.name : plan.name_en}
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

interface FaqSectionProps {
  t: ReturnType<typeof useTranslations>
}

function FaqSection({ t }: FaqSectionProps) {
  const faqs = [
    {
      question: t('subscription.faq.q1', { defaultValue: '我可以隨時升級或降級嗎？' }),
      answer: t('subscription.faq.a1', {
        defaultValue: '是的，您可以隨時升級至更高的方案，升級立即生效。降級則會在當前計費週期結束後生效。',
      }),
    },
    {
      question: t('subscription.faq.q2', { defaultValue: '年繳方案可以退款嗎？' }),
      answer: t('subscription.faq.a2', {
        defaultValue: '年繳方案在購買後 14 天內可申請全額退款。超過 14 天則按比例計算退款金額。',
      }),
    },
    {
      question: t('subscription.faq.q3', { defaultValue: 'AI 分析功能有使用限制嗎？' }),
      answer: t('subscription.faq.a3', {
        defaultValue: 'AI 分析功能每月有使用次數限制。現金流分析每月 20 次，應收風險分析每月 10 次，稅務優化每月 5 次。',
      }),
    },
    {
      question: t('subscription.faq.q4', { defaultValue: '如何取消訂閱？' }),
      answer: t('subscription.faq.a4', {
        defaultValue: '您可以在設定頁面隨時取消訂閱。取消後，您的帳戶將在當前計費週期結束後降級為免費版。',
      }),
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
