'use client'

import { Check, Sparkles, Crown, Zap, Building2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type {
  SubscriptionPlan,
  SubscriptionTier,
  BillingCycle,
} from '@/hooks/use-subscription'
import { isUpgrade, isDowngrade, getYearlyDiscount } from '@/hooks/use-subscription'
import { PLAN_FEATURES, PLAN_DESCRIPTIONS } from '../constants/pricing-features'
import { cn } from '@/lib/utils'

interface PricingCardProps {
  plan: SubscriptionPlan
  billingCycle: BillingCycle
  currentTier: SubscriptionTier | null
  isLoading: boolean
  onSelect: (tier: SubscriptionTier) => void
}

// 方案圖示對應
const TIER_ICONS: Record<SubscriptionTier, React.ElementType> = {
  FREE: Building2,
  STARTER: Zap,
  STANDARD: Crown,
  PROFESSIONAL: Sparkles,
}

// 方案顏色對應
const TIER_COLORS: Record<SubscriptionTier, string> = {
  FREE: 'text-slate-500',
  STARTER: 'text-blue-500',
  STANDARD: 'text-primary',
  PROFESSIONAL: 'text-amber-500',
}

/**
 * 取得按鈕變體樣式
 */
function getButtonVariant(
  isCurrentPlan: boolean,
  canUpgrade: boolean
): 'outline' | 'default' | 'secondary' {
  if (isCurrentPlan) return 'outline'
  if (canUpgrade) return 'default'
  return 'secondary'
}

/**
 * 渲染按鈕內容
 */
function renderButtonContent(
  isLoading: boolean,
  isCurrentPlan: boolean,
  canUpgrade: boolean,
  canDowngrade: boolean,
  isFreePlan: boolean
): React.ReactNode {
  if (isLoading) {
    return <LoadingSpinner size="sm" />
  }
  if (isCurrentPlan) {
    return '目前方案'
  }
  if (isFreePlan) {
    return '預設方案'
  }
  if (canUpgrade) {
    return (
      <>
        <Zap className="mr-2 h-4 w-4" />
        升級方案
      </>
    )
  }
  if (canDowngrade) {
    return '降級方案'
  }
  return '選擇方案'
}

/**
 * 定價方案卡片元件
 */
export function PricingCard({
  plan,
  billingCycle,
  currentTier,
  isLoading,
  onSelect,
}: PricingCardProps) {
  const price = billingCycle === 'MONTHLY' ? plan.monthly_price : plan.yearly_price
  const pricePerMonth =
    billingCycle === 'YEARLY' ? Math.round(plan.yearly_price / 12) : plan.monthly_price
  const discount = getYearlyDiscount(plan.monthly_price, plan.yearly_price)

  const isCurrentPlan = currentTier === plan.tier
  // 免費版不能「升級」到，只能從付費版「降級」到
  const isFreeplan = plan.tier === 'FREE'
  const canUpgrade = currentTier ? isUpgrade(currentTier, plan.tier) : !isFreeplan
  const canDowngrade = currentTier ? isDowngrade(currentTier, plan.tier) : false
  const isPopular = plan.is_popular

  const TierIcon = TIER_ICONS[plan.tier]
  const tierColor = TIER_COLORS[plan.tier]
  const featureList = PLAN_FEATURES[plan.tier] || []
  const description = PLAN_DESCRIPTIONS[plan.tier]

  return (
    <Card
      className={cn(
        'relative flex h-full cursor-pointer flex-col transition-all duration-300',
        'hover:shadow-xl hover:scale-[1.02]',
        'animate-fade-in-up', // 入場動畫
        isPopular && [
          'ring-2 ring-primary/40 shadow-lg',
          'lg:scale-[1.03] lg:hover:scale-[1.05]',
        ],
        isCurrentPlan && 'bg-accent/30 ring-2 ring-accent'
      )}
    >
      {/* 熱門標籤 */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <Badge className="bg-primary px-4 py-1 text-primary-foreground shadow-md">
            <Crown className="mr-1.5 h-3.5 w-3.5" />
            最受歡迎
          </Badge>
        </div>
      )}

      {/* 當前方案標籤 */}
      {isCurrentPlan && !isPopular && (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <Badge variant="secondary" className="px-4 py-1 shadow-md">
            目前方案
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4 pt-8 text-center">
        {/* 方案圖示 */}
        <div
          className={cn(
            'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
            'bg-gradient-to-br from-slate-50 to-slate-100',
            'shadow-sm ring-1 ring-slate-200/50'
          )}
        >
          <TierIcon className={cn('h-7 w-7', tierColor)} />
        </div>

        {/* 方案名稱 */}
        <h3 className="text-xl font-bold text-foreground">{description.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description.subtitle}</p>
      </CardHeader>

      <CardContent className="flex-1 px-6">
        {/* 價格顯示 */}
        <div className="mb-6 text-center">
          {plan.tier === 'FREE' ? (
            <div className="flex items-baseline justify-center">
              <span className="text-5xl font-bold text-foreground">免費</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-sm font-medium text-muted-foreground">NT$</span>
                <span className="text-5xl font-bold text-foreground">
                  {pricePerMonth.toLocaleString('zh-TW')}
                </span>
                <span className="text-sm text-muted-foreground">/月</span>
              </div>

              {/* 年繳折扣 */}
              {billingCycle === 'YEARLY' && discount > 0 && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    NT${plan.monthly_price.toLocaleString('zh-TW')}/月
                  </span>
                  <Badge variant="success" className="text-xs">
                    省 {discount}%
                  </Badge>
                </div>
              )}

              {/* 年繳總額 */}
              {billingCycle === 'YEARLY' && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  年繳 NT${price.toLocaleString('zh-TW')}
                </p>
              )}
            </>
          )}
        </div>

        {/* 功能列表 */}
        <ul className="space-y-3">
          {featureList.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
                <Check className="h-3.5 w-3.5 text-success" />
              </div>
              <span className="text-sm text-slate-600">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="px-6 pb-6 pt-4">
        <Button
          className={cn(
            'w-full transition-all',
            isPopular && !isCurrentPlan && 'shadow-md'
          )}
          variant={getButtonVariant(isCurrentPlan, canUpgrade)}
          size="lg"
          disabled={isCurrentPlan || isLoading || isFreeplan}
          onClick={() => onSelect(plan.tier)}
        >
          {renderButtonContent(isLoading, isCurrentPlan, canUpgrade, canDowngrade, isFreeplan)}
        </Button>
      </CardFooter>
    </Card>
  )
}

/**
 * 定價卡片網格容器
 */
interface PricingCardsGridProps {
  plans: SubscriptionPlan[]
  billingCycle: BillingCycle
  currentTier: SubscriptionTier | null
  isLoading: boolean
  onSelect: (tier: SubscriptionTier) => void
}

export function PricingCardsGrid({
  plans,
  billingCycle,
  currentTier,
  isLoading,
  onSelect,
}: PricingCardsGridProps) {
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid gap-6 stagger-children md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            currentTier={currentTier}
            isLoading={isLoading}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}
