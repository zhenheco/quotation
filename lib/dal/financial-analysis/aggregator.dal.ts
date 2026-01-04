/**
 * Financial Analysis Aggregator DAL
 *
 * 財務分析資料匯總層
 * 整合發票、傳票、付款資料供 AI 分析使用
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================================================
// TYPES
// ============================================================================

export interface CashFlowPeriod {
  period: string // YYYY-MM format
  inflow: number // 銷項發票 + 收款
  outflow: number // 進項發票 + 付款
  net_flow: number // 淨現金流
  opening_balance: number
  closing_balance: number
}

export interface CashFlowHistory {
  periods: CashFlowPeriod[]
  total_inflow: number
  total_outflow: number
  average_monthly_net: number
  currency: string
}

export interface ReceivableAgingBucket {
  bucket: 'current' | '1-30' | '31-60' | '61-90' | 'over_90'
  count: number
  amount: number
  percentage: number
}

export interface ReceivableByCustomer {
  customer_id: string
  customer_name: string
  total_outstanding: number
  oldest_due_date: string
  days_overdue: number
  invoice_count: number
  payment_history_score: number // 0-100 based on payment history
}

export interface ReceivableAging {
  buckets: ReceivableAgingBucket[]
  by_customer: ReceivableByCustomer[]
  total_outstanding: number
  total_overdue: number
  average_days_outstanding: number
  currency: string
}

export interface TaxSummary {
  year: number
  output_tax: number // 銷項稅額
  input_tax: number // 進項稅額
  net_tax: number // 應納稅額
  output_invoices_count: number
  input_invoices_count: number
  revenue: number // 營業收入
  expenses: number // 營業費用（可抵扣）
  profit_rate: number // 毛利率
  estimated_income_tax: number // 預估營所稅
}

export interface RevenueByCategory {
  category: string
  amount: number
  percentage: number
  count: number
}

export interface RevenueTrend {
  period: string // YYYY-MM
  revenue: number
  growth_rate: number | null // compared to previous period
}

export interface FinancialSummary {
  period: {
    start_date: string
    end_date: string
  }
  revenue: {
    total: number
    by_category: RevenueByCategory[]
    trend: RevenueTrend[]
  }
  expenses: {
    total: number
    by_category: RevenueByCategory[]
  }
  profit: {
    gross: number
    gross_margin: number
    net: number
    net_margin: number
  }
  cash_position: {
    current_balance: number
    accounts_receivable: number
    accounts_payable: number
    net_working_capital: number
  }
  currency: string
}

// ============================================================================
// CASH FLOW ANALYSIS
// ============================================================================

/**
 * 取得現金流歷史資料
 * @param monthsBack 往回查詢的月份數，預設 12
 */
export async function getCashFlowHistory(
  db: SupabaseClient,
  companyId: string,
  monthsBack: number = 12
): Promise<CashFlowHistory> {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = now.toISOString().split('T')[0]

  // 取得銷項發票（收入）
  const { data: outputInvoices, error: outputError } = await db
    .from('acc_invoices')
    .select('date, total_amount, payment_status')
    .eq('company_id', companyId)
    .eq('type', 'OUTPUT')
    .neq('status', 'VOIDED')
    .is('deleted_at', null)
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  if (outputError) {
    throw new Error(`取得銷項發票失敗: ${outputError.message}`)
  }

  // 取得進項發票（支出）
  const { data: inputInvoices, error: inputError } = await db
    .from('acc_invoices')
    .select('date, total_amount, payment_status')
    .eq('company_id', companyId)
    .eq('type', 'INPUT')
    .neq('status', 'VOIDED')
    .is('deleted_at', null)
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  if (inputError) {
    throw new Error(`取得進項發票失敗: ${inputError.message}`)
  }

  // 按月份分組
  const monthlyData = new Map<string, { inflow: number; outflow: number }>()

  // 初始化所有月份
  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyData.set(period, { inflow: 0, outflow: 0 })
  }

  // 匯總銷項（收入）
  for (const inv of outputInvoices || []) {
    const period = inv.date.substring(0, 7)
    const existing = monthlyData.get(period)
    if (existing) {
      existing.inflow += parseFloat(String(inv.total_amount)) || 0
    }
  }

  // 匯總進項（支出）
  for (const inv of inputInvoices || []) {
    const period = inv.date.substring(0, 7)
    const existing = monthlyData.get(period)
    if (existing) {
      existing.outflow += parseFloat(String(inv.total_amount)) || 0
    }
  }

  // 轉換為陣列並排序
  const periods: CashFlowPeriod[] = []
  let runningBalance = 0 // 假設起始餘額為 0（實際應從帳戶餘額取得）

  const sortedPeriods = Array.from(monthlyData.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  for (const [period, data] of sortedPeriods) {
    const netFlow = data.inflow - data.outflow
    const openingBalance = runningBalance
    runningBalance += netFlow

    periods.push({
      period,
      inflow: data.inflow,
      outflow: data.outflow,
      net_flow: netFlow,
      opening_balance: openingBalance,
      closing_balance: runningBalance,
    })
  }

  const totalInflow = periods.reduce((sum, p) => sum + p.inflow, 0)
  const totalOutflow = periods.reduce((sum, p) => sum + p.outflow, 0)
  const avgMonthlyNet = periods.length > 0 ? (totalInflow - totalOutflow) / periods.length : 0

  return {
    periods,
    total_inflow: totalInflow,
    total_outflow: totalOutflow,
    average_monthly_net: avgMonthlyNet,
    currency: 'TWD',
  }
}

