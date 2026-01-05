'use client'

import Link from 'next/link'
import { useFullDashboardData } from '@/hooks/useAnalytics'
import { usePaymentStatistics, usePaymentReminders } from '@/hooks/usePayments'
import { useOverdueContracts } from '@/hooks/useContracts'
import DashboardCharts from '@/components/DashboardCharts'
import LoadingSpinner from '@/components/LoadingSpinner'
import { safeToLocaleString } from '@/lib/utils/formatters'
import { BentoCard, BentoCardHeader, BentoCardValue } from '@/components/ui/BentoCard'
import {
  Plus,
  FileText,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Wallet,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 快速操作卡片 - 圖標 + 文字
 */
interface QuickActionCardProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}

function QuickActionCard({ href, icon, title, description }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 transition-all duration-200 hover:shadow-lg hover:scale-[1.01] hover:border-emerald-200"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-slate-800 group-hover:text-emerald-700 transition-colors">{title}</h3>
        <p className="text-sm text-slate-500 mt-0.5 truncate">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
    </Link>
  )
}

/**
 * 警告卡片 - 更現代的設計
 */
interface AlertCardProps {
  title: string
  items: Array<{
    id: string
    name: string
    date?: string
    amount?: number
    days?: number
    daysLabel?: string
  }>
  type: 'warning' | 'error'
  onViewAll?: () => void
  viewAllLabel?: string
  locale?: string
}

