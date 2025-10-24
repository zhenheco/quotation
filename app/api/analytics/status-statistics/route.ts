import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/status-statistics
 *
 * 取得報價單狀態統計數據
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

    const { data: quotations, error } = await supabase
      .from('quotations')
      .select('status, total_amount')
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    // 按狀態分組統計
    const statusData = new Map()
    const statuses = ['draft', 'sent', 'accepted', 'rejected']

    // 初始化所有狀態
    statuses.forEach((status) => {
      statusData.set(status, {
        status,
        count: 0,
        value: 0,
      })
    })

    quotations?.forEach((quotation) => {
      const data = statusData.get(quotation.status)
      if (data) {
        data.count += 1
        data.value += quotation.total_amount
      }
    })

    const result = statuses.map((status) => statusData.get(status))

    return NextResponse.json({ data: result })
  } catch (error: any) {
    console.error('Failed to fetch status statistics:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
