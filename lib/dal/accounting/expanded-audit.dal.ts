/**
 * 營所稅擴大書審資料存取層 (DAL)
 *
 * 管理營所稅申報記錄
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import { ExpandedAuditResult } from '@/lib/services/accounting/expanded-audit-calculator'

// ============================================================================
// 類型定義
// ============================================================================

export type IncomeTaxFilingStatus = 'DRAFT' | 'CALCULATED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
export type FilingMethod = 'EXPANDED_AUDIT' | 'REGULAR' | 'CPA_CERTIFIED'

/**
 * 營所稅申報記錄
 */
export interface IncomeTaxFiling {
  id: string
  company_id: string
  tax_year: number // 課稅年度
  filing_method: FilingMethod
  status: IncomeTaxFilingStatus

  // 公司資訊快照
  company_name: string
  company_tax_id: string

  // 申報資料
  total_revenue: number // 全年營業收入
  other_income: number // 非營業收入
  gross_income: number // 總收入
  industry_code: string | null // 行業代碼（擴大書審用）
  industry_name: string | null // 行業名稱
  profit_rate: number | null // 純益率
  taxable_income: number // 課稅所得
  deductions: number // 扣除額
  calculated_tax: number // 計算稅額
  final_tax: number // 最終稅額
  is_eligible: boolean // 是否符合擴大書審資格

  // 計算詳情（JSON）
  calculation_details: Record<string, unknown> | null

  // 申報狀態
  calculated_at: string | null
  submitted_at: string | null
  submitted_by: string | null
  acceptance_number: string | null // 財政部受理編號
  rejection_reason: string | null

  // PDF 匯出
  pdf_url: string | null
  pdf_generated_at: string | null

  // 審計軌跡
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * 建立申報記錄輸入
 */
export interface CreateIncomeTaxFilingInput {
  company_id: string
  tax_year: number
  created_by: string
  filing_method?: FilingMethod
}

/**
 * 從計算結果建立申報記錄
 */
export interface CreateFilingFromResultInput {
  result: ExpandedAuditResult
  created_by: string
}

/**
 * 更新申報記錄輸入
 */
export interface UpdateIncomeTaxFilingInput {
  status?: IncomeTaxFilingStatus
  total_revenue?: number
  other_income?: number
  industry_code?: string
  profit_rate?: number
  deductions?: number
  calculation_details?: Record<string, unknown>
  submitted_at?: string
  submitted_by?: string
  acceptance_number?: string
  rejection_reason?: string
  pdf_url?: string
  pdf_generated_at?: string
  updated_by: string
}

/**
 * 查詢選項
 */
export interface IncomeTaxFilingQueryOptions {
  company_id: string
  tax_year?: number
  status?: IncomeTaxFilingStatus
  filing_method?: FilingMethod
  limit?: number
  offset?: number
}

// ============================================================================
// 查詢函數
// ============================================================================

/**
 * 取得申報記錄列表
 */
export async function getIncomeTaxFilings(
  db: SupabaseClient,
  options: IncomeTaxFilingQueryOptions
): Promise<IncomeTaxFiling[]> {
  const {
    company_id,
    tax_year,
    status,
    filing_method,
    limit = 50,
    offset = 0,
  } = options

  let query = db
    .from('income_tax_filings')
    .select('*')
    .eq('company_id', company_id)
    .is('deleted_at', null)
    .order('tax_year', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tax_year) {
    query = query.eq('tax_year', tax_year)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (filing_method) {
    query = query.eq('filing_method', filing_method)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得營所稅申報記錄失敗: ${error.message}`)
  }

  return (data || []) as IncomeTaxFiling[]
}

/**
 * 根據 ID 取得申報記錄
 */
export async function getIncomeTaxFilingById(
  db: SupabaseClient,
  id: string
): Promise<IncomeTaxFiling | null> {
  const { data, error } = await db
    .from('income_tax_filings')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得營所稅申報記錄失敗: ${error.message}`)
  }

  return data as IncomeTaxFiling | null
}

/**
 * 取得特定公司特定年度的申報記錄
 */
export async function getIncomeTaxFilingByYear(
  db: SupabaseClient,
  companyId: string,
  taxYear: number
): Promise<IncomeTaxFiling | null> {
  const { data, error } = await db
    .from('income_tax_filings')
    .select('*')
    .eq('company_id', companyId)
    .eq('tax_year', taxYear)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`取得營所稅申報記錄失敗: ${error.message}`)
  }

  return data as IncomeTaxFiling | null
}

