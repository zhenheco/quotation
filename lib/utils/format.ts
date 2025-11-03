import type { Currency } from '../services/exchange-rate'

export function formatCurrency(
  amount: number,
  currency: Currency,
  locale: 'zh' | 'en' = 'zh'
): string {
  const fractionDigits = locale === 'zh' ? 0 : 2

  const formatter = new Intl.NumberFormat(locale === 'zh' ? 'zh-TW' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })

  return formatter.format(amount)
}

export function formatPrice(
  amount: number,
  locale: 'zh' | 'en' = 'zh'
): string {
  const fractionDigits = locale === 'zh' ? 0 : 2

  return amount.toLocaleString(locale === 'zh' ? 'zh-TW' : 'en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}
