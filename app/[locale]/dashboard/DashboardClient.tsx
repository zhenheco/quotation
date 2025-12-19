'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useFullDashboardData } from '@/hooks/useAnalytics'
import { usePaymentStatistics, usePaymentReminders } from '@/hooks/usePayments'
import { useOverdueContracts } from '@/hooks/useContracts'
import DashboardCharts from '@/components/DashboardCharts'
import LoadingSpinner from '@/components/LoadingSpinner'
import QuickCreateButton from '@/components/QuickCreateButton'
import { safeToLocaleString } from '@/lib/utils/formatters'

interface StatCardProps {
  title: string
  value: number | string
  icon: string
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'orange'
}

function StatCard({ title, value, icon, trend, subtitle, color = 'blue', trendLabel }: StatCardProps & { trendLabel?: string }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
      {trend && (
        <div className="mt-4">
          <span
            className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-sm text-gray-500 ml-2">{trendLabel}</span>
        </div>
      )}
      {subtitle && <div className="mt-4 text-sm text-gray-500">{subtitle}</div>}
    </div>
  )
}

interface QuickActionCardProps {
  href: string
  icon: string
  title: string
  description: string
}

function QuickActionCard({ href, icon, title, description }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  )
}

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
  type: 'warning' | 'info' | 'error'
  onViewAll?: () => void
  viewAllLabel?: string
  amountLabel?: string
  locale?: string
}

