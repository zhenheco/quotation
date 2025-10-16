/**
 * 匯率 API 路由
 * GET /api/exchange-rates - 獲取最新匯率
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getExchangeRates, Currency } from '@/lib/services/exchange-rate'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const baseCurrency = (searchParams.get('base') || 'USD') as Currency

  try {
    const supabase = await createClient()
    const rates = await getExchangeRates(supabase, baseCurrency)

    return NextResponse.json({
      success: true,
      base_currency: baseCurrency,
      rates,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ 獲取匯率失敗:', error)

    return NextResponse.json(
      {
        success: false,
        error: '獲取匯率失敗'
      },
      { status: 500 }
    )
  }
}
