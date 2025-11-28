/**
 * Analytics 資料存取層 (DAL)
 *
 * 功能：
 * 1. 提供儀表板統計資料查詢
 * 2. 提供營收趨勢分析
 * 3. 提供貨幣分布統計
 * 4. 提供狀態統計資料
 * 5. 所有函式強制 userId 參數（多租戶隔離）
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

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
  totalQuotations: number
  totalRevenue: number
  totalCustomers: number
  totalContracts: number
  pendingPayments: number
  pendingAmount: number
}

export interface RevenueTrendItem {
  month: string
  revenue: number
  count: number
}

export interface CurrencyDistribution {
  currency: string
  amount: number
  count: number
  percentage: number
}

export interface StatusStatistics {
  status: string
  count: number
  totalAmount: number
  percentage: number
}

/**
 * 取得儀表板摘要統計
 */
export async function getDashboardSummary(
  db: SupabaseClient,
  userId: string
): Promise<DashboardSummary> {
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const lastMonth = new Date(currentMonth)
  lastMonth.setMonth(lastMonth.getMonth() - 1)

  const [currentMonthResult, lastMonthResult] = await Promise.all([
    db.from('quotations')
      .select('total_amount, status')
      .eq('user_id', userId)
      .gte('issue_date', currentMonth.toISOString()),
    db.from('quotations')
      .select('total_amount, status')
      .eq('user_id', userId)
      .gte('issue_date', lastMonth.toISOString())
      .lt('issue_date', currentMonth.toISOString()),
  ])

  if (currentMonthResult.error) {
    throw new Error(`Failed to get current month quotations: ${currentMonthResult.error.message}`)
  }
  if (lastMonthResult.error) {
    throw new Error(`Failed to get last month quotations: ${lastMonthResult.error.message}`)
  }

  const currentMonthQuotations = currentMonthResult.data || []
  const lastMonthQuotations = lastMonthResult.data || []

  const currentRevenue = currentMonthQuotations
    .filter((q) => q.status === 'accepted')
    .reduce((sum, q) => sum + q.total_amount, 0)

  const lastRevenue = lastMonthQuotations
    .filter((q) => q.status === 'accepted')
    .reduce((sum, q) => sum + q.total_amount, 0)

  const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0

  const currentCount = currentMonthQuotations.length
  const lastCount = lastMonthQuotations.length

  const countGrowth = lastCount > 0 ? ((currentCount - lastCount) / lastCount) * 100 : 0

  const acceptedCount = currentMonthQuotations.filter((q) => q.status === 'accepted').length
  const sentCount = currentMonthQuotations.filter(
    (q) => q.status === 'sent' || q.status === 'accepted'
  ).length
  const conversionRate = sentCount > 0 ? (acceptedCount / sentCount) * 100 : 0

  return {
    currentMonthRevenue: currentRevenue,
    revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
    currentMonthCount: currentCount,
    countGrowth: parseFloat(countGrowth.toFixed(1)),
    conversionRate: parseFloat(conversionRate.toFixed(1)),
    acceptedCount,
    pendingCount: currentMonthQuotations.filter((q) => q.status === 'sent').length,
    draftCount: currentMonthQuotations.filter((q) => q.status === 'draft').length,
  }
}

export interface QuotationStats {
  draft: number
  sent: number
  accepted: number
  rejected: number
  approved: number
  total: number
}

export interface ContractStats {
  active: number
  overdue: number
  expiring_soon: number
  total: number
}

export interface PaymentStats {
  current_month_collected: number
  current_year_collected: number
  total_unpaid: number
  total_overdue: number
  currency: string
}

export interface CustomerStats {
  total: number
  active: number
}

export interface ProductStats {
  total: number
}

export interface DashboardStatsResult {
  quotations: QuotationStats
  contracts: ContractStats
  payments: PaymentStats
  customers: CustomerStats
  products: ProductStats
}

/**
 * 取得儀表板統計資料
 */