// ============================================================================
// RECEIVABLE AGING ANALYSIS
// ============================================================================

/**
 * 取得應收帳款帳齡分析
 */
export async function getReceivableAging(
  db: SupabaseClient,
  companyId: string
): Promise<ReceivableAging> {
  const today = new Date()

  // 取得未收款的銷項發票
  const { data: invoices, error } = await db
    .from('acc_invoices')
    .select(`
      id,
      counterparty_id,
      counterparty_name,
      total_amount,
      paid_amount,
      due_date,
      date
    `)
    .eq('company_id', companyId)
    .eq('type', 'OUTPUT')
    .in('payment_status', ['UNPAID', 'PARTIAL'])
    .neq('status', 'VOIDED')
    .is('deleted_at', null)

  if (error) {
    throw new Error(`取得應收發票失敗: ${error.message}`)
  }

  // 初始化帳齡分桶
  const buckets: Record<string, { count: number; amount: number }> = {
    current: { count: 0, amount: 0 },
    '1-30': { count: 0, amount: 0 },
    '31-60': { count: 0, amount: 0 },
    '61-90': { count: 0, amount: 0 },
    over_90: { count: 0, amount: 0 },
  }

  // 客戶應收帳款彙總
  const customerMap = new Map<
    string,
    {
      customer_id: string
      customer_name: string
      total_outstanding: number
      oldest_due_date: string
      invoice_count: number
    }
  >()

  let totalOutstanding = 0
  let totalOverdue = 0
  let totalDaysOutstanding = 0
  let countWithDueDate = 0

  for (const inv of invoices || []) {
    const outstanding = (parseFloat(String(inv.total_amount)) || 0) - (parseFloat(String(inv.paid_amount)) || 0)
    if (outstanding <= 0) continue

    totalOutstanding += outstanding

    // 計算帳齡
    const dueDate = inv.due_date || inv.date
    const dueDateObj = new Date(dueDate)
    const daysDiff = Math.floor((today.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24))

    // 分類到正確的帳齡桶
    let bucket: string
    if (daysDiff <= 0) {
      bucket = 'current'
    } else if (daysDiff <= 30) {
      bucket = '1-30'
      totalOverdue += outstanding
    } else if (daysDiff <= 60) {
      bucket = '31-60'
      totalOverdue += outstanding
    } else if (daysDiff <= 90) {
      bucket = '61-90'
      totalOverdue += outstanding
    } else {
      bucket = 'over_90'
      totalOverdue += outstanding
    }

    buckets[bucket].count += 1
    buckets[bucket].amount += outstanding

    // 計算平均逾期天數
    if (daysDiff > 0) {
      totalDaysOutstanding += daysDiff
      countWithDueDate++
    }

    // 更新客戶統計
    const customerId = inv.counterparty_id || 'unknown'
    const customerName = inv.counterparty_name || '未知客戶'

    const existing = customerMap.get(customerId)
    if (existing) {
      existing.total_outstanding += outstanding
      existing.invoice_count += 1
      if (dueDate < existing.oldest_due_date) {
        existing.oldest_due_date = dueDate
      }
    } else {
      customerMap.set(customerId, {
        customer_id: customerId,
        customer_name: customerName,
        total_outstanding: outstanding,
        oldest_due_date: dueDate,
        invoice_count: 1,
      })
    }
  }

  // 計算帳齡桶百分比
  const agingBuckets: ReceivableAgingBucket[] = (['current', '1-30', '31-60', '61-90', 'over_90'] as const).map(
    (bucket) => ({
      bucket,
      count: buckets[bucket].count,
      amount: buckets[bucket].amount,
      percentage: totalOutstanding > 0 ? (buckets[bucket].amount / totalOutstanding) * 100 : 0,
    })
  )

  // 計算客戶逾期天數和付款評分
  const byCustomer: ReceivableByCustomer[] = Array.from(customerMap.values())
    .map((c) => {
      const oldestDate = new Date(c.oldest_due_date)
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)))

      // 簡單的付款評分計算（基於逾期天數）
      let paymentScore = 100
      if (daysOverdue > 90) paymentScore = 20
      else if (daysOverdue > 60) paymentScore = 40
      else if (daysOverdue > 30) paymentScore = 60
      else if (daysOverdue > 0) paymentScore = 80

      return {
        ...c,
        days_overdue: daysOverdue,
        payment_history_score: paymentScore,
      }
    })
    .sort((a, b) => b.total_outstanding - a.total_outstanding)

  return {
    buckets: agingBuckets,
    by_customer: byCustomer,
    total_outstanding: totalOutstanding,
    total_overdue: totalOverdue,
    average_days_outstanding: countWithDueDate > 0 ? Math.round(totalDaysOutstanding / countWithDueDate) : 0,
    currency: 'TWD',
  }
}

