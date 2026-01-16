/**
 * 產品分類標籤多語系對照表
 * 用於將儲存的分類值轉換為使用者介面顯示的標籤
 */

export const CATEGORY_LABELS: Record<string, { zh: string; en: string }> = {
  service: { zh: '服務', en: 'Service' },
  product: { zh: '產品', en: 'Product' },
  software: { zh: '軟體', en: 'Software' },
  hardware: { zh: '硬體', en: 'Hardware' },
  consulting: { zh: '諮詢', en: 'Consulting' },
  maintenance: { zh: '維護', en: 'Maintenance' },
  design: { zh: '設計', en: 'Design' },
  training: { zh: '培訓', en: 'Training' },
}

/**
 * 取得分類的顯示標籤
 * @param category - 分類值（如 'service'）
 * @param locale - 語系（'zh' 或 'en'）
 * @returns 分類的顯示標籤，若找不到則返回原始值
 */
export function getCategoryLabel(
  category: string | null | undefined,
  locale: 'zh' | 'en' = 'zh'
): string {
  if (!category) return ''
  return CATEGORY_LABELS[category]?.[locale] || category
}

/**
 * 取得所有預設分類選項（用於下拉選單）
 * @param locale - 語系（'zh' 或 'en'）
 * @returns 分類選項陣列 [{ value, label }]
 */
export function getCategoryOptions(locale: 'zh' | 'en' = 'zh') {
  return Object.entries(CATEGORY_LABELS).map(([value, labels]) => ({
    value,
    label: labels[locale],
  }))
}
