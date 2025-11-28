/**
 * 匯率資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

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
  db: SupabaseClient,
  baseCurrency: string,
  targetCurrency: string
): Promise<ExchangeRate | null> {
  const { data, error } = await db
    .from('exchange_rates')
    .select('*')
    .eq('base_currency', baseCurrency)
    .eq('target_currency', targetCurrency)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get exchange rate: ${error.message}`)
  }

  return data
}

export async function getAllExchangeRates(db: SupabaseClient): Promise<ExchangeRate[]> {
  const { data, error } = await db
    .from('exchange_rates')
    .select('*')
    .order('base_currency')
    .order('target_currency')

  if (error) {
    throw new Error(`Failed to get exchange rates: ${error.message}`)
  }

  return data || []
}

export async function getExchangeRatesByBase(
  db: SupabaseClient,
  baseCurrency: string
): Promise<ExchangeRate[]> {
  const { data, error } = await db
    .from('exchange_rates')
    .select('*')
    .eq('base_currency', baseCurrency)
    .order('target_currency')

  if (error) {
    throw new Error(`Failed to get exchange rates: ${error.message}`)
  }

  return data || []
}

export async function upsertExchangeRate(
  db: SupabaseClient,
  baseCurrency: string,
  targetCurrency: string,
  rate: number
): Promise<void> {
  const { error } = await db
    .from('exchange_rates')
    .upsert(
      {
        base_currency: baseCurrency,
        target_currency: targetCurrency,
        rate,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'base_currency,target_currency' }
    )

  if (error) {
    throw new Error(`Failed to upsert exchange rate: ${error.message}`)
  }
}

export async function batchUpsertExchangeRates(
  db: SupabaseClient,
  rates: Array<{ baseCurrency: string; targetCurrency: string; rate: number }>
): Promise<void> {
  const now = new Date().toISOString()
  const records = rates.map(({ baseCurrency, targetCurrency, rate }) => ({
    base_currency: baseCurrency,
    target_currency: targetCurrency,
    rate,
    updated_at: now
  }))

  const { error } = await db
    .from('exchange_rates')
    .upsert(records, { onConflict: 'base_currency,target_currency' })

  if (error) {
    throw new Error(`Failed to batch upsert exchange rates: ${error.message}`)
  }
}
