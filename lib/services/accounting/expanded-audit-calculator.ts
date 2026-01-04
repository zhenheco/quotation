/**
 * 營所稅擴大書審計算器
 *
 * 擴大書審（簡易申報）適用於：
 * - 年營業收入 ≤ 3,000 萬元的中小企業
 * - 依行業別適用純益率計算課稅所得
 *
 * 稅率規則（113 年度起）：
 * - 課稅所得 ≤ 12 萬：免稅
 * - 12 萬 < 課稅所得 ≤ 20 萬：課稅所得減 12 萬後，按 20% 稅率計算
 * - 課稅所得 > 20 萬：全額按 20% 稅率計算
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import { getInvoices } from '@/lib/dal/accounting'

// ============================================================================
// 常數
// ============================================================================

/** 擴大書審適用上限（3,000 萬） */
export const EXPANDED_AUDIT_REVENUE_LIMIT = 30_000_000

/** 營所稅稅率 20% */
export const INCOME_TAX_RATE = 0.2

/** 起徵額 - 免稅門檻（12 萬） */
export const TAX_FREE_THRESHOLD = 120_000

/** 半數課稅門檻（20 萬） */
export const HALF_TAX_THRESHOLD = 200_000

// ============================================================================
// 類型定義
// ============================================================================

/**
 * 行業純益率資料
 */
export interface IndustryProfitRate {
  id: string
  industry_code: string
  industry_name: string
  profit_rate: number // 純益率 (0.06 = 6%)
  tax_year: number // 適用年度
  source: string | null // 資料來源
  created_at: string
  updated_at: string
}

/**
 * 年度營收匯總
 */
export interface AnnualRevenueSummary {
  year: number
  total_revenue: number // 總營業收入（銷項發票未稅金額）
  total_tax: number // 總營業稅額
  invoice_count: number // 發票數量
  by_month: Array<{
    month: number
    revenue: number
    tax: number
    count: number
  }>
}

/**
 * 擴大書審計算輸入
 */
export interface ExpandedAuditInput {
  company_id: string
  company_name: string
  company_tax_id: string
  tax_year: number // 申報年度
  industry_code: string // 行業代碼
  industry_name?: string // 行業名稱
  profit_rate: number // 純益率
  total_revenue: number // 全年營業收入
  other_income?: number // 非營業收入（可選）
  deductions?: number // 其他扣除額（可選）
}

/**
 * 擴大書審計算結果
 */
export interface ExpandedAuditResult {
  // 基本資訊
  company_id: string
  company_name: string
  company_tax_id: string
  tax_year: number

  // 申報資格
  is_eligible: boolean
  ineligible_reason?: string

  // 計算明細
  calculation: {
    // 收入
    total_revenue: number // 全年營業收入
    other_income: number // 非營業收入
    gross_income: number // 總收入

    // 純益率計算
    industry_code: string
    industry_name: string
    profit_rate: number // 純益率 (如 0.06)
    profit_rate_display: string // 純益率顯示 (如 "6%")

    // 所得計算
    taxable_income_from_business: number // 營業課稅所得 = 營業收入 × 純益率
    total_taxable_income: number // 總課稅所得 = 營業課稅所得 + 非營業收入 - 扣除額
    deductions: number // 扣除額

    // 稅額計算
    tax_calculation_type: 'TAX_FREE' | 'HALF_TAX' | 'FULL_TAX'
    tax_calculation_description: string
    calculated_tax: number // 應納稅額
    final_tax: number // 最終應納稅額（四捨五入至元）
  }

  // 申報摘要
  summary: {
    total_revenue_display: string
    taxable_income_display: string
    tax_amount_display: string
    effective_tax_rate: string // 實際稅負率
  }

  // 時間戳記
  calculated_at: string
}

/**
 * 擴大書審資格檢查結果
 */
export interface EligibilityCheckResult {
  is_eligible: boolean
  reason?: string
  details: {
    total_revenue: number
    revenue_limit: number
    exceeds_limit: boolean
  }
}

// ============================================================================
// 純益率查詢（暫時 mock，待 profit-rates.dal.ts 實作）
// ============================================================================

