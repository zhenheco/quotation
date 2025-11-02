import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/dashboard-summary
 *
 * 取得儀表板統計摘要
 * 包含本月營收、成長率、轉換率等關鍵指標
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const currentRevenue =
      currentMonthQuotations
        ?.filter((q) => q.status === 'signed')
        .reduce((sum, q) => sum + q.total_amount, 0) || 0

    const lastRevenue =
      lastMonthQuotations
        ?.filter((q) => q.status === 'signed')
        .reduce((sum, q) => sum + q.total_amount, 0) || 0

    const revenueGrowth =
      lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0

    const currentCount = currentMonthQuotations?.length || 0
    const lastCount = lastMonthQuotations?.length || 0

    const countGrowth = lastCount > 0 ? ((currentCount - lastCount) / lastCount) * 100 : 0

    // 計算轉換率
    const acceptedCount =
      currentMonthQuotations?.filter((q) => q.status === 'signed').length || 0
    const sentCount =
      currentMonthQuotations?.filter(
        (q) => q.status === 'sent' || q.status === 'signed'
      ).length || 0
    const conversionRate = sentCount > 0 ? (acceptedCount / sentCount) * 100 : 0

    const result = {
      currentMonthRevenue: currentRevenue,
      revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
      currentMonthCount: currentCount,
      countGrowth: parseFloat(countGrowth.toFixed(1)),
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      acceptedCount,
      pendingCount: currentMonthQuotations?.filter((q) => q.status === 'sent').length || 0,
      draftCount: currentMonthQuotations?.filter((q) => q.status === 'draft').length || 0,
    }

    return NextResponse.json({ data: result })
  } catch (error: unknown) {
    console.error('Failed to fetch dashboard summary:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