/**
 * 取得最近的申報記錄
 */
export async function getLatestIncomeTaxFiling(
  db: SupabaseClient,
  companyId: string
): Promise<IncomeTaxFiling | null> {
  const { data, error } = await db
    .from('income_tax_filings')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('tax_year', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`取得營所稅申報記錄失敗: ${error.message}`)
  }

  return data as IncomeTaxFiling | null
}

// ============================================================================
// 寫入函數
// ============================================================================

/**
 * 建立空白申報記錄（草稿）
 */
export async function createIncomeTaxFiling(
  db: SupabaseClient,
  input: CreateIncomeTaxFilingInput
): Promise<IncomeTaxFiling> {
  // 檢查是否已存在同年度記錄
  const existing = await getIncomeTaxFilingByYear(db, input.company_id, input.tax_year)
  if (existing) {
    throw new Error(`${input.tax_year} 年度的營所稅申報記錄已存在`)
  }

  const now = new Date().toISOString()

  const { data, error } = await db
    .from('income_tax_filings')
    .insert({
      id: crypto.randomUUID(),
      company_id: input.company_id,
      tax_year: input.tax_year,
      filing_method: input.filing_method || 'EXPANDED_AUDIT',
      status: 'DRAFT',
      company_name: '',
      company_tax_id: '',
      total_revenue: 0,
      other_income: 0,
      gross_income: 0,
      industry_code: null,
      industry_name: null,
      profit_rate: null,
      taxable_income: 0,
      deductions: 0,
      calculated_tax: 0,
      final_tax: 0,
      is_eligible: false,
      calculation_details: null,
      created_by: input.created_by,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`建立營所稅申報記錄失敗: ${error.message}`)
  }

  return data as IncomeTaxFiling
}

/**
 * 從計算結果建立申報記錄
 */
export async function createFilingFromResult(
  db: SupabaseClient,
  input: CreateFilingFromResultInput
): Promise<IncomeTaxFiling> {
  const { result, created_by } = input
  const now = new Date().toISOString()

  // 檢查是否已存在同年度記錄
  const existing = await getIncomeTaxFilingByYear(db, result.company_id, result.tax_year)

  if (existing) {
    // 更新現有記錄
    return updateIncomeTaxFiling(db, existing.id, {
      total_revenue: result.calculation.total_revenue,
      other_income: result.calculation.other_income,
      industry_code: result.calculation.industry_code,
      profit_rate: result.calculation.profit_rate,
      deductions: result.calculation.deductions,
      calculation_details: result.calculation as unknown as Record<string, unknown>,
      updated_by: created_by,
    })
  }

  // 建立新記錄
  const { data, error } = await db
    .from('income_tax_filings')
    .insert({
      id: crypto.randomUUID(),
      company_id: result.company_id,
      tax_year: result.tax_year,
      filing_method: 'EXPANDED_AUDIT',
      status: 'CALCULATED',
      company_name: result.company_name,
      company_tax_id: result.company_tax_id,
      total_revenue: result.calculation.total_revenue,
      other_income: result.calculation.other_income,
      gross_income: result.calculation.gross_income,
      industry_code: result.calculation.industry_code,
      industry_name: result.calculation.industry_name,
      profit_rate: result.calculation.profit_rate,
      taxable_income: result.calculation.total_taxable_income,
      deductions: result.calculation.deductions,
      calculated_tax: result.calculation.calculated_tax,
      final_tax: result.calculation.final_tax,
      is_eligible: result.is_eligible,
      calculation_details: result.calculation as unknown as Record<string, unknown>,
      calculated_at: result.calculated_at,
      created_by,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`建立營所稅申報記錄失敗: ${error.message}`)
  }

  return data as IncomeTaxFiling
}

/**
 * 更新申報記錄
 */
export async function updateIncomeTaxFiling(
  db: SupabaseClient,
  id: string,
  input: UpdateIncomeTaxFilingInput
): Promise<IncomeTaxFiling> {
  const existing = await getIncomeTaxFilingById(db, id)
  if (!existing) {
    throw new Error('申報記錄不存在')
  }

  // 已提交的記錄不能修改核心資料
  if (existing.status === 'SUBMITTED' || existing.status === 'ACCEPTED') {
    const allowedFields = ['status', 'acceptance_number', 'rejection_reason', 'pdf_url', 'pdf_generated_at']
    const attemptedFields = Object.keys(input).filter((k) => !allowedFields.includes(k) && k !== 'updated_by')

    if (attemptedFields.length > 0) {
      throw new Error(`已提交的申報記錄不能修改: ${attemptedFields.join(', ')}`)
    }
  }

  // 重新計算相關欄位
  const updateData: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  }

  // 如果更新了收入或費用，重新計算總收入
  if (input.total_revenue !== undefined || input.other_income !== undefined) {
    const totalRevenue = input.total_revenue ?? existing.total_revenue
    const otherIncome = input.other_income ?? existing.other_income
    updateData.gross_income = totalRevenue + otherIncome
  }

  const { data, error } = await db
    .from('income_tax_filings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`更新營所稅申報記錄失敗: ${error.message}`)
  }

  return data as IncomeTaxFiling
}

