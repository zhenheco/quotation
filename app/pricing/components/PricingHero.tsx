'use client'

import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import type { BillingCycle } from '@/hooks/use-subscription'

interface PricingHeroProps {
  billingCycle: BillingCycle
  onBillingCycleChange: (cycle: BillingCycle) => void
}

/**
 * 定價頁面 Hero Section
 * 包含標題、副標題和計費週期切換
 */
export function PricingHero({ billingCycle, onBillingCycleChange }: PricingHeroProps) {
  const isYearly = billingCycle === 'YEARLY'

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-accent/20 pb-16 pt-12">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-1/4 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 text-center">
        {/* 頂部 Badge */}
        <div className="mb-6 animate-fade-in-up">
          <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium">
            所有付費方案享 14 天免費試用
          </Badge>
        </div>

        {/* 主標題 */}
        <h1 className="mb-4 animate-fade-in-up text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          選擇適合您業務規模的方案
        </h1>

        {/* 副標題 */}
        <p className="mx-auto mb-10 max-w-2xl animate-fade-in-up text-lg text-muted-foreground sm:text-xl">
          從免費開始，隨業務成長升級。所有方案皆可隨時調整，無長期合約綁定。
        </p>

        {/* 計費週期切換 */}
        <div className="inline-flex animate-fade-in-up items-center gap-4 rounded-full bg-card px-6 py-3 shadow-sm ring-1 ring-border">
          <span
            className={`text-sm font-medium transition-colors ${
              !isYearly ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            月繳
          </span>

          <Switch
            checked={isYearly}
            onCheckedChange={(checked) => onBillingCycleChange(checked ? 'YEARLY' : 'MONTHLY')}
            className="data-[state=checked]:bg-primary"
          />

          <span
            className={`text-sm font-medium transition-colors ${
              isYearly ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            年繳
          </span>

          {isYearly && (
            <Badge variant="success" className="ml-1 animate-scale-in">
              省 17%
            </Badge>
          )}
        </div>

        {/* 額外說明 */}
        <p className="mt-4 animate-fade-in-up text-sm text-muted-foreground">
          年繳方案可享有約 2 個月免費使用
        </p>
      </div>
    </section>
  )
}
