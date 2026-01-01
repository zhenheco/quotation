/**
 * AI 會計科目自動分類服務
 * 根據發票描述和類型，自動推薦適合的會計科目
 */

import { AccountCategory, getAccounts } from '@/lib/dal/accounting/accounts.dal'
import { SupabaseClient } from '@/lib/db/supabase-client'

// 科目分類結果
export interface AccountClassificationResult {
  accountId: string
  accountCode: string
  accountName: string
  category: AccountCategory
  confidence: number
  reasoning: string
}

// 關鍵字到科目代碼的映射規則
interface ClassificationRule {
  keywords: string[]
  accountCode: string
  confidence: number
}

// 銷項發票（OUTPUT）分類規則
const OUTPUT_RULES: ClassificationRule[] = [
  // 軟體開發服務
  { keywords: ['軟體', '程式', '開發', 'software', 'development', '系統開發'], accountCode: '4111', confidence: 0.9 },
  // 顧問諮詢
  { keywords: ['顧問', '諮詢', '顧問費', 'consulting', '諮詢服務'], accountCode: '4111', confidence: 0.85 },
  // 維護服務
  { keywords: ['維護', '維修', '保養', 'maintenance', '系統維護'], accountCode: '4111', confidence: 0.85 },
  // 銷售商品
  { keywords: ['銷售', '銷貨', '商品', '產品', '貨物', 'sale'], accountCode: '4101', confidence: 0.9 },
  // 專案費用
  { keywords: ['專案', '專案費', 'project', '項目'], accountCode: '4111', confidence: 0.8 },
  // 其他服務
  { keywords: ['服務', '勞務', 'service'], accountCode: '4111', confidence: 0.7 },
]

// 進項發票（INPUT）分類規則
const INPUT_RULES: ClassificationRule[] = [
  // 辦公設備
  { keywords: ['辦公', '設備', '電腦', '印表機', 'office', 'equipment'], accountCode: '5111', confidence: 0.85 },
  // 雲端服務
  { keywords: ['雲端', 'cloud', 'AWS', 'GCP', 'Azure', 'SaaS', '伺服器'], accountCode: '6201', confidence: 0.9 },
  // 租金
  { keywords: ['租金', '房租', '辦公室', 'rent', '租賃'], accountCode: '6131', confidence: 0.95 },
  // 水電
  { keywords: ['水電', '電費', '水費', '瓦斯', 'utility'], accountCode: '6141', confidence: 0.95 },
  // 通訊
  { keywords: ['通訊', '電話', '網路', '手機', 'telecom', 'internet'], accountCode: '6151', confidence: 0.9 },
  // 交通
  { keywords: ['交通', '運費', '物流', '快遞', 'transport', 'shipping'], accountCode: '6161', confidence: 0.9 },
  // 交際應酬
  { keywords: ['交際', '餐飲', '聚餐', '招待', 'entertainment'], accountCode: '6171', confidence: 0.85 },
  // 薪資相關
  { keywords: ['薪資', '工資', '薪水', 'salary', 'wage'], accountCode: '6101', confidence: 0.95 },
  // 勞健保
  { keywords: ['勞保', '健保', '勞健保', '保險', 'insurance'], accountCode: '6121', confidence: 0.9 },
  // 一般採購/成本
  { keywords: ['採購', '進貨', '材料', '原料', 'purchase'], accountCode: '5101', confidence: 0.8 },
]

/**
 * 根據發票資訊自動分類會計科目
 */
export async function classifyInvoiceAccount(
  db: SupabaseClient,
  companyId: string,
  invoiceType: 'OUTPUT' | 'INPUT',
  description: string,
  counterpartyName?: string
): Promise<AccountClassificationResult | null> {
  // 取得公司的會計科目
  const accounts = await getAccounts(db, { companyId, isActive: true })

  if (accounts.length === 0) {
    console.warn('[AccountClassifier] 公司沒有會計科目，無法分類')
    return null
  }

  // 合併描述和對手名稱作為分類依據
  const searchText = `${description || ''} ${counterpartyName || ''}`.toLowerCase()

  // 選擇對應的規則集
  const rules = invoiceType === 'OUTPUT' ? OUTPUT_RULES : INPUT_RULES

  // 尋找最佳匹配
  let bestMatch: { rule: ClassificationRule; matchCount: number } | null = null

  for (const rule of rules) {
    const matchCount = rule.keywords.filter((kw) => searchText.includes(kw.toLowerCase())).length

    if (matchCount > 0) {
      if (!bestMatch || matchCount > bestMatch.matchCount) {
        bestMatch = { rule, matchCount }
      }
    }
  }

  // 如果找到匹配規則
  if (bestMatch) {
    const targetCode = bestMatch.rule.accountCode
    const matchedAccount = accounts.find((acc) => acc.code === targetCode)

    if (matchedAccount) {
      // 調整信心度：匹配越多關鍵字，信心度越高
      const adjustedConfidence = Math.min(
        bestMatch.rule.confidence + (bestMatch.matchCount - 1) * 0.05,
        0.98
      )

      return {
        accountId: matchedAccount.id,
        accountCode: matchedAccount.code,
        accountName: matchedAccount.name,
        category: matchedAccount.category,
        confidence: adjustedConfidence,
        reasoning: `匹配關鍵字: ${bestMatch.rule.keywords
          .filter((kw) => searchText.includes(kw.toLowerCase()))
          .join(', ')}`,
      }
    }
  }

  // 使用預設科目
  const defaultCode = invoiceType === 'OUTPUT' ? '4181' : '6201' // 其他營業收入 / 其他費用
  const defaultAccount = accounts.find((acc) => acc.code === defaultCode)

  if (defaultAccount) {
    return {
      accountId: defaultAccount.id,
      accountCode: defaultAccount.code,
      accountName: defaultAccount.name,
      category: defaultAccount.category,
      confidence: 0.5,
      reasoning: '未找到匹配規則，使用預設科目',
    }
  }

  return null
}

/**
 * 批次分類多張發票
 */
export async function classifyMultipleInvoices(
  db: SupabaseClient,
  companyId: string,
  invoices: Array<{
    id: string
    type: 'OUTPUT' | 'INPUT'
    description: string | null
    counterparty_name: string | null
  }>
): Promise<Map<string, AccountClassificationResult>> {
  const results = new Map<string, AccountClassificationResult>()

  for (const invoice of invoices) {
    const classification = await classifyInvoiceAccount(
      db,
      companyId,
      invoice.type,
      invoice.description || '',
      invoice.counterparty_name || undefined
    )

    if (classification) {
      results.set(invoice.id, classification)
    }
  }

  return results
}

/**
 * 顯示分類建議（用於測試/調試）
 */
export function formatClassificationResult(result: AccountClassificationResult): string {
  const confidenceBar = '█'.repeat(Math.round(result.confidence * 10)) + '░'.repeat(10 - Math.round(result.confidence * 10))

  return `
┌─────────────────────────────────────────┐
│ 科目代碼: ${result.accountCode.padEnd(10)} 信心度: ${(result.confidence * 100).toFixed(0)}%
│ 科目名稱: ${result.accountName}
│ 類別: ${result.category}
│ ${confidenceBar}
│ 原因: ${result.reasoning}
└─────────────────────────────────────────┘`
}
