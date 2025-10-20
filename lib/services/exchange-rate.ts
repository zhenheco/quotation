/**
 * 匯率服務模組
 *
 * 功能:
 * 1. 從 ExchangeRate-API 獲取最新匯率
 * 2. 快取匯率資料 (24 小時)
 * 3. 同步匯率到 Supabase 資料庫
 * 4. 提供貨幣轉換計算
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// 支援的貨幣列表
export const SUPPORTED_CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY'] as const
export type Currency = typeof SUPPORTED_CURRENCIES[number]

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

// 匯率資料類型
export interface ExchangeRate {
  from_currency: Currency
  to_currency: Currency
  rate: number
  date: string
  source: string
}

// 快取設定（保留供未來使用）
// const CACHE_KEY = 'exchange_rates_cache'
// const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 小時

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

    const data: ExchangeRateAPIResponse = await response.json()

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
 * 將匯率資料同步到 Supabase 資料庫
 * @param supabase - Supabase 客戶端實例
 * @param baseCurrency - 基準貨幣
 */
export async function syncRatesToDatabase(
  supabase: SupabaseClient,
  baseCurrency: Currency = 'USD'
): Promise<boolean> {
  const apiData = await fetchLatestRates(baseCurrency)

  if (!apiData) {
    return false
  }

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // 準備要插入的匯率資料
  const exchangeRates: Omit<ExchangeRate, 'id'>[] = SUPPORTED_CURRENCIES
    .filter(currency => currency !== baseCurrency)
    .map(currency => ({
      from_currency: baseCurrency,
      to_currency: currency,
      rate: apiData.conversion_rates[currency] || 0,
      date: today,
      source: 'exchangerate-api.com'
    }))

  try {
    // 使用 upsert 避免重複插入
    const { error } = await supabase
      .from('exchange_rates')
      .upsert(exchangeRates, {
        onConflict: 'from_currency,to_currency,date',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('❌ 同步匯率到資料庫失敗:', error)
      return false
    }

    console.log(`✅ 成功同步 ${exchangeRates.length} 筆匯率 (${baseCurrency} 基準)`)
    return true
  } catch (error) {
    console.error('❌ 資料庫操作失敗:', error)
    return false
  }
}

/**
 * 從資料庫獲取最新匯率
 * @param supabase - Supabase 客戶端實例
 * @param baseCurrency - 基準貨幣
 */
export async function getLatestRatesFromDB(
  supabase: SupabaseClient,
  baseCurrency: Currency = 'USD'
): Promise<Record<Currency, number>> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('to_currency, rate')
    .eq('from_currency', baseCurrency)
    .order('date', { ascending: false })
    .limit(SUPPORTED_CURRENCIES.length)

  if (error || !data) {
    console.error('❌ 從資料庫獲取匯率失敗:', error)
    return {} as Record<Currency, number>
  }

  // 轉換為 Record 格式
  const rates: Partial<Record<Currency, number>> = {
    [baseCurrency]: 1.0 // 基準貨幣為 1
  }

  data.forEach(item => {
    rates[item.to_currency as Currency] = item.rate
  })

  return rates as Record<Currency, number>
}

/**
 * 獲取指定日期的匯率 (從資料庫)
 * @param supabase - Supabase 客戶端實例
 * @param date - 日期 (YYYY-MM-DD 格式)
 * @param baseCurrency - 基準貨幣
 */
export async function getRatesByDate(
  supabase: SupabaseClient,
  date: string,
  baseCurrency: Currency = 'USD'
): Promise<Record<Currency, number> | null> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('to_currency, rate')
    .eq('from_currency', baseCurrency)
    .eq('date', date)

  if (error || !data || data.length === 0) {
    console.warn(`⚠️  未找到 ${date} 的匯率資料`)
    return null
  }

  const rates: Partial<Record<Currency, number>> = {
    [baseCurrency]: 1.0
  }

  data.forEach(item => {
    rates[item.to_currency as Currency] = item.rate
  })

  return rates as Record<Currency, number>
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
 * 格式化貨幣顯示
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const formatter = new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return formatter.format(amount)
}

/**
 * 檢查快取是否過期（保留供未來使用）
 */
// function isCacheExpired(timestamp: number): boolean {
//   return Date.now() - timestamp > CACHE_DURATION
// }

/**
 * 獲取匯率 (優先使用快取)
 * @param supabase - Supabase 客戶端實例
 * @param baseCurrency - 基準貨幣
 */
export async function getExchangeRates(
  supabase: SupabaseClient,
  baseCurrency: Currency = 'USD'
): Promise<Record<Currency, number>> {
  // 先嘗試從資料庫獲取
  const dbRates = await getLatestRatesFromDB(supabase, baseCurrency)

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
  await syncRatesToDatabase(supabase, baseCurrency)

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