export async function getDashboardStats(
  db: SupabaseClient,
  userId: string
): Promise<DashboardStatsResult> {
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentYearStart = new Date(now.getFullYear(), 0, 1)

  const [
    quotationsResult,
    contractsResult,
    customersResult,
    productsResult,
    overdueContractsResult,
    currentMonthPaymentsResult,
    currentYearPaymentsResult,
  ] = await Promise.all([
    db.from('quotations')
      .select('status, total_amount')
      .eq('user_id', userId),
    db.from('customer_contracts')
      .select('status, end_date, next_collection_date')
      .eq('user_id', userId),
    db.from('customers')
      .select('id')
      .eq('user_id', userId),
    db.from('products')
      .select('id')
      .eq('user_id', userId),
    db.from('customer_contracts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lt('next_collection_date', now.toISOString()),
    db.from('payment_schedules')
      .select('status, amount, currency')
      .eq('user_id', userId)
      .gte('due_date', currentMonthStart.toISOString()),
    db.from('payment_schedules')
      .select('status, amount, currency')
      .eq('user_id', userId)
      .gte('due_date', currentYearStart.toISOString()),
  ])

  if (quotationsResult.error) throw new Error(`Failed to get quotations: ${quotationsResult.error.message}`)
  if (contractsResult.error) throw new Error(`Failed to get contracts: ${contractsResult.error.message}`)
  if (customersResult.error) throw new Error(`Failed to get customers: ${customersResult.error.message}`)
  if (productsResult.error) throw new Error(`Failed to get products: ${productsResult.error.message}`)
  if (overdueContractsResult.error) throw new Error(`Failed to get overdue contracts: ${overdueContractsResult.error.message}`)
  if (currentMonthPaymentsResult.error) throw new Error(`Failed to get current month payments: ${currentMonthPaymentsResult.error.message}`)
  if (currentYearPaymentsResult.error) throw new Error(`Failed to get current year payments: ${currentYearPaymentsResult.error.message}`)

  const quotations = quotationsResult.data || []
  const contracts = contractsResult.data || []
  const customers = customersResult.data || []
  const products = productsResult.data || []
  const overdueContracts = overdueContractsResult.data || []
  const currentMonthPayments = currentMonthPaymentsResult.data || []
  const currentYearPayments = currentYearPaymentsResult.data || []

  const quotationStats: QuotationStats = {
    draft: quotations.filter((q) => q.status === 'draft').length,
    sent: quotations.filter((q) => q.status === 'sent').length,
    accepted: quotations.filter((q) => q.status === 'accepted').length,
    rejected: quotations.filter((q) => q.status === 'rejected').length,
    approved: quotations.filter((q) => q.status === 'approved').length,
    total: quotations.length,
  }

  const contractStats: ContractStats = {
    active: contracts.filter((c) => c.status === 'active').length,
    overdue: overdueContracts.length,
    expiring_soon: contracts.filter((c) => {
      const endDate = new Date(c.end_date)
      return c.status === 'active' && endDate >= now && endDate <= thirtyDaysLater
    }).length,
    total: contracts.length,
  }

  const currentMonthCollected = currentMonthPayments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  const currentYearCollected = currentYearPayments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  const currentYearPending = currentYearPayments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)

  const currentYearOverdue = currentYearPayments
    .filter((p) => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0)

  const currency = currentMonthPayments.find((p) => p.currency)?.currency || 'TWD'

  const paymentStats: PaymentStats = {
    current_month_collected: currentMonthCollected,
    current_year_collected: currentYearCollected,
    total_unpaid: currentYearPending,
    total_overdue: currentYearOverdue,
    currency,
  }

  const customerStats: CustomerStats = {
    total: customers.length,
    active: customers.length,
  }

  const productStats: ProductStats = {
    total: products.length,
  }

  return {
    quotations: quotationStats,
    contracts: contractStats,
    payments: paymentStats,
    customers: customerStats,
    products: productStats,
  }
}

/**
 * 取得營收趨勢（過去 N 個月）
 */
export async function getRevenueTrend(
  db: SupabaseClient,
  userId: string,
  months: number = 6
): Promise<RevenueTrendItem[]> {
  const result: RevenueTrendItem[] = []
  const today = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)

    const { data, error } = await db
      .from('quotations')
      .select('total_amount')
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .gte('issue_date', monthStart.toISOString())
      .lt('issue_date', monthEnd.toISOString())

    if (error) {
      throw new Error(`Failed to get revenue trend: ${error.message}`)
    }

    const quotations = data || []
    const revenue = quotations.reduce((sum, q) => sum + q.total_amount, 0)

    result.push({
      month: monthStart.toISOString().slice(0, 7),
      revenue,
      count: quotations.length,
    })
  }

  return result
}

/**
 * 取得貨幣分布統計
 */
export async function getCurrencyDistribution(
  db: SupabaseClient,
  userId: string
): Promise<CurrencyDistribution[]> {
  const { data, error } = await db
    .from('quotations')
    .select('currency, total_amount')
    .eq('user_id', userId)
    .eq('status', 'accepted')

  if (error) {
    throw new Error(`Failed to get currency distribution: ${error.message}`)
  }

  const quotations = data || []

  const currencyMap = new Map<string, { amount: number; count: number }>()

  for (const q of quotations) {
    const existing = currencyMap.get(q.currency) || { amount: 0, count: 0 }
    currencyMap.set(q.currency, {
      amount: existing.amount + q.total_amount,
      count: existing.count + 1,
    })
  }

  const totalAmount = Array.from(currencyMap.values()).reduce((sum, v) => sum + v.amount, 0)

  return Array.from(currencyMap.entries())
    .map(([currency, { amount, count }]) => ({
      currency,
      amount,
      count,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * 取得狀態統計資料
 */
export async function getStatusStatistics(
  db: SupabaseClient,
  userId: string
): Promise<StatusStatistics[]> {
  const { data, error } = await db
    .from('quotations')
    .select('status, total_amount')
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to get status statistics: ${error.message}`)
  }

  const quotations = data || []

  const statusMap = new Map<string, { count: number; totalAmount: number }>()

  for (const q of quotations) {
    const existing = statusMap.get(q.status) || { count: 0, totalAmount: 0 }
    statusMap.set(q.status, {
      count: existing.count + 1,
      totalAmount: existing.totalAmount + q.total_amount,
    })
  }

  const totalCount = quotations.length

  return Array.from(statusMap.entries())
    .map(([status, { count, totalAmount }]) => ({
      status,
      count,
      totalAmount,
      percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}
