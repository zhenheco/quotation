import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/currency-distribution
 *
 * 取得幣別分布數據
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
      .select('currency, total_amount, status')
      .eq('user_id', user.id)
      .eq('status', 'accepted') // 只統計已接受的報價單

    if (error) {
      throw error
    }

    // 按幣別分組統計
    const currencyData = new Map()

    quotations?.forEach((quotation) => {
      if (!currencyData.has(quotation.currency)) {
        currencyData.set(quotation.currency, {
          currency: quotation.currency,
          value: 0,
          count: 0,
        })
      }

      const data = currencyData.get(quotation.currency)
      data.value += quotation.total_amount
      data.count += 1
    })

    const result = Array.from(currencyData.values()).sort((a, b) => b.value - a.value)

    return NextResponse.json({ data: result })
  } catch (error: any) {
    console.error('Failed to fetch currency distribution:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