/**
 * 常見行業純益率參考表（暫用靜態資料）
 * 實際應從 industry_profit_rates 表查詢
 */
const DEFAULT_PROFIT_RATES: Record<string, { name: string; rate: number }> = {
  // 電腦程式設計
  '6201': { name: '電腦程式設計業', rate: 0.06 },
  '6202': { name: '電腦諮詢服務業', rate: 0.08 },
  // 批發零售
  '4610': { name: '批發業', rate: 0.04 },
  '4711': { name: '綜合商品零售業', rate: 0.03 },
  // 餐飲
  '5610': { name: '餐館業', rate: 0.06 },
  '5620': { name: '外燴及團膳承包業', rate: 0.06 },
  // 服務業
  '6910': { name: '法律服務業', rate: 0.15 },
  '6920': { name: '會計服務業', rate: 0.12 },
  '7020': { name: '管理顧問業', rate: 0.10 },
  // 製造業
  '2511': { name: '金屬結構製造業', rate: 0.05 },
  '2599': { name: '其他金屬製品製造業', rate: 0.05 },
  // 營建
  '4100': { name: '建築工程業', rate: 0.03 },
  '4390': { name: '其他專門營造業', rate: 0.04 },
}

/**
 * 取得行業純益率（暫時使用靜態資料）
 */
