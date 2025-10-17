/**
 * 匯率同步 API
 * POST /api/exchange-rates/sync - 手動同步匯率到 Zeabur PostgreSQL
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncRatesToDatabase, SUPPORTED_CURRENCIES, Currency } from '@/lib/services/exchange-rate-zeabur'
import { syncRateLimiter } from '@/lib/middleware/rate-limiter'

export async function POST(request: NextRequest) {
  return syncRateLimiter(request, async () => {
    try {
    const body = await request.json().catch(() => ({}))
    const baseCurrency = (body.baseCurrency || 'TWD') as Currency
    const syncAll = body.syncAll || false

    // 如果 syncAll 為 true，同步所有支援的貨幣
    if (syncAll) {
      const results = []
      let successCount = 0

      for (const currency of SUPPORTED_CURRENCIES) {
        console.log(`📊 同步 ${currency} 匯率...`)
        const success = await syncRatesToDatabase(currency)
        results.push({
          currency,
          success,
          timestamp: new Date().toISOString()
        })
        if (success) successCount++
      }

      return NextResponse.json({
        success: successCount === SUPPORTED_CURRENCIES.length,
        message: `成功同步 ${successCount}/${SUPPORTED_CURRENCIES.length} 個貨幣`,
        results
      })
    }

    // 否則只同步指定的基準貨幣
    const success = await syncRatesToDatabase(baseCurrency)

    if (success) {
      return NextResponse.json({
        success: true,
        message: `匯率同步成功 (基準貨幣: ${baseCurrency})`,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: '匯率同步失敗'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ 同步匯率失敗:', error)

    return NextResponse.json(
      {
        success: false,
        error: '同步匯率失敗'
      },
      { status: 500 }
    )
  }
  })
}
