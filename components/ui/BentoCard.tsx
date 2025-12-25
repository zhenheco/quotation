'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * BentoCard 元件
 * 用於 Dashboard 和其他頁面的 Bento Grid 佈局
 * 支援多種尺寸和顏色變體
 */

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 卡片尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'hero'
  /** 卡片背景色 */
  color?: 'green' | 'blue' | 'yellow' | 'pink' | 'purple' | 'neutral'
  /** 是否可點擊 */
  interactive?: boolean
}

// 尺寸對應的 Grid 類別
const sizeClasses = {
  sm: 'col-span-1 row-span-1',
  md: 'col-span-1 row-span-1',
  lg: 'col-span-1 md:col-span-2 row-span-1',
  hero: 'col-span-1 md:col-span-2 row-span-1 md:row-span-2',
}

// 顏色對應的漸層背景
const colorClasses = {
  green: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100',
  blue: 'bg-gradient-to-br from-sky-50 to-blue-50 border-sky-100',
  yellow: 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100',
  pink: 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-100',
  purple: 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100',
  neutral: 'bg-white border-slate-100',
}

const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  ({ className, size = 'md', color = 'neutral', interactive = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // 基礎樣式
          'rounded-3xl border p-6 transition-all duration-300',
          // 尺寸
          sizeClasses[size],
          // 顏色
          colorClasses[color],
          // 互動效果
          interactive && 'cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]',
          // 預設陰影
          'shadow-sm',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
BentoCard.displayName = 'BentoCard'

/**
 * BentoCardHeader - 卡片標題區域
 */
interface BentoCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 標題 */
  title?: string
  /** 副標題 */
  subtitle?: string
  /** 右側內容（如 icon 或 badge） */
  action?: React.ReactNode
}

const BentoCardHeader = React.forwardRef<HTMLDivElement, BentoCardHeaderProps>(
  ({ className, title, subtitle, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-start justify-between mb-4', className)}
        {...props}
      >
        <div>
          {title && (
            <h3 className="text-sm font-medium text-slate-500">{title}</h3>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
          {children}
        </div>
        {action && <div>{action}</div>}
      </div>
    )
  }
)
BentoCardHeader.displayName = 'BentoCardHeader'

/**
 * BentoCardValue - 大數值顯示
 */
interface BentoCardValueProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 數值 */
  value: string | number
  /** 趨勢 (正數/負數) */
  trend?: number
  /** 趨勢標籤 */
  trendLabel?: string
}

const BentoCardValue = React.forwardRef<HTMLDivElement, BentoCardValueProps>(
  ({ className, value, trend, trendLabel, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('', className)} {...props}>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            <span
              className={cn(
                'text-sm font-medium',
                trend >= 0 ? 'text-emerald-600' : 'text-red-500'
              )}
            >
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
            {trendLabel && (
              <span className="text-xs text-slate-400">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    )
  }
)
BentoCardValue.displayName = 'BentoCardValue'

/**
 * BentoCardContent - 卡片內容區域
 */
const BentoCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))
BentoCardContent.displayName = 'BentoCardContent'

/**
 * BentoCardFooter - 卡片底部區域
 */
const BentoCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4 mt-auto', className)}
    {...props}
  />
))
BentoCardFooter.displayName = 'BentoCardFooter'

export {
  BentoCard,
  BentoCardHeader,
  BentoCardValue,
  BentoCardContent,
  BentoCardFooter,
}