// ============================================================================
// TAX SUMMARY
// ============================================================================

/**
 * 取得年度稅務摘要
 */
export async function getTaxSummary(
  db: SupabaseClient,
  companyId: string,
  year: number
): Promise<TaxSummary> {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  // 取得銷項發票
  const { data: outputInvoices, error: outputError } = await db
    .from('acc_invoices')
    .select('untaxed_amount, tax_amount, total_amount')
    .eq('company_id', companyId)
    .eq('type', 'OUTPUT')
    .neq('status', 'VOIDED')
    .is('deleted_at', null)
    .gte('date', startDate)
    .lte('date', endDate)

  if (outputError) {
    throw new Error(`取得銷項發票失敗: ${outputError.message}`)
  }

  // 取得進項發票
  const { data: inputInvoices, error: inputError } = await db
    .from('acc_invoices')
    .select('untaxed_amount, tax_amount, total_amount')
    .eq('company_id', companyId)
    .eq('type', 'INPUT')
    .neq('status', 'VOIDED')
    .is('deleted_at', null)
    .gte('date', startDate)
    .lte('date', endDate)

  if (inputError) {
    throw new Error(`取得進項發票失敗: ${inputError.message}`)
  }

  // 計算銷項稅額和收入
  let outputTax = 0
  let revenue = 0
  for (const inv of outputInvoices || []) {
    outputTax += parseFloat(String(inv.tax_amount)) || 0
    revenue += parseFloat(String(inv.untaxed_amount)) || 0
  }

  // 計算進項稅額和費用
  let inputTax = 0
  let expenses = 0
  for (const inv of inputInvoices || []) {
    inputTax += parseFloat(String(inv.tax_amount)) || 0
    expenses += parseFloat(String(inv.untaxed_amount)) || 0
  }

  const netTax = outputTax - inputTax
  const grossProfit = revenue - expenses
  const profitRate = revenue > 0 ? (grossProfit / revenue) * 100 : 0

  // 預估營所稅（簡化計算：毛利 × 20%）
  const estimatedIncomeTax = Math.max(0, grossProfit * 0.2)

  return {
    year,
    output_tax: outputTax,
    input_tax: inputTax,
    net_tax: netTax,
    output_invoices_count: outputInvoices?.length || 0,
    input_invoices_count: inputInvoices?.length || 0,
    revenue,
    expenses,
    profit_rate: profitRate,
    estimated_income_tax: estimatedIncomeTax,
  }
}

// ============================================================================
// FINANCIAL SUMMARY
// ============================================================================

/**
 * 取得財務摘要（用於 AI 分析）
 */
export async function getFinancialSummary(
  db: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<FinancialSummary> {
  // 取得銷項發票（收入）
  const { data: outputInvoices, error: outputError } = await db
    .from('acc_invoices')
    .select('date, untaxed_amount, total_amount, account_code')
    .eq('company_id', companyId)
    .eq('type', 'OUTPUT')
    .neq('status', 'VOIDED')
    .is('deleted_at', null)
    .gte('date', startDate)
    .lte('date', endDate)

  if (outputError) {
    throw new Error(`取得銷項發票失敗: ${outputError.message}`)
  }

  // 取得進項發票（費用）
  const { data: inputInvoices, error: inputError } = await db
    .from('acc_invoices')
    .select('date, untaxed_amount, total_amount, account_code')
    .eq('company_id', companyId)
    .eq('type', 'INPUT')
    .neq('status', 'VOIDED')
    .is('deleted_at', null)
    .gte('date', startDate)
    .lte('date', endDate)

  if (inputError) {
    throw new Error(`取得進項發票失敗: ${inputError.message}`)
  }

  // 計算收入
  let totalRevenue = 0
  const revenueByMonth = new Map<string, number>()
  const revenueByCategory = new Map<string, { amount: number; count: number }>()

  for (const inv of outputInvoices || []) {
    const amount = parseFloat(String(inv.untaxed_amount)) || 0
    totalRevenue += amount

    const month = inv.date.substring(0, 7)
    revenueByMonth.set(month, (revenueByMonth.get(month) || 0) + amount)

    const category = inv.account_code?.substring(0, 2) || '41' // 預設銷貨收入
    const existing = revenueByCategory.get(category) || { amount: 0, count: 0 }
    existing.amount += amount
    existing.count += 1
    revenueByCategory.set(category, existing)
  }

  // 計算費用
  let totalExpenses = 0
  const expenseByCategory = new Map<string, { amount: number; count: number }>()

  for (const inv of inputInvoices || []) {
    const amount = parseFloat(String(inv.untaxed_amount)) || 0
    totalExpenses += amount

    const category = inv.account_code?.substring(0, 2) || '61' // 預設營業費用
    const existing = expenseByCategory.get(category) || { amount: 0, count: 0 }
    existing.amount += amount
    existing.count += 1
    expenseByCategory.set(category, existing)
  }

  // 計算收入趨勢
  const trend: RevenueTrend[] = []
  const sortedMonths = Array.from(revenueByMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  for (let i = 0; i < sortedMonths.length; i++) {
    const [period, revenue] = sortedMonths[i]
    const prevRevenue = i > 0 ? sortedMonths[i - 1][1] : null
    const growthRate = prevRevenue !== null && prevRevenue > 0
      ? ((revenue - prevRevenue) / prevRevenue) * 100
      : null

    trend.push({ period, revenue, growth_rate: growthRate })
  }

  // 收入分類
  const revenueCategoryList: RevenueByCategory[] = Array.from(revenueByCategory.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)

  // 費用分類
  const expenseCategoryList: RevenueByCategory[] = Array.from(expenseByCategory.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)

  // 取得應收帳款
  const receivableAging = await getReceivableAging(db, companyId)

  // 取得應付帳款（未付的進項發票）
  const { data: payableInvoices, error: payableError } = await db
    .from('acc_invoices')
    .select('total_amount, paid_amount')
    .eq('company_id', companyId)
    .eq('type', 'INPUT')
    .in('payment_status', ['UNPAID', 'PARTIAL'])
    .neq('status', 'VOIDED')
    .is('deleted_at', null)

  if (payableError) {
    throw new Error(`取得應付發票失敗: ${payableError.message}`)
  }

  let accountsPayable = 0
  for (const inv of payableInvoices || []) {
    accountsPayable += (parseFloat(String(inv.total_amount)) || 0) - (parseFloat(String(inv.paid_amount)) || 0)
  }

  // 計算毛利和淨利
  const grossProfit = totalRevenue - totalExpenses
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  return {
    period: {
      start_date: startDate,
      end_date: endDate,
    },
    revenue: {
      total: totalRevenue,
      by_category: revenueCategoryList,
      trend,
    },
    expenses: {
      total: totalExpenses,
      by_category: expenseCategoryList,
    },
    profit: {
      gross: grossProfit,
      gross_margin: grossMargin,
      net: grossProfit, // 簡化：不考慮稅務和其他費用
      net_margin: grossMargin,
    },
    cash_position: {
      current_balance: 0, // 需要從銀行帳戶取得
      accounts_receivable: receivableAging.total_outstanding,
      accounts_payable: accountsPayable,
      net_working_capital: receivableAging.total_outstanding - accountsPayable,
    },
    currency: 'TWD',
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * 取得 AI 分析所需的完整資料包
 */
export async function getAIAnalysisDataPackage(
  db: SupabaseClient,
  companyId: string
): Promise<{
  cash_flow: CashFlowHistory
  receivable_aging: ReceivableAging
  tax_summary: TaxSummary
  financial_summary: FinancialSummary
}> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const startOfYear = `${currentYear}-01-01`
  const today = now.toISOString().split('T')[0]

  const [cashFlow, receivableAging, taxSummary, financialSummary] = await Promise.all([
    getCashFlowHistory(db, companyId, 12),
    getReceivableAging(db, companyId),
    getTaxSummary(db, companyId, currentYear),
    getFinancialSummary(db, companyId, startOfYear, today),
  ])

  return {
    cash_flow: cashFlow,
    receivable_aging: receivableAging,
    tax_summary: taxSummary,
    financial_summary: financialSummary,
  }
}
