/**
 * 匯率 API 路由
 * GET /api/exchange-rates - 從 Zeabur PostgreSQL 獲取最新匯率
 */

import { NextRequest, NextResponse } from 'next/server'
import { getExchangeRates, Currency } from '@/lib/services/exchange-rate-zeabur'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const baseCurrency = (searchParams.get('base') || 'TWD') as Currency

  try {
    const rates = await getExchangeRates(baseCurrency)

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
