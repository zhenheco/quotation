import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/revenue-trend?months=6
 *
 * 取得營收趨勢數據（按月份統計）
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 從 query parameters 取得月份數量
    const searchParams = request.nextUrl.searchParams
    const months = parseInt(searchParams.get('months') || '6')

    // 計算起始日期
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    const { data: quotations, error } = await supabase
      .from('quotations')
      .select('issue_date, total_amount, status')
      .eq('user_id', user.id)
      .gte('issue_date', startDate.toISOString())
      .order('issue_date')

    if (error) {
      throw error
    }

    // 按月份分組統計
    const monthlyData = new Map()

    quotations?.forEach((quotation) => {
      const date = new Date(quotation.issue_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          revenue: 0,
          count: 0,
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
        count: monthlyData.get(monthKey)?.count || 0,
      })

      current.setMonth(current.getMonth() + 1)
    }

    return NextResponse.json({ data: result })
  } catch (error: unknown) {
    console.error('Failed to fetch revenue trend:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
