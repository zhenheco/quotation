import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getExchangeRatesByBase, Currency } from '@/lib/dal/exchange-rates'
import { checkPermission } from '@/lib/cache/services'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
export const runtime = 'edge';


/**
 * GET /api/exchange-rates - 取得匯率資料
 */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext()

  try {
    const { searchParams } = new URL(request.url)
    const baseCurrency = (searchParams.get('base') || 'TWD') as Currency

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'exchange_rates:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 從資料庫取得匯率
    const ratesArray = await getExchangeRatesByBase(db, baseCurrency)

    // 轉換為物件格式
    const rates: Record<string, number> = { [baseCurrency]: 1 }
    for (const rate of ratesArray) {
      rates[rate.target_currency] = rate.rate
    }

    return NextResponse.json({
      success: true,
      base_currency: baseCurrency,
      rates,
      timestamp: new Date().toISOString()
    })
  } catch (error: unknown) {
    console.error('Error fetching exchange rates:', error)
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error)
      },
      { status: 500 }
    )
  }
}