function AlertCard({ title, items, type, onViewAll, viewAllLabel, locale = 'zh' }: AlertCardProps) {
  if (!items || items.length === 0) return null

  const config = {
    warning: {
      bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
      border: 'border-amber-100',
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      badge: 'bg-amber-100 text-amber-700',
    },
    error: {
      bg: 'bg-gradient-to-br from-red-50 to-rose-50',
      border: 'border-red-100',
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      badge: 'bg-red-100 text-red-700',
    },
  }

  const { bg, border, icon, badge } = config[type]

  return (
    <div className={cn('rounded-2xl border p-5', bg, border)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', badge)}>
            {items.length}
          </span>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {viewAllLabel}
          </button>
        )}
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {items.slice(0, 4).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-white/60 rounded-xl"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-700 truncate">{item.name}</p>
              {item.date && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(item.date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US')}
                </p>
              )}
            </div>
            <div className="text-right ml-3">
              {item.daysLabel && (
                <span className="text-xs font-medium text-slate-500">{item.daysLabel}</span>
              )}
              {item.amount !== undefined && (
                <p className="text-sm font-semibold text-slate-700">
                  {safeToLocaleString(item.amount)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 迷你統計卡片 - 用於側邊堆疊
 */
interface MiniStatProps {
  label: string
  value: string | number
  trend?: number
  trendLabel?: string
  color?: 'green' | 'blue' | 'purple' | 'yellow'
}

function MiniStat({ label, value, trend, trendLabel, color = 'green' }: MiniStatProps) {
  const colorMap = {
    green: 'from-emerald-50 to-teal-50 border-emerald-100',
    blue: 'from-sky-50 to-blue-50 border-sky-100',
    purple: 'from-violet-50 to-purple-50 border-violet-100',
    yellow: 'from-amber-50 to-yellow-50 border-amber-100',
  }

  return (
    <div className={cn('rounded-2xl border p-5 bg-gradient-to-br', colorMap[color])}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {trend >= 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={cn('text-sm font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {Math.abs(trend)}%
          </span>
          {trendLabel && <span className="text-xs text-slate-400">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}

export default function DashboardClient() {
  // 取得所有儀表板數據
  const dashboardData = useFullDashboardData(6)
  const { data: paymentStats } = usePaymentStatistics()
  const { data: paymentReminders } = usePaymentReminders()
  const { data: overdueContracts } = useOverdueContracts()

  // 取得預設貨幣
  const defaultCurrency = paymentStats?.current_month?.currency || 'TWD'

  // 格式化貨幣
  const formatCurrency = (amount: number | undefined | null) => {
    return `${defaultCurrency} ${safeToLocaleString(amount)}`
  }

  // 取得問候語
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '早安'
    if (hour < 18) return '午安'
    return '晚安'
  }

  if (dashboardData.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    )
  }

  if (dashboardData.hasError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-red-600 text-lg font-semibold">載入資料時發生錯誤</p>
          <button
            onClick={() => dashboardData.refetchAll()}
            className="mt-4 px-6 py-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-colors font-medium"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  const { summary, stats, revenueTrend, currencyDistribution, statusStats } = dashboardData

  // 判斷是否有警告需要顯示
  const hasAlerts = (overdueContracts && overdueContracts.length > 0) ||
                    (paymentReminders && paymentReminders.length > 0)

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* ===== Hero Section: 歡迎區 + 側邊統計 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 歡迎卡片 - Hero (佔 2 列) */}
        <BentoCard size="hero" color="green" className="md:col-span-2 md:row-span-2">
          <div className="h-full flex flex-col justify-between">
            <div>
              <p className="text-emerald-700 font-medium">{getGreeting()}!</p>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
                歡迎回來
              </h1>
              <p className="text-slate-500 mt-2">
                {new Date().toLocaleDateString('zh-TW', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>

            {/* 快速建立按鈕 */}
            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href="/quotations/new"
                className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-2xl font-medium shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 hover:shadow-xl transition-all"
              >
                <Plus className="h-5 w-5" />
                新增報價單
              </Link>
              <Link
                href="/customers/new"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white text-slate-700 rounded-2xl font-medium border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <Users className="h-5 w-5" />
                新增客戶
              </Link>
            </div>
          </div>
        </BentoCard>

        {/* 側邊統計卡片堆疊 */}
        {summary && (
          <>
            <MiniStat
              label="本月營收"
              value={formatCurrency(summary.currentMonthRevenue)}
              trend={summary.revenueGrowth}
              trendLabel="較上月"
              color="blue"
            />
            <MiniStat
              label="待處理"
              value={summary.pendingCount}
              color="yellow"
            />
          </>
        )}
      </div>

      {/* ===== 警告區域 ===== */}
      {hasAlerts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AlertCard
            title="逾期合約"
            type="error"
            viewAllLabel="查看全部"
            items={
              overdueContracts?.map((contract) => ({
                id: contract.id,
                name: contract.customer?.company_name_zh || contract.customer?.company_name_en || '',
                date: contract.next_collection_date || '',
                amount: contract.next_collection_amount || 0,
              })) || []
            }
            onViewAll={() => (window.location.href = '/contracts?status=overdue')}
          />
          <AlertCard
            title="即將到期的付款"
            type="warning"
            viewAllLabel="查看全部"
            items={
              paymentReminders?.map((reminder) => ({
                id: reminder.contract_id,
                name: reminder.customer_name,
                date: reminder.next_collection_date,
                amount: reminder.next_collection_amount,
                days: reminder.days_until_due,
                daysLabel: reminder.days_until_due > 0
                  ? `${reminder.days_until_due} 天後`
                  : `逾期 ${Math.abs(reminder.days_until_due)} 天`,
              })) || []
            }
            onViewAll={() => (window.location.href = '/contracts')}
          />
        </div>
      )}

      {/* ===== 業務統計卡片 ===== */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BentoCard color="green">
            <BentoCardHeader title="進行中合約" />
            <BentoCardValue value={stats.contracts.active} />
            {stats.contracts.overdue > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                {stats.contracts.overdue} 筆逾期
              </p>
            )}
          </BentoCard>

          <BentoCard color="blue">
            <BentoCardHeader title="本月收款" />
            <BentoCardValue value={formatCurrency(stats.payments.current_month_collected)} />
          </BentoCard>

          <BentoCard color="yellow">
            <BentoCardHeader title="未收款總額" />
            <BentoCardValue value={formatCurrency(stats.payments.total_unpaid)} />
          </BentoCard>

          <BentoCard color="purple">
            <BentoCardHeader title="客戶總數" />
            <BentoCardValue value={stats.customers.total} />
            <p className="text-xs text-slate-500 mt-2">
              {stats.customers.active} 位活躍客戶
            </p>
          </BentoCard>
        </div>
      )}

      {/* ===== 圖表區域 ===== */}
      {revenueTrend && currencyDistribution && statusStats && summary && (
        <DashboardCharts
          revenueData={revenueTrend}
          currencyData={currencyDistribution}
          statusData={statusStats}
          summary={summary}
          defaultCurrency={defaultCurrency}
        />
      )}

      {/* ===== 快速操作網格 ===== */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">快速操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickActionCard
            href="/quotations/new"
            icon={<FileText className="h-6 w-6" />}
            title="新增報價單"
            description="建立新的報價單"
          />
          <QuickActionCard
            href="/customers/new"
            icon={<Users className="h-6 w-6" />}
            title="新增客戶"
            description="新增客戶資料"
          />
          <QuickActionCard
            href="/products/new"
            icon={<Package className="h-6 w-6" />}
            title="新增產品"
            description="新增產品或服務項目"
          />
          <QuickActionCard
            href="/contracts"
            icon={<FileText className="h-6 w-6" />}
            title="合約管理"
            description="管理所有合約"
          />
          <QuickActionCard
            href="/payments"
            icon={<Wallet className="h-6 w-6" />}
            title="收款紀錄"
            description="查看收款紀錄"
          />
          <QuickActionCard
            href="/quotations"
            icon={<FileText className="h-6 w-6" />}
            title="報價單列表"
            description="查看所有報價單"
          />
        </div>
      </div>
    </div>
  )
}