export async function getProfitRateByCode(
  _db: SupabaseClient,
  industryCode: string,
  _taxYear: number
): Promise<IndustryProfitRate | null> {
  const rateInfo = DEFAULT_PROFIT_RATES[industryCode]

  if (!rateInfo) {
    return null
  }

  // 模擬資料庫記錄格式
  return {
    id: `mock-${industryCode}`,
    industry_code: industryCode,
    industry_name: rateInfo.name,
    profit_rate: rateInfo.rate,
    tax_year: _taxYear,
    source: '財政部公告參考值',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * 搜尋行業純益率
 */
export async function searchProfitRates(
  _db: SupabaseClient,
  query: string,
  _taxYear: number
): Promise<IndustryProfitRate[]> {
  const results: IndustryProfitRate[] = []
  const queryLower = query.toLowerCase()

  for (const [code, info] of Object.entries(DEFAULT_PROFIT_RATES)) {
    if (
      code.includes(query) ||
      info.name.toLowerCase().includes(queryLower)
    ) {
      results.push({
        id: `mock-${code}`,
        industry_code: code,
        industry_name: info.name,
        profit_rate: info.rate,
        tax_year: _taxYear,
        source: '財政部公告參考值',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  return results
}

// ============================================================================
// 營收匯總
// ============================================================================

/**
 * 匯總公司年度營業收入
 * 從銷項發票（OUTPUT）計算全年營業收入
 */
export async function aggregateAnnualRevenue(
  db: SupabaseClient,
  companyId: string,
  year: number
): Promise<AnnualRevenueSummary> {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  // 取得年度所有已過帳的銷項發票
  const invoices = await getInvoices(db, {
    companyId,
    type: 'OUTPUT',
    status: 'POSTED',
    startDate,
    endDate,
    limit: 100000,
    offset: 0,
  })

  // 按月份分組統計
  const byMonth: Map<number, { revenue: number; tax: number; count: number }> = new Map()

  for (let m = 1; m <= 12; m++) {
    byMonth.set(m, { revenue: 0, tax: 0, count: 0 })
  }

  let totalRevenue = 0
  let totalTax = 0

  for (const inv of invoices) {
    const invDate = new Date(inv.date)
    const month = invDate.getMonth() + 1

    const untaxed = parseFloat(String(inv.untaxed_amount)) || 0
    const tax = parseFloat(String(inv.tax_amount)) || 0

    totalRevenue += untaxed
    totalTax += tax

    const monthData = byMonth.get(month)!
    monthData.revenue += untaxed
    monthData.tax += tax
    monthData.count += 1
  }

  return {
    year,
    total_revenue: totalRevenue,
    total_tax: totalTax,
    invoice_count: invoices.length,
    by_month: Array.from(byMonth.entries())
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month - b.month),
  }
}

// ============================================================================
// 資格檢查
// ============================================================================

/**
 * 檢查是否符合擴大書審資格
 */
export function checkExpandedAuditEligibility(
  totalRevenue: number
): EligibilityCheckResult {
  const exceeds = totalRevenue > EXPANDED_AUDIT_REVENUE_LIMIT

  return {
    is_eligible: !exceeds,
    reason: exceeds
      ? `年營業收入 ${formatCurrency(totalRevenue)} 超過擴大書審上限 ${formatCurrency(EXPANDED_AUDIT_REVENUE_LIMIT)}`
      : undefined,
    details: {
      total_revenue: totalRevenue,
      revenue_limit: EXPANDED_AUDIT_REVENUE_LIMIT,
      exceeds_limit: exceeds,
    },
  }
}

// ============================================================================
// 稅額計算
// ============================================================================

/**
 * 計算營所稅額（擴大書審）
 *
 * 稅率規則：
 * - 課稅所得 ≤ 12 萬：免稅
 * - 12 萬 < 課稅所得 ≤ 20 萬：(課稅所得 - 12 萬) × 50% × 20%
 * - 課稅所得 > 20 萬：課稅所得 × 20%
 */
export function calculateIncomeTax(taxableIncome: number): {
  type: 'TAX_FREE' | 'HALF_TAX' | 'FULL_TAX'
  description: string
  calculatedTax: number
  finalTax: number
} {
  // 負數所得視為 0
  const income = Math.max(0, taxableIncome)

  // 免稅
  if (income <= TAX_FREE_THRESHOLD) {
    return {
      type: 'TAX_FREE',
      description: `課稅所得 ${formatCurrency(income)} ≤ ${formatCurrency(TAX_FREE_THRESHOLD)}，免稅`,
      calculatedTax: 0,
      finalTax: 0,
    }
  }

  // 半數課稅（起徵額規則）
  if (income <= HALF_TAX_THRESHOLD) {
    // (課稅所得 - 12萬) × 50% × 20%
    // 等同於 (課稅所得 - 12萬) × 10%
    const taxableAmount = income - TAX_FREE_THRESHOLD
    const calculatedTax = taxableAmount * 0.5 * INCOME_TAX_RATE
    const finalTax = Math.round(calculatedTax)

    return {
      type: 'HALF_TAX',
      description: `課稅所得 ${formatCurrency(income)} 介於 ${formatCurrency(TAX_FREE_THRESHOLD)} 至 ${formatCurrency(HALF_TAX_THRESHOLD)}，適用半數課稅`,
      calculatedTax,
      finalTax,
    }
  }

  // 全額課稅
  const calculatedTax = income * INCOME_TAX_RATE
  const finalTax = Math.round(calculatedTax)

  return {
    type: 'FULL_TAX',
    description: `課稅所得 ${formatCurrency(income)} > ${formatCurrency(HALF_TAX_THRESHOLD)}，適用 20% 稅率`,
    calculatedTax,
    finalTax,
  }
}

// ============================================================================
// 主要計算函數
// ============================================================================

/**
 * 執行擴大書審計算
 */
export function calculateExpandedAudit(
  input: ExpandedAuditInput
): ExpandedAuditResult {
  const {
    company_id,
    company_name,
    company_tax_id,
    tax_year,
    industry_code,
    industry_name,
    profit_rate,
    total_revenue,
    other_income = 0,
    deductions = 0,
  } = input

  // 1. 檢查資格
  const eligibility = checkExpandedAuditEligibility(total_revenue)

  if (!eligibility.is_eligible) {
    return {
      company_id,
      company_name,
      company_tax_id,
      tax_year,
      is_eligible: false,
      ineligible_reason: eligibility.reason,
      calculation: {
        total_revenue,
        other_income,
        gross_income: total_revenue + other_income,
        industry_code,
        industry_name: industry_name || '',
        profit_rate,
        profit_rate_display: `${(profit_rate * 100).toFixed(1)}%`,
        taxable_income_from_business: 0,
        total_taxable_income: 0,
        deductions,
        tax_calculation_type: 'TAX_FREE',
        tax_calculation_description: '不符合擴大書審資格',
        calculated_tax: 0,
        final_tax: 0,
      },
      summary: {
        total_revenue_display: formatCurrency(total_revenue),
        taxable_income_display: formatCurrency(0),
        tax_amount_display: formatCurrency(0),
        effective_tax_rate: '0%',
      },
      calculated_at: new Date().toISOString(),
    }
  }

  // 2. 計算營業課稅所得
  const taxableIncomeFromBusiness = Math.round(total_revenue * profit_rate)

  // 3. 計算總課稅所得
  const totalTaxableIncome = Math.max(
    0,
    taxableIncomeFromBusiness + other_income - deductions
  )

  // 4. 計算稅額
  const taxResult = calculateIncomeTax(totalTaxableIncome)

  // 5. 計算實際稅負率
  const grossIncome = total_revenue + other_income
  const effectiveTaxRate = grossIncome > 0
    ? ((taxResult.finalTax / grossIncome) * 100).toFixed(2) + '%'
    : '0%'

  return {
    company_id,
    company_name,
    company_tax_id,
    tax_year,
    is_eligible: true,
    calculation: {
      total_revenue,
      other_income,
      gross_income: grossIncome,
      industry_code,
      industry_name: industry_name || '',
      profit_rate,
      profit_rate_display: `${(profit_rate * 100).toFixed(1)}%`,
      taxable_income_from_business: taxableIncomeFromBusiness,
      total_taxable_income: totalTaxableIncome,
      deductions,
      tax_calculation_type: taxResult.type,
      tax_calculation_description: taxResult.description,
      calculated_tax: taxResult.calculatedTax,
      final_tax: taxResult.finalTax,
    },
    summary: {
      total_revenue_display: formatCurrency(total_revenue),
      taxable_income_display: formatCurrency(totalTaxableIncome),
      tax_amount_display: formatCurrency(taxResult.finalTax),
      effective_tax_rate: effectiveTaxRate,
    },
    calculated_at: new Date().toISOString(),
  }
}

// ============================================================================
// 完整計算流程（含資料查詢）
// ============================================================================

/**
 * 執行完整的擴大書審計算流程
 * 1. 匯總年度營收
 * 2. 查詢純益率
 * 3. 計算稅額
 */
export async function runExpandedAuditCalculation(
  db: SupabaseClient,
  companyId: string,
  companyName: string,
  companyTaxId: string,
  taxYear: number,
  industryCode: string,
  options?: {
    other_income?: number
    deductions?: number
    override_profit_rate?: number // 可覆蓋純益率
    override_revenue?: number // 可覆蓋營收（用於預估）
  }
): Promise<ExpandedAuditResult> {
  // 1. 匯總年度營收（除非有覆蓋值）
  let totalRevenue: number

  if (options?.override_revenue !== undefined) {
    totalRevenue = options.override_revenue
  } else {
    const revenueSummary = await aggregateAnnualRevenue(db, companyId, taxYear)
    totalRevenue = revenueSummary.total_revenue
  }

  // 2. 取得純益率
  let profitRate: number
  let industryName: string

  if (options?.override_profit_rate !== undefined) {
    profitRate = options.override_profit_rate
    industryName = '自訂純益率'
  } else {
    const rateInfo = await getProfitRateByCode(db, industryCode, taxYear)

    if (!rateInfo) {
      throw new Error(`找不到行業代碼 ${industryCode} 的純益率資料`)
    }

    profitRate = rateInfo.profit_rate
    industryName = rateInfo.industry_name
  }

  // 3. 執行計算
  return calculateExpandedAudit({
    company_id: companyId,
    company_name: companyName,
    company_tax_id: companyTaxId,
    tax_year: taxYear,
    industry_code: industryCode,
    industry_name: industryName,
    profit_rate: profitRate,
    total_revenue: totalRevenue,
    other_income: options?.other_income,
    deductions: options?.deductions,
  })
}

// ============================================================================
// 工具函數
// ============================================================================

/**
 * 格式化貨幣
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * 驗證行業代碼格式（標準為 4 碼）
 */
export function validateIndustryCode(code: string): boolean {
  return /^\d{4}$/.test(code)
}

/**
 * 驗證純益率範圍（0% - 100%）
 */
export function validateProfitRate(rate: number): boolean {
  return rate >= 0 && rate <= 1
}
