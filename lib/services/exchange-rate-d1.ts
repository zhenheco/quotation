/**
 * 匯率服務模組 - D1 版本
 *
 * 功能:
 * 1. 從 ExchangeRate-API 獲取最新匯率
 * 2. 同步匯率到 D1 資料庫
 * 3. 提供貨幣轉換計算
 */

import { D1Client } from '@/lib/db/d1-client'
import {
  batchUpsertExchangeRates,
  getExchangeRatesByBase,
  SUPPORTED_CURRENCIES,
  type Currency,
} from '@/lib/dal/exchange-rates'

export { SUPPORTED_CURRENCIES, type Currency }

// API 回應類型
interface ExchangeRateAPIResponse {
  result: string
  documentation: string
  terms_of_use: string
  time_last_update_unix: number
  time_last_update_utc: string
  time_next_update_unix: number
  time_next_update_utc: string
  base_code: string
  conversion_rates: Record<string, number>
}

/**
 * 從 ExchangeRate-API 獲取最新匯率
 */
export async function fetchLatestRates(baseCurrency: Currency = 'USD'): Promise<ExchangeRateAPIResponse | null> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY || process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY

  if (!apiKey) {
    console.error('❌ EXCHANGE_RATE_API_KEY 未設定')
    return null
  }

  try {
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`
    const response = await fetch(url, {
      next: { revalidate: 3600 } // Next.js 快取 1 小時
    })

    if (!response.ok) {
      throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as ExchangeRateAPIResponse

    if (data.result !== 'success') {
      throw new Error('API 回應狀態異常')
    }

    return data
  } catch (error) {
    // 不直接輸出 error 物件，避免洩漏 API Key
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ 獲取匯率失敗:', { baseCurrency, error: errorMessage })
    return null
  }
}

/**
 * 將匯率資料同步到 D1 資料庫
 * @param db - D1Client 實例
 * @param baseCurrency - 基準貨幣
 */
export async function syncRatesToDatabase(
  db: D1Client,
  baseCurrency: Currency = 'USD'
): Promise<boolean> {
  const apiData = await fetchLatestRates(baseCurrency)

  if (!apiData) {
    return false
  }

  // 準備要插入的匯率資料
  const exchangeRates = SUPPORTED_CURRENCIES
    .filter(currency => currency !== baseCurrency)
    .map(currency => ({
      baseCurrency,
      targetCurrency: currency,
      rate: apiData.conversion_rates[currency] || 0,
    }))

  try {
    await batchUpsertExchangeRates(db, exchangeRates)

    console.log(`✅ 成功同步 ${exchangeRates.length} 筆匯率 (${baseCurrency} 基準)`)
    return true
  } catch (error) {
    console.error('❌ 資料庫操作失敗:', error)
    return false
  }
}

/**
 * 從資料庫獲取最新匯率
 * @param db - D1Client 實例
 * @param baseCurrency - 基準貨幣
 */
export async function getLatestRatesFromDB(
  db: D1Client,
  baseCurrency: Currency = 'USD'
): Promise<Record<Currency, number>> {
  try {
    const data = await getExchangeRatesByBase(db, baseCurrency)

    if (!data || data.length === 0) {
      console.error('❌ 從資料庫獲取匯率失敗: 無資料')
      return {} as Record<Currency, number>
    }

    // 轉換為 Record 格式
    const rates: Partial<Record<Currency, number>> = {
      [baseCurrency]: 1.0 // 基準貨幣為 1
    }

    data.forEach(item => {
      rates[item.target_currency as Currency] = item.rate
    })

    return rates as Record<Currency, number>
  } catch (error) {
    console.error('❌ 從資料庫獲取匯率失敗:', error)
    return {} as Record<Currency, number>
  }
}

/**
 * 貨幣轉換計算
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates: Record<Currency, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount
  }

  // 如果有直接匯率
  if (rates[toCurrency]) {
    // 先轉換為 USD (基準貨幣)
    const usdAmount = fromCurrency === 'USD' ? amount : amount / rates[fromCurrency]
    // 再轉換為目標貨幣
    return toCurrency === 'USD' ? usdAmount : usdAmount * rates[toCurrency]
  }

  console.warn(`⚠️  無法轉換 ${fromCurrency} -> ${toCurrency}`)
  return amount
}

/**
 * 獲取匯率 (優先使用資料庫)
 * @param db - D1Client 實例
 * @param baseCurrency - 基準貨幣
 */
export async function getExchangeRates(
  db: D1Client,
  baseCurrency: Currency = 'USD'
): Promise<Record<Currency, number>> {
  // 先嘗試從資料庫獲取
  const dbRates = await getLatestRatesFromDB(db, baseCurrency)

  if (Object.keys(dbRates).length > 0) {
    return dbRates
  }

  // 如果資料庫沒有資料，從 API 獲取並同步
  console.log('⚠️  資料庫無匯率資料，從 API 獲取...')
  const apiData = await fetchLatestRates(baseCurrency)

  if (!apiData) {
    // 返回預設匯率 (全部為 1)
    return SUPPORTED_CURRENCIES.reduce((acc, curr) => {
      acc[curr] = 1.0
      return acc
    }, {} as Record<Currency, number>)
  }

  // 同步到資料庫
  await syncRatesToDatabase(db, baseCurrency)

  // 構建回應
  const rates: Partial<Record<Currency, number>> = {
    [baseCurrency]: 1.0
  }

  SUPPORTED_CURRENCIES.forEach(currency => {
    if (currency !== baseCurrency) {
      rates[currency] = apiData.conversion_rates[currency] || 1.0
    }
  })

  return rates as Record<Currency, number>
}
