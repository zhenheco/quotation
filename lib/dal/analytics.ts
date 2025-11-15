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

import { D1Client } from '@/lib/db/d1-client'

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
  db: D1Client,
  userId: string
): Promise<DashboardSummary> {
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const lastMonth = new Date(currentMonth)
  lastMonth.setMonth(lastMonth.getMonth() - 1)

  const currentMonthQuotations = await db.query<{
    total_amount: number
    status: string
  }>(
    `SELECT total_amount, status FROM quotations
     WHERE user_id = ? AND issue_date >= ?`,
    [userId, currentMonth.toISOString()]
  )

  const lastMonthQuotations = await db.query<{
    total_amount: number
    status: string
  }>(
    `SELECT total_amount, status FROM quotations
     WHERE user_id = ? AND issue_date >= ? AND issue_date < ?`,
    [userId, lastMonth.toISOString(), currentMonth.toISOString()]
  )

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
  db: D1Client,
  userId: string
): Promise<DashboardStatsResult> {
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentYearStart = new Date(now.getFullYear(), 0, 1)

  const [
    quotations,
    contracts,
    customers,
    products,
    overdueContracts,
    currentMonthPayments,
    currentYearPayments,
  ] = await Promise.all([
    db.query<{ status: string; total_amount: number }>(
      'SELECT status, total_amount FROM quotations WHERE user_id = ?',
      [userId]
    ),
    db.query<{ status: string; end_date: string; next_collection_date: string }>(
      'SELECT status, end_date, next_collection_date FROM customer_contracts WHERE user_id = ?',
      [userId]
    ),
    db.query<{ id: string }>(
      'SELECT id FROM customers WHERE user_id = ?',
      [userId]
    ),
    db.query<{ id: string }>(
      'SELECT id FROM products WHERE user_id = ?',
      [userId]
    ),
    db.query<{ id: string }>(
      `SELECT id FROM customer_contracts
       WHERE user_id = ? AND status = 'active' AND next_collection_date < ?`,
      [userId, now.toISOString()]
    ),
    db.query<{ status: string; amount: number; currency: string }>(
      'SELECT status, amount, currency FROM payment_schedules WHERE user_id = ? AND due_date >= ?',
      [userId, currentMonthStart.toISOString()]
    ),
    db.query<{ status: string; amount: number; currency: string }>(
      'SELECT status, amount, currency FROM payment_schedules WHERE user_id = ? AND due_date >= ?',
      [userId, currentYearStart.toISOString()]
    ),
  ])

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
    active: customers.length, // 暫時假設所有客戶都是活躍的，因為 D1 schema 尚未包含 is_active 欄位
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
  db: D1Client,
  userId: string,
  months: number = 6
): Promise<RevenueTrendItem[]> {
  const result: RevenueTrendItem[] = []
  const today = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)

    const quotations = await db.query<{ total_amount: number }>(
      `SELECT total_amount FROM quotations
       WHERE user_id = ? AND status = 'accepted'
       AND issue_date >= ? AND issue_date < ?`,
      [userId, monthStart.toISOString(), monthEnd.toISOString()]
    )

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
  db: D1Client,
  userId: string
): Promise<CurrencyDistribution[]> {
  const rows = await db.query<{
    currency: string
    amount: number
    count: number
  }>(
    `SELECT
      currency,
      SUM(total_amount) as amount,
      COUNT(*) as count
     FROM quotations
     WHERE user_id = ? AND status = 'accepted'
     GROUP BY currency
     ORDER BY amount DESC`,
    [userId]
  )

  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0)

  return rows.map((row) => ({
    currency: row.currency,
    amount: row.amount,
    count: row.count,
    percentage: totalAmount > 0 ? (row.amount / totalAmount) * 100 : 0,
  }))
}

/**
 * 取得狀態統計資料
 */
export async function getStatusStatistics(
  db: D1Client,
  userId: string
): Promise<StatusStatistics[]> {
  const rows = await db.query<{
    status: string
    count: number
    totalAmount: number
  }>(
    `SELECT
      status,
      COUNT(*) as count,
      SUM(total_amount) as totalAmount
     FROM quotations
     WHERE user_id = ?
     GROUP BY status
     ORDER BY count DESC`,
    [userId]
  )

  const totalCount = rows.reduce((sum, row) => sum + row.count, 0)

  return rows.map((row) => ({
    status: row.status,
    count: row.count,
    totalAmount: row.totalAmount,
    percentage: totalCount > 0 ? (row.count / totalCount) * 100 : 0,
  }))
}
