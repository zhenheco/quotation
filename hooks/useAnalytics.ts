'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { STALE_TIME } from '@/lib/api/queryClient'

// ============================================================================
// Types
// ============================================================================

export interface RevenueTrendData {
  month: string
  revenue: number
  count: number
}

export interface CurrencyDistributionData {
  currency: string
  value: number
  count: number
}

export interface StatusStatisticsData {
  status: string
  count: number
  value: number
}

export interface DashboardSummary {
  currentMonthRevenue: number
  revenueGrowth: number
  currentMonthCount: number
  countGrowth: number
  conversionRate: number
  acceptedCount: number
  pendingCount: number
  draftCount: number
}

export interface DashboardStats {
  quotations: {
    draft: number
    sent: number
    accepted: number
    rejected: number
    total: number
  }
  contracts: {
    active: number
    overdue: number
    expiring_soon: number
    total: number
  }
  payments: {
    current_month_collected: number
    current_year_collected: number
    total_unpaid: number
    total_overdue: number
    currency: string
  }
  customers: {
    total: number
    active: number
  }
  products: {
    total: number
  }
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchRevenueTrend(months: number = 6): Promise<RevenueTrendData[]> {
  return apiGet<RevenueTrendData[]>(`/api/analytics/revenue-trend?months=${months}`)
}

async function fetchCurrencyDistribution(): Promise<CurrencyDistributionData[]> {
  return apiGet<CurrencyDistributionData[]>('/api/analytics/currency-distribution')
}

async function fetchStatusStatistics(): Promise<StatusStatisticsData[]> {
  return apiGet<StatusStatisticsData[]>('/api/analytics/status-statistics')
}

async function fetchDashboardSummary(): Promise<DashboardSummary | null> {
  return apiGet<DashboardSummary | null>('/api/analytics/dashboard-summary')
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>('/api/analytics/dashboard-stats')
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * 取得營收趨勢數據
 *
 * @param months - 要顯示的月份數量（預設 6 個月）
 *
 * @example
 * ```tsx
 * function RevenueTrendChart() {
 *   const { data: revenueData, isLoading } = useRevenueTrend(6)
 *
 *   if (isLoading) return <LoadingSpinner />
 *
 *   return <LineChart data={revenueData} />
 * }
 * ```
 */
export function useRevenueTrend(months: number = 6) {
  return useQuery({
    queryKey: ['analytics', 'revenue-trend', months],
    queryFn: () => fetchRevenueTrend(months),
    staleTime: STALE_TIME.STATIC,
    refetchInterval: 10 * 60 * 1000, // 自動刷新
  })
}

/**
 * 取得幣別分布數據
 *
 * @example
 * ```tsx
 * function CurrencyPieChart() {
 *   const { data: currencyData, isLoading } = useCurrencyDistribution()
 *
 *   if (isLoading) return <LoadingSpinner />
 *
 *   return <PieChart data={currencyData} />
 * }
 * ```
 */
export function useCurrencyDistribution() {
  return useQuery({
    queryKey: ['analytics', 'currency-distribution'],
    queryFn: fetchCurrencyDistribution,
    staleTime: STALE_TIME.STATIC,
    refetchInterval: 10 * 60 * 1000,
  })
}

/**
 * 取得狀態統計數據
 *
 * @example
 * ```tsx
 * function StatusBarChart() {
 *   const { data: statusData, isLoading } = useStatusStatistics()
 *
 *   if (isLoading) return <LoadingSpinner />
 *
 *   return <BarChart data={statusData} />
 * }
 * ```
 */
export function useStatusStatistics() {
  return useQuery({
    queryKey: ['analytics', 'status-statistics'],
    queryFn: fetchStatusStatistics,
    staleTime: STALE_TIME.STATIC,
    refetchInterval: 10 * 60 * 1000,
  })
}

/**
 * 取得儀表板統計摘要
 *
 * @example
 * ```tsx
 * function DashboardSummaryCards() {
 *   const { data: summary, isLoading } = useDashboardSummary()
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (!summary) return null
 *
 *   return (
 *     <div>
 *       <StatCard title="本月營收" value={summary.currentMonthRevenue} />
 *       <StatCard title="成長率" value={`${summary.revenueGrowth}%`} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['analytics', 'dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: STALE_TIME.STATIC,
    refetchInterval: 10 * 60 * 1000,
  })
}

/**
 * 取得完整的儀表板統計數據
 * 包含報價單、合約、付款、客戶、產品等統計
 *
 * @example
 * ```tsx
 * function DashboardOverview() {
 *   const { data: stats, isLoading, error } = useDashboardStats()
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (error) return <ErrorMessage error={error} />
 *   if (!stats) return null
 *
 *   return (
 *     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 *       <StatCard
 *         title="報價單總數"
 *         value={stats.quotations.total}
 *         icon="📄"
 *       />
 *       <StatCard
 *         title="活躍合約"
 *         value={stats.contracts.active}
 *         icon="📝"
 *       />
 *       <StatCard
 *         title="本月收款"
 *         value={stats.payments.current_month_collected}
 *         currency={stats.payments.currency}
 *         icon="💰"
 *       />
 *       <StatCard
 *         title="客戶總數"
 *         value={stats.customers.total}
 *         icon="👥"
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['analytics', 'dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: STALE_TIME.STATIC,
    refetchInterval: 10 * 60 * 1000, // 自動刷新
  })
}

/**
 * 取得所有儀表板數據（一次性獲取）
 * 結合多個查詢以提供完整的儀表板數據
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const dashboardData = useFullDashboardData()
 *
 *   if (dashboardData.isLoading) return <LoadingSpinner />
 *   if (dashboardData.hasError) return <ErrorMessage />
 *
 *   return (
 *     <div>
 *       <DashboardSummaryCards data={dashboardData.summary} />
 *       <RevenueChart data={dashboardData.revenueTrend} />
 *       <CurrencyChart data={dashboardData.currencyDistribution} />
 *       <StatusChart data={dashboardData.statusStats} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useFullDashboardData(months: number = 6) {
  const revenueTrend = useRevenueTrend(months)
  const currencyDistribution = useCurrencyDistribution()
  const statusStats = useStatusStatistics()
  const summary = useDashboardSummary()
  const stats = useDashboardStats()

  return {
    revenueTrend: revenueTrend.data,
    currencyDistribution: currencyDistribution.data,
    statusStats: statusStats.data,
    summary: summary.data,
    stats: stats.data,
    isLoading:
      revenueTrend.isLoading ||
      currencyDistribution.isLoading ||
      statusStats.isLoading ||
      summary.isLoading ||
      stats.isLoading,
    hasError:
      revenueTrend.error ||
      currencyDistribution.error ||
      statusStats.error ||
      summary.error ||
      stats.error,
    refetchAll: () => {
      revenueTrend.refetch()
      currencyDistribution.refetch()
      statusStats.refetch()
      summary.refetch()
      stats.refetch()
    },
  }
}
