import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { upsertExchangeRate, SUPPORTED_CURRENCIES, Currency } from '@/lib/dal/exchange-rates'
import { checkPermission } from '@/lib/cache/services'


interface ExchangeRateAPIResponse {
  result: string
  conversion_rates: Record<string, number>
}

async function fetchLatestRatesFromAPI(
  baseCurrency: Currency,
  apiKey: string
): Promise<ExchangeRateAPIResponse | null> {
  try {
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`
    const response = await fetch(url)

    if (!response.ok) {
      console.error(`API request failed: ${response.status}`)
      return null
    }

    const data: ExchangeRateAPIResponse = await response.json()

    if (data.result !== 'success') {
      return null
    }

    return data
  } catch (error) {
    console.error('Failed to fetch rates from API:', error)
    return null
  }
}

async function syncRatesToD1(
  db: ReturnType<typeof getSupabaseClient>,
  baseCurrency: Currency,
  apiKey: string
): Promise<boolean> {
  const apiData = await fetchLatestRatesFromAPI(baseCurrency, apiKey)

  if (!apiData) {
    return false
  }

  try {
    for (const targetCurrency of SUPPORTED_CURRENCIES) {
      if (targetCurrency === baseCurrency) continue

      const rate = apiData.conversion_rates[targetCurrency]
      if (rate) {
        await upsertExchangeRate(db, baseCurrency, targetCurrency, rate)
      }
    }

    return true
  } catch (error) {
    console.error('Failed to sync rates to D1:', error)
    return false
  }
}

/**
 * POST /api/exchange-rates/sync - 手動同步匯率到 D1
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'exchange_rates:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得 API Key (從 process.env 而非 Cloudflare env)
    const apiKey = process.env.EXCHANGE_RATE_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing EXCHANGE_RATE_API_KEY'
        },
        { status: 500 }
      )
    }

    // 解析請求
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const baseCurrency = (body.baseCurrency || 'TWD') as Currency
    const syncAll = body.syncAll || false

    // 如果 syncAll 為 true，同步所有支援的貨幣
    if (syncAll) {
      const results = []
      let successCount = 0

      for (const currency of SUPPORTED_CURRENCIES) {
        console.log(`Syncing ${currency} rates...`)
        const success = await syncRatesToD1(db, currency, apiKey)
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
    const success = await syncRatesToD1(db, baseCurrency, apiKey)

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
  } catch (error: unknown) {
    console.error('Error syncing exchange rates:', error)
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error)
      },
      { status: 500 }
    )
  }
}
