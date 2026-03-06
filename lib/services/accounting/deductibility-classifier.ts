/**
 * 進項發票扣抵性自動分類器
 *
 * 根據台灣營業稅法第 19 條，以下進項不得扣抵：
 * 1. 交際應酬用之貨物或勞務
 * 2. 購買自用乘人小汽車
 * 3. 酬勞員工個人之貨物或勞務
 * 4. 非供本業及附屬業務使用之貨物或勞務
 *
 * 本分類器使用規則式比對，對交易對象名稱和摘要進行關鍵字匹配，
 * 產生「扣抵建議」供用戶參考。
 */

export type DeductibilitySuggestion = 'deductible' | 'non_deductible' | 'review'

export interface DeductibilityResult {
  suggestion: DeductibilitySuggestion
  reason: string
  category: string
}

interface ClassifierRule {
  keywords: string[]
  suggestion: DeductibilitySuggestion
  reason: string
  category: string
}

/**
 * 分類規則（順序重要：先匹配先採用）
 */
const RULES: ClassifierRule[] = [
  // ========== 建議不可扣抵 ==========
  {
    keywords: ['KTV', '卡拉OK', '酒吧', '夜店', '酒店', '招待所'],
    suggestion: 'non_deductible',
    reason: '疑似交際應酬',
    category: '交際應酬',
  },
  {
    keywords: ['禮品', '花店', '花藝', '蛋糕店', '伴手禮', '禮盒'],
    suggestion: 'non_deductible',
    reason: '疑似交際應酬贈禮',
    category: '交際應酬',
  },

  // ========== 需要確認 ==========
  {
    keywords: ['加油站', '中油', '台塑石油', '全國加油站', '台亞石油', '山隆通運'],
    suggestion: 'review',
    reason: '加油費 — 公司車可扣抵，自用車不可',
    category: '車輛費用',
  },
  {
    keywords: ['停車場', '停車', 'ETC', '遠通電收', '高速公路'],
    suggestion: 'review',
    reason: '停車/通行費 — 公司車可扣抵，自用車不可',
    category: '車輛費用',
  },
  {
    keywords: ['洗車', '汽車美容', '保養', '輪胎', '汽車維修'],
    suggestion: 'review',
    reason: '車輛維護 — 公司車可扣抵，自用車不可',
    category: '車輛費用',
  },
  {
    keywords: ['餐廳', '小吃', '火鍋', '燒烤', '壽司', '拉麵', '便當', '鐵板燒', '牛排'],
    suggestion: 'review',
    reason: '餐飲費 — 業務用餐可扣抵，交際應酬不可',
    category: '餐飲',
  },
  {
    keywords: ['咖啡', '茶館', '飲料'],
    suggestion: 'review',
    reason: '飲品費 — 業務用可扣抵，交際應酬不可',
    category: '餐飲',
  },
  {
    keywords: ['旅行社', '旅遊', '機票', '飯店', '民宿', '旅館'],
    suggestion: 'review',
    reason: '差旅費 — 出差可扣抵，員工旅遊福利不可',
    category: '差旅',
  },
  {
    keywords: ['健身', '瑜珈', 'SPA', '按摩'],
    suggestion: 'review',
    reason: '疑似員工福利',
    category: '員工福利',
  },
]

/**
 * 對單筆發票進行扣抵性分類
 */
export function classifyDeductibility(
  counterpartyName: string,
  description?: string,
): DeductibilityResult {
  const text = `${counterpartyName || ''} ${description || ''}`.toLowerCase()

  for (const rule of RULES) {
    const matched = rule.keywords.some((keyword) =>
      text.includes(keyword.toLowerCase()),
    )
    if (matched) {
      return {
        suggestion: rule.suggestion,
        reason: rule.reason,
        category: rule.category,
      }
    }
  }

  // 預設：可扣抵
  return {
    suggestion: 'deductible',
    reason: '',
    category: '',
  }
}

/**
 * 批次分類
 */
export function batchClassifyDeductibility(
  invoices: Array<{ counterpartyName: string; description?: string }>,
): DeductibilityResult[] {
  return invoices.map((inv) =>
    classifyDeductibility(inv.counterpartyName, inv.description),
  )
}