/**
 * 儲存計算結果
 */
export async function saveCalculationResult(
  db: SupabaseClient,
  filingId: string,
  result: ExpandedAuditResult,
  updatedBy: string
): Promise<IncomeTaxFiling> {
  return updateIncomeTaxFiling(db, filingId, {
    status: 'CALCULATED',
    total_revenue: result.calculation.total_revenue,
    other_income: result.calculation.other_income,
    industry_code: result.calculation.industry_code,
    profit_rate: result.calculation.profit_rate,
    deductions: result.calculation.deductions,
    calculation_details: {
      ...result.calculation,
      summary: result.summary,
      is_eligible: result.is_eligible,
      ineligible_reason: result.ineligible_reason,
    },
    updated_by: updatedBy,
  })
}

/**
 * 標記為已提交
 */
export async function markAsSubmitted(
  db: SupabaseClient,
  id: string,
  submittedBy: string
): Promise<IncomeTaxFiling> {
  const existing = await getIncomeTaxFilingById(db, id)
  if (!existing) {
    throw new Error('申報記錄不存在')
  }

  if (existing.status !== 'CALCULATED') {
    throw new Error('只能提交已計算完成的申報記錄')
  }

  return updateIncomeTaxFiling(db, id, {
    status: 'SUBMITTED',
    submitted_at: new Date().toISOString(),
    submitted_by: submittedBy,
    updated_by: submittedBy,
  })
}

/**
 * 標記為已受理
 */
export async function markAsAccepted(
  db: SupabaseClient,
  id: string,
  acceptanceNumber: string,
  updatedBy: string
): Promise<IncomeTaxFiling> {
  return updateIncomeTaxFiling(db, id, {
    status: 'ACCEPTED',
    acceptance_number: acceptanceNumber,
    updated_by: updatedBy,
  })
}

/**
 * 標記為已拒絕
 */
export async function markAsRejected(
  db: SupabaseClient,
  id: string,
  reason: string,
  updatedBy: string
): Promise<IncomeTaxFiling> {
  return updateIncomeTaxFiling(db, id, {
    status: 'REJECTED',
    rejection_reason: reason,
    updated_by: updatedBy,
  })
}

/**
 * 刪除申報記錄（軟刪除）
 */
export async function deleteIncomeTaxFiling(
  db: SupabaseClient,
  id: string
): Promise<void> {
  const existing = await getIncomeTaxFilingById(db, id)
  if (!existing) {
    throw new Error('申報記錄不存在')
  }

  // 已提交或已受理的記錄不能刪除
  if (existing.status === 'SUBMITTED' || existing.status === 'ACCEPTED') {
    throw new Error('已提交或已受理的申報記錄不能刪除')
  }

  const { error } = await db
    .from('income_tax_filings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(`刪除營所稅申報記錄失敗: ${error.message}`)
  }
}

// ============================================================================
// 統計函數
// ============================================================================

/**
 * 取得公司的申報統計摘要
 */
export async function getFilingSummary(
  db: SupabaseClient,
  companyId: string
): Promise<{
  total_filings: number
  latest_year: number | null
  total_tax_paid: number
  filings_by_status: Record<IncomeTaxFilingStatus, number>
}> {
  const filings = await getIncomeTaxFilings(db, {
    company_id: companyId,
    limit: 100,
  })

  const summary = {
    total_filings: filings.length,
    latest_year: filings.length > 0 ? filings[0].tax_year : null,
    total_tax_paid: 0,
    filings_by_status: {
      DRAFT: 0,
      CALCULATED: 0,
      SUBMITTED: 0,
      ACCEPTED: 0,
      REJECTED: 0,
    } as Record<IncomeTaxFilingStatus, number>,
  }

  for (const filing of filings) {
    summary.filings_by_status[filing.status]++
    if (filing.status === 'ACCEPTED') {
      summary.total_tax_paid += filing.final_tax
    }
  }

  return summary
}
