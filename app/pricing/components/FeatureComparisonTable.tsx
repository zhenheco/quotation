'use client'

import { useState } from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SubscriptionTier } from '@/hooks/use-subscription'
import { FEATURE_GROUPS, PLAN_DESCRIPTIONS } from '../constants/pricing-features'
import { cn } from '@/lib/utils'

interface FeatureComparisonTableProps {
  currentTier?: SubscriptionTier | null
}

/**
 * 功能比較表元件
 * 支援展開/收合功能分組
 */
export function FeatureComparisonTable({ currentTier }: FeatureComparisonTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(FEATURE_GROUPS.map((g) => g.id))
  )
  const [showAll, setShowAll] = useState(true)

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (showAll) {
      setExpandedGroups(new Set())
    } else {
      setExpandedGroups(new Set(FEATURE_GROUPS.map((g) => g.id)))
    }
    setShowAll(!showAll)
  }

  // 排序方案
  const sortedTiers: SubscriptionTier[] = ['FREE', 'STARTER', 'STANDARD', 'PROFESSIONAL']

  return (
    <section className="container mx-auto px-4 py-12">
      {/* 標題區域 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">功能比較</h2>
          <p className="mt-2 text-muted-foreground">
            詳細比較各方案功能差異
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {showAll ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              收合全部
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              展開全部
            </>
          )}
        </Button>
      </div>

      {/* 桌面版表格 */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:block">
        {/* 表頭 */}
        <div className="sticky top-0 z-10 grid grid-cols-5 border-b border-border bg-slate-50/80 backdrop-blur-sm">
          <div className="px-6 py-4">
            <span className="text-sm font-medium text-muted-foreground">功能</span>
          </div>
          {sortedTiers.map((tier) => (
            <div
              key={tier}
              className={cn(
                'px-4 py-4 text-center',
                currentTier === tier && 'bg-accent/50'
              )}
            >
              <span className="text-sm font-semibold text-foreground">
                {PLAN_DESCRIPTIONS[tier].title}
              </span>
            </div>
          ))}
        </div>

        {/* 功能分組 */}
        {FEATURE_GROUPS.map((group) => {
          const isExpanded = expandedGroups.has(group.id)

          return (
            <div key={group.id} className="border-b border-border last:border-b-0">
              {/* 分組標題 */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between bg-slate-50/50 px-6 py-3 text-left transition-colors hover:bg-slate-100/50"
              >
                <span className="text-sm font-semibold text-foreground">{group.name}</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* 功能列表 */}
              {isExpanded && (
                <div>
                  {group.features.map((feature, index) => (
                    <div
                      key={feature.key}
                      className={cn(
                        'grid grid-cols-5 transition-colors hover:bg-slate-50/50',
                        index !== group.features.length - 1 && 'border-b border-border/50'
                      )}
                    >
                      {/* 功能名稱 */}
                      <div className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {feature.label}
                        </div>
                        {feature.description && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {feature.description}
                          </div>
                        )}
                      </div>

                      {/* 各方案值 */}
                      {sortedTiers.map((tier) => {
                        const value = feature.availability[tier]
                        return (
                          <div
                            key={tier}
                            className={cn(
                              'flex items-center justify-center px-4 py-4',
                              currentTier === tier && 'bg-accent/30'
                            )}
                          >
                            {typeof value === 'boolean' ? (
                              value ? (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10">
                                  <Check className="h-4 w-4 text-success" />
                                </div>
                              ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                                  <X className="h-4 w-4 text-slate-300" />
                                </div>
                              )
                            ) : (
                              <span
                                className={cn(
                                  'text-sm font-medium',
                                  value === '無限制'
                                    ? 'text-primary'
                                    : 'text-foreground'
                                )}
                              >
                                {value}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 手機版卡片式顯示 */}
      <div className="space-y-4 lg:hidden">
        {FEATURE_GROUPS.map((group) => {
          const isExpanded = expandedGroups.has(group.id)

          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              {/* 分組標題 */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between bg-slate-50 px-4 py-3"
              >
                <span className="text-sm font-semibold text-foreground">{group.name}</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* 功能列表 */}
              {isExpanded && (
                <div className="divide-y divide-border/50">
                  {group.features.map((feature) => (
                    <div key={feature.key} className="p-4">
                      <div className="mb-3">
                        <div className="text-sm font-medium text-foreground">
                          {feature.label}
                        </div>
                        {feature.description && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {feature.description}
                          </div>
                        )}
                      </div>

                      {/* 方案格線 */}
                      <div className="grid grid-cols-4 gap-2">
                        {sortedTiers.map((tier) => {
                          const value = feature.availability[tier]
                          return (
                            <div
                              key={tier}
                              className={cn(
                                'rounded-lg bg-slate-50 px-2 py-2 text-center',
                                currentTier === tier && 'bg-accent ring-1 ring-primary/30'
                              )}
                            >
                              <div className="mb-1 text-[10px] font-medium text-muted-foreground">
                                {PLAN_DESCRIPTIONS[tier].title.replace('版', '')}
                              </div>
                              {typeof value === 'boolean' ? (
                                value ? (
                                  <Check className="mx-auto h-4 w-4 text-success" />
                                ) : (
                                  <X className="mx-auto h-4 w-4 text-slate-300" />
                                )
                              ) : (
                                <span
                                  className={cn(
                                    'text-xs font-medium',
                                    value === '無限制' ? 'text-primary' : 'text-foreground'
                                  )}
                                >
                                  {value}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
