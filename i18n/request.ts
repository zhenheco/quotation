import { getRequestConfig } from 'next-intl/server'

export const locales = ['en', 'zh'] as const
export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale

  // Ensure that a valid locale is used
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en'
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  }
})
