/**
 * 匯率資料存取層 (DAL)
 */

import { D1Client } from '@/lib/db/d1-client'

export interface ExchangeRate {
  id: string
  base_currency: string
  target_currency: string
  rate: number
  updated_at: string
}

export const SUPPORTED_CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY'] as const
export type Currency = typeof SUPPORTED_CURRENCIES[number]

export async function getExchangeRate(
  db: D1Client,
  baseCurrency: string,
  targetCurrency: string
): Promise<ExchangeRate | null> {
  return await db.queryOne<ExchangeRate>(
    'SELECT * FROM exchange_rates WHERE base_currency = ? AND target_currency = ?',
    [baseCurrency, targetCurrency]
  )
}

export async function getAllExchangeRates(db: D1Client): Promise<ExchangeRate[]> {
  return await db.query<ExchangeRate>('SELECT * FROM exchange_rates ORDER BY base_currency, target_currency')
}

export async function getExchangeRatesByBase(
  db: D1Client,
  baseCurrency: string
): Promise<ExchangeRate[]> {
  return await db.query<ExchangeRate>(
    'SELECT * FROM exchange_rates WHERE base_currency = ? ORDER BY target_currency',
    [baseCurrency]
  )
}

export async function upsertExchangeRate(
  db: D1Client,
  baseCurrency: string,
  targetCurrency: string,
  rate: number
): Promise<void> {
  const existing = await getExchangeRate(db, baseCurrency, targetCurrency)
  const now = new Date().toISOString()

  if (existing) {
    await db.execute(
      'UPDATE exchange_rates SET rate = ?, updated_at = ? WHERE base_currency = ? AND target_currency = ?',
      [rate, now, baseCurrency, targetCurrency]
    )
  } else {
    const id = crypto.randomUUID()
    await db.execute(
      'INSERT INTO exchange_rates (id, base_currency, target_currency, rate, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, baseCurrency, targetCurrency, rate, now]
    )
  }
}

export async function batchUpsertExchangeRates(
  db: D1Client,
  rates: Array<{ baseCurrency: string; targetCurrency: string; rate: number }>
): Promise<void> {
  // const _now = new Date().toISOString()

  for (const { baseCurrency, targetCurrency, rate } of rates) {
    await upsertExchangeRate(db, baseCurrency, targetCurrency, rate)
  }
}