function AlertCard({ title, items, type, onViewAll, viewAllLabel, amountLabel, locale = 'zh' }: AlertCardProps) {
  const typeClasses = {
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
    error: 'bg-red-50 border-red-200',
  }

  const iconClasses = {
    warning: '⚠️',
    info: 'ℹ️',
    error: '❌',
  }

  if (!items || items.length === 0) return null

  return (
    <div className={`rounded-lg border p-4 ${typeClasses[type]}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span>{iconClasses[type]}</span>
          {title} ({items.length})
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {viewAllLabel}
          </button>
        )}
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="text-sm text-gray-700 bg-white bg-opacity-50 rounded p-2"
          >
            <div className="flex justify-between items-start">
              <span className="font-medium">{item.name}</span>
              {item.daysLabel && (
                <span className="text-xs text-gray-500">
                  {item.daysLabel}
                </span>
              )}
            </div>
            {item.date && (
              <div className="text-xs text-gray-500 mt-1">
                {new Date(item.date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US')}
              </div>
            )}
            {item.amount !== undefined && (
              <div className="text-xs text-gray-600 mt-1">
                {amountLabel}: {safeToLocaleString(item.amount)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardClient({ locale }: { locale: string }) {
  const t = useTranslations()

  // 取得所有儀表板數據
  const dashboardData = useFullDashboardData(6)
  const { data: paymentStats } = usePaymentStatistics()
  const { data: paymentReminders } = usePaymentReminders()
  const { data: overdueContracts } = useOverdueContracts()

  // 取得預設貨幣（從統計資料或預設為 TWD）
  const defaultCurrency = paymentStats?.current_month?.currency || 'TWD'

  // 格式化貨幣
  const formatCurrency = (amount: number | undefined | null) => {
    return `${defaultCurrency} ${safeToLocaleString(amount)}`
  }

  if (dashboardData.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (dashboardData.hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg font-semibold">{t('dashboard.loadError')}</p>
          <button
            onClick={() => dashboardData.refetchAll()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('dashboard.reload')}
          </button>
        </div>
      </div>
    )
  }

  const { summary, stats, revenueTrend, currencyDistribution, statusStats } = dashboardData

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('nav.dashboard')}</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* 頂部精簡快速建立區 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <QuickCreateButton
          href={`/${locale}/quotations/new`}
          icon="📄"
          title={t('dashboard.createQuotation')}
          variant="primary"
        />
        <QuickCreateButton
          href={`/${locale}/customers/new`}
          icon="👥"
          title={t('dashboard.createCustomer')}
          variant="secondary"
        />
        <QuickCreateButton
          href={`/${locale}/products/new`}
          icon="📦"
          title={t('dashboard.createProduct')}
          variant="secondary"
        />
      </div>

      {/* 提醒與警告區 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 逾期合約提醒 */}
        <AlertCard
          title={t('dashboard.overdueContracts')}
          type="error"
          locale={locale}
          viewAllLabel={t('dashboard.viewAll')}
          amountLabel={t('dashboard.amount')}
          items={
            overdueContracts?.map((contract) => ({
              id: contract.id,
              name: locale === 'zh' ? contract.customer?.company_name_zh : contract.customer?.company_name_en || '',
              date: contract.next_collection_date || '',
              amount: contract.next_collection_amount || 0,
            })) || []
          }
          onViewAll={() => (window.location.href = `/${locale}/contracts?status=overdue`)}
        />

        {/* 付款提醒 */}
        <AlertCard
          title={t('dashboard.upcomingPayments')}
          type="warning"
          locale={locale}
          viewAllLabel={t('dashboard.viewAll')}
          amountLabel={t('dashboard.amount')}
          items={
            paymentReminders?.map((reminder) => ({
              id: reminder.contract_id,
              name: reminder.customer_name,
              date: reminder.next_collection_date,
              amount: reminder.next_collection_amount,
              days: reminder.days_until_due,
              daysLabel: reminder.days_until_due > 0
                ? t('dashboard.daysLater', { days: reminder.days_until_due })
                : t('dashboard.daysOverdue', { days: Math.abs(reminder.days_until_due) }),
            })) || []
          }
          onViewAll={() => (window.location.href = `/${locale}/contracts`)}
        />
      </div>

      {/* 主要統計卡片 */}
      {summary && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 本月營收 */}
          <StatCard
            title={t('dashboard.monthlyRevenue')}
            value={formatCurrency(summary.currentMonthRevenue)}
            icon="💰"
            color="blue"
            trend={{
              value: summary.revenueGrowth,
              isPositive: summary.revenueGrowth >= 0,
            }}
            trendLabel={t('dashboard.vsLastMonth')}
          />

          {/* 本月報價單 */}
          <StatCard
            title={t('dashboard.monthlyQuotations')}
            value={summary.currentMonthCount}
            icon="📄"
            color="green"
            trend={{
              value: summary.countGrowth,
              isPositive: summary.countGrowth >= 0,
            }}
            trendLabel={t('dashboard.vsLastMonth')}
          />

          {/* 轉換率 */}
          <StatCard
            title={t('dashboard.conversionRate')}
            value={`${summary.conversionRate}%`}
            icon="📊"
            color="purple"
            subtitle={`${summary.acceptedCount} ${t('dashboard.signed')} / ${summary.acceptedCount + summary.pendingCount} ${t('dashboard.sent')}`}
          />

          {/* 待處理 */}
          <StatCard
            title={t('dashboard.pending')}
            value={summary.pendingCount}
            icon="⏰"
            color="yellow"
            subtitle={t('dashboard.draftCount', { count: summary.draftCount })}
          />
        </div>
      )}

      {/* 業務統計卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 活躍合約 */}
          <StatCard
            title={t('dashboard.activeContracts')}
            value={stats.contracts.active}
            icon="📝"
            color="green"
            subtitle={
              stats.contracts.overdue > 0
                ? t('dashboard.overdueCount', { count: stats.contracts.overdue })
                : t('dashboard.noOverdueContracts')
            }
          />

          {/* 本月收款 */}
          <StatCard
            title={t('dashboard.monthlyCollection')}
            value={formatCurrency(stats.payments.current_month_collected)}
            icon="💵"
            color="blue"
          />

          {/* 未收款 */}
          <StatCard
            title={t('dashboard.totalOutstanding')}
            value={formatCurrency(stats.payments.total_unpaid)}
            icon="📋"
            color="orange"
            subtitle={
              stats.payments.total_overdue > 0
                ? t('dashboard.overdueAmount', { amount: formatCurrency(stats.payments.total_overdue) })
                : t('dashboard.noOverduePayments')
            }
          />

          {/* 客戶總數 */}
          <StatCard
            title={t('dashboard.totalCustomers')}
            value={stats.customers.total}
            icon="👥"
            color="purple"
            subtitle={t('dashboard.activeCustomers', { count: stats.customers.active })}
          />
        </div>
      )}

      {/* 圖表區域 */}
      {revenueTrend && currencyDistribution && statusStats && summary && (
        <DashboardCharts
          revenueData={revenueTrend}
          currencyData={currencyDistribution}
          statusData={statusStats}
          summary={summary}
          defaultCurrency={defaultCurrency}
        />
      )}

      {/* 快速操作區 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard
            href={`/${locale}/quotations/new`}
            icon="📄"
            title={t('dashboard.createQuotation')}
            description={t('dashboard.createQuotationDesc')}
          />
          <QuickActionCard
            href={`/${locale}/customers/new`}
            icon="👥"
            title={t('dashboard.createCustomer')}
            description={t('dashboard.createCustomerDesc')}
          />
          <QuickActionCard
            href={`/${locale}/products/new`}
            icon="📦"
            title={t('dashboard.createProduct')}
            description={t('dashboard.createProductDesc')}
          />
          <QuickActionCard
            href={`/${locale}/contracts`}
            icon="📝"
            title={t('dashboard.manageContracts')}
            description={t('dashboard.manageContractsDesc')}
          />
          <QuickActionCard
            href={`/${locale}/payments`}
            icon="💰"
            title={t('dashboard.paymentRecords')}
            description={t('dashboard.paymentRecordsDesc')}
          />
          <QuickActionCard
            href={`/${locale}/quotations`}
            icon="📊"
            title={t('dashboard.quotationList')}
            description={t('dashboard.quotationListDesc')}
          />
        </div>
      </div>
    </div>
  )
}
