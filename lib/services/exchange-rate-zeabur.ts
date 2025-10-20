/**
 * 匯率服務模組 (Zeabur PostgreSQL 版本)
 *
 * 功能:
 * 1. 從 ExchangeRate-API 獲取最新匯率
 * 2. 快取匯率資料 (24 小時)
 * 3. 同步匯率到 Zeabur PostgreSQL 資料庫
 * 4. 提供貨幣轉換計算
 */

import * as zeaburDb from '@/lib/db/zeabur'

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
interface ExchangeRateData {
  from_currency: string
  to_currency: string
  rate: number
  date: string
  source: string
}

/**
 * 從 ExchangeRate-API 獲取最新匯率
 * @param baseCurrency - 基準貨幣 (預設 TWD)
 * @returns 匯率資料或 null
 */
export async function fetchLatestRates(
  baseCurrency: Currency = 'TWD'
): Promise<ExchangeRateAPIResponse | null> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY

  if (!apiKey) {
    console.error('❌ 缺少 EXCHANGE_RATE_API_KEY 環境變數')
    return null
  }

  try {
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`
    console.log('📡 正在從 ExchangeRate-API 獲取匯率...', { baseCurrency })

    const response = await fetch(url, {
      next: { revalidate: 86400 } // 快取 24 小時
    })

    if (!response.ok) {
      console.error(`❌ API 請求失敗: ${response.status} ${response.statusText}`)
      return null
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
 * 將匯率資料同步到 Zeabur PostgreSQL 資料庫
 * @param baseCurrency - 基準貨幣 (預設 TWD)
 */
export async function syncRatesToDatabase(baseCurrency: Currency = 'TWD'): Promise<boolean> {
  const apiData = await fetchLatestRates(baseCurrency)

  if (!apiData) {
    return false
  }

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  try {
    console.log('💾 正在同步匯率到 Zeabur PostgreSQL...')

    // 準備要插入的資料
    const rates: ExchangeRateData[] = SUPPORTED_CURRENCIES.filter(
      (currency) => currency !== baseCurrency
    ).map((currency) => ({
      from_currency: baseCurrency,
      to_currency: currency,
      rate: apiData.conversion_rates[currency],
      date: today,
      source: 'ExchangeRate-API'
    }))

    // 使用 PostgreSQL 的 ON CONFLICT 來處理重複
    for (const rate of rates) {
      await zeaburDb.query(
        `
        INSERT INTO exchange_rates (from_currency, to_currency, rate, date, source)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (from_currency, to_currency, date)
        DO UPDATE SET
          rate = EXCLUDED.rate,
          source = EXCLUDED.source
        `,
        [rate.from_currency, rate.to_currency, rate.rate, rate.date, rate.source]
      )
    }

    console.log(`✅ 成功同步 ${rates.length} 筆匯率資料到資料庫`)
    return true
  } catch (error) {
    console.error('❌ 同步匯率到資料庫失敗:', error)
    return false
  }
}

/**
 * 從 Zeabur PostgreSQL 獲取最新匯率
 * @param baseCurrency - 基準貨幣 (預設 TWD)
 * @returns 匯率對照表
 */
export async function getLatestRatesFromDB(
  baseCurrency: Currency = 'TWD'
): Promise<Record<Currency, number>> {
  try {
    const result = await zeaburDb.query(
      `
      SELECT to_currency, rate
      FROM exchange_rates
      WHERE from_currency = $1
      AND date = (
        SELECT MAX(date)
        FROM exchange_rates
        WHERE from_currency = $1
      )
      `,
      [baseCurrency]
    )

    const rates: Record<string, number> = { [baseCurrency]: 1 }

    for (const row of result.rows) {
      rates[row.to_currency] = parseFloat(row.rate)
    }

    return rates as Record<Currency, number>
  } catch (error) {
    console.error('❌ 從資料庫獲取匯率失敗:', error)
    return { [baseCurrency]: 1 } as Record<Currency, number>
  }
}

/**
 * 獲取匯率(優先從資料庫,失敗則從 API)
 * @param baseCurrency - 基準貨幣 (預設 TWD)
 * @returns 匯率對照表
 */
export async function getExchangeRates(
  baseCurrency: Currency = 'TWD'
): Promise<Record<Currency, number>> {
  // 先嘗試從資料庫獲取
  const dbRates = await getLatestRatesFromDB(baseCurrency)

  // 如果資料庫有完整資料,直接返回
  if (SUPPORTED_CURRENCIES.every((currency) => currency in dbRates)) {
    console.log('✅ 從資料庫獲取匯率成功')
    return dbRates
  }

  console.log('⚠️  資料庫中無匯率資料,嘗試從 API 獲取並同步...')

  // 否則從 API 獲取並同步
  const synced = await syncRatesToDatabase(baseCurrency)

  if (synced) {
    return getLatestRatesFromDB(baseCurrency)
  }

  // 如果同步失敗,返回基礎匯率
  console.error('❌ 無法獲取匯率資料')
  return { [baseCurrency]: 1 } as Record<Currency, number>
}

/**
 * 貨幣轉換
 * @param amount - 金額
 * @param fromCurrency - 來源貨幣
 * @param toCurrency - 目標貨幣
 * @param rates - 匯率對照表(可選,若不提供則自動獲取)
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates?: Record<Currency, number>
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount
  }

  const exchangeRates = rates || (await getExchangeRates(fromCurrency))

  const toRate = exchangeRates[toCurrency]

  if (!toRate) {
    throw new Error(`無法找到 ${fromCurrency} 到 ${toCurrency} 的匯率`)
  }

  return amount * toRate
}
