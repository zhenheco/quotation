import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import DashboardCharts from '@/components/DashboardCharts'
import {
  getRevenueTrend,
  getCurrencyDistribution,
  getStatusStatistics,
  getDashboardSummary
} from '@/lib/services/analytics'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const t = await getTranslations()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 獲取圖表數據
  const [revenueData, currencyData, statusData, summary] = await Promise.all([
    getRevenueTrend(6),
    getCurrencyDistribution(),
    getStatusStatistics(),
    getDashboardSummary()
  ])

  // 獲取用戶的預設貨幣（從最新的報價單取得）
  const { data: latestQuotation } = await supabase
    .from('quotations')
    .select('currency')
    .eq('user_id', user?.id || '')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const defaultCurrency = latestQuotation?.currency || 'TWD'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('nav.dashboard')}</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* 渲染圖表組件 */}
      <DashboardCharts
        revenueData={revenueData}
        currencyData={currencyData}
        statusData={statusData}
        summary={summary}
        defaultCurrency={defaultCurrency}
      />

      {/* 快速操作區 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('dashboard.quickActions')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickActionCard
            href="/zh/quotations/new"
            icon="📄"
            title={t('quotation.createNew')}
            description={t('dashboard.createQuotationDesc')}
          />
          <QuickActionCard
            href="/zh/customers/new"
            icon="👥"
            title={t('customer.createNew')}
            description={t('dashboard.createCustomerDesc')}
          />
          <QuickActionCard
            href="/zh/products/new"
            icon="📦"
            title={t('product.createNew')}
            description={t('dashboard.createProductDesc')}
          />
        </div>
      </div>
    </div>
  )
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: string
  title: string
  description: string
}) {
  return (
    <a
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
    </a>
  )
}