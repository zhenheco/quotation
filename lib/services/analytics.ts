import { createClient } from '@/lib/supabase/server'

// 獲取營收趨勢數據
export async function getRevenueTrend(months: number = 6) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 計算起始日期
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const { data: quotations } = await supabase
    .from('quotations')
    .select('issue_date, total_amount, currency, status')
    .eq('user_id', user.id)
    .gte('issue_date', startDate.toISOString())
    .order('issue_date')

  if (!quotations) return []

  // 按月份分組統計
  const monthlyData = new Map()

  quotations.forEach(quotation => {
    const date = new Date(quotation.issue_date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        month: monthKey,
        revenue: 0,
        count: 0
      })
    }

    const data = monthlyData.get(monthKey)
    // 只統計已接受的報價單
    if (quotation.status === 'accepted') {
      data.revenue += quotation.total_amount
    }
    data.count += 1
  })

  // 填充缺失的月份
  const result = []
  const current = new Date(startDate)

  while (current <= new Date()) {
    const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
    const monthName = current.toLocaleDateString('zh-TW', { year: 'numeric', month: 'short' })

    result.push({
      month: monthName,
      revenue: monthlyData.get(monthKey)?.revenue || 0,
      count: monthlyData.get(monthKey)?.count || 0
    })

    current.setMonth(current.getMonth() + 1)
  }

  return result
}

// 獲取幣別分布數據
export async function getCurrencyDistribution() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: quotations } = await supabase
    .from('quotations')
    .select('currency, total_amount, status')
    .eq('user_id', user.id)
    .eq('status', 'accepted') // 只統計已接受的報價單

  if (!quotations) return []

  // 按幣別分組統計
  const currencyData = new Map()

  quotations.forEach(quotation => {
    if (!currencyData.has(quotation.currency)) {
      currencyData.set(quotation.currency, {
        currency: quotation.currency,
        value: 0,
        count: 0
      })
    }

    const data = currencyData.get(quotation.currency)
    data.value += quotation.total_amount
    data.count += 1
  })

  return Array.from(currencyData.values()).sort((a, b) => b.value - a.value)
}

// 獲取狀態統計數據
export async function getStatusStatistics() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: quotations } = await supabase
    .from('quotations')
    .select('status, total_amount')
    .eq('user_id', user.id)

  if (!quotations) return []

  // 按狀態分組統計
  const statusData = new Map()
  const statuses = ['draft', 'sent', 'accepted', 'rejected']

  // 初始化所有狀態
  statuses.forEach(status => {
    statusData.set(status, {
      status,
      count: 0,
      value: 0
    })
  })

  quotations.forEach(quotation => {
    const data = statusData.get(quotation.status)
    if (data) {
      data.count += 1
      data.value += quotation.total_amount
    }
  })

  return statuses.map(status => statusData.get(status))
}

// 獲取儀表板統計摘要
export async function getDashboardSummary() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 獲取當月數據
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const { data: currentMonthQuotations } = await supabase
    .from('quotations')
    .select('total_amount, status')
    .eq('user_id', user.id)
    .gte('issue_date', currentMonth.toISOString())

  // 獲取上月數據（用於比較）
  const lastMonth = new Date(currentMonth)
  lastMonth.setMonth(lastMonth.getMonth() - 1)

  const { data: lastMonthQuotations } = await supabase
    .from('quotations')
    .select('total_amount, status')
    .eq('user_id', user.id)
    .gte('issue_date', lastMonth.toISOString())
    .lt('issue_date', currentMonth.toISOString())

  // 計算統計數據
  const currentRevenue = currentMonthQuotations
    ?.filter(q => q.status === 'accepted')
    .reduce((sum, q) => sum + q.total_amount, 0) || 0

  const lastRevenue = lastMonthQuotations
    ?.filter(q => q.status === 'accepted')
    .reduce((sum, q) => sum + q.total_amount, 0) || 0

  const revenueGrowth = lastRevenue > 0
    ? ((currentRevenue - lastRevenue) / lastRevenue * 100).toFixed(1)
    : '0'

  const currentCount = currentMonthQuotations?.length || 0
  const lastCount = lastMonthQuotations?.length || 0

  const countGrowth = lastCount > 0
    ? ((currentCount - lastCount) / lastCount * 100).toFixed(1)
    : '0'

  // 計算轉換率
  const acceptedCount = currentMonthQuotations?.filter(q => q.status === 'accepted').length || 0
  const sentCount = currentMonthQuotations?.filter(q => q.status === 'sent' || q.status === 'accepted' || q.status === 'rejected').length || 0
  const conversionRate = sentCount > 0
    ? (acceptedCount / sentCount * 100).toFixed(1)
    : '0'

  return {
    currentMonthRevenue: currentRevenue,
    revenueGrowth: parseFloat(revenueGrowth),
    currentMonthCount: currentCount,
    countGrowth: parseFloat(countGrowth),
    conversionRate: parseFloat(conversionRate),
    acceptedCount,
    pendingCount: currentMonthQuotations?.filter(q => q.status === 'sent').length || 0,
    draftCount: currentMonthQuotations?.filter(q => q.status === 'draft').length || 0
  }
}