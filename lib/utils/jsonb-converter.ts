export type JsonbField = { zh: string; en: string }

export function toJsonbField(
  value: string | JsonbField | undefined | null,
  defaultLang: 'zh' | 'en' = 'zh'
): JsonbField | undefined {
  if (!value) return undefined

  if (typeof value === 'string') {
    return defaultLang === 'zh'
      ? { zh: value, en: '' }
      : { zh: '', en: value }
  }

  return value
}

export function fromJsonbField(
  value: JsonbField | string | undefined | null,
  lang: 'zh' | 'en' = 'zh'
): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[lang] || value.zh || value.en || ''
}

export function ensureJsonbField(
  value: unknown,
  defaultLang: 'zh' | 'en' = 'zh'
): JsonbField | undefined {
  if (!value) return undefined

  if (typeof value === 'string') {
    return defaultLang === 'zh'
      ? { zh: value, en: '' }
      : { zh: '', en: value }
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'zh' in value &&
    'en' in value
  ) {
    const obj = value as JsonbField
    return {
      zh: String(obj.zh || ''),
      en: String(obj.en || '')
    }
  }

  return undefined
}
