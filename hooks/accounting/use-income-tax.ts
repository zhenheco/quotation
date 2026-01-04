/**
 * 營所稅擴大書審 React Query Hooks
 * 用於前端與 API 的資料交互
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ============================================================================
// 類型定義
// ============================================================================

/**
 * 年度營收匯總
 */
export interface AnnualRevenueSummary {
  year: number
  total_revenue: number
  total_tax: number
  invoice_count: number
  by_month: Array<{
    month: number
    revenue: number
    tax: number
    count: number
  }>
}

/**
 * 資格檢查結果
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

/**
 * 擴大書審計算結果
 */
export interface ExpandedAuditResult {
  company_id: string
  company_name: string
  company_tax_id: string
  tax_year: number
  is_eligible: boolean
  ineligible_reason?: string
  calculation: {
    total_revenue: number
    other_income: number
    gross_income: number
    industry_code: string
    industry_name: string
    profit_rate: number
    profit_rate_display: string
    taxable_income_from_business: number
    total_taxable_income: number
    deductions: number
    tax_calculation_type: 'TAX_FREE' | 'HALF_TAX' | 'FULL_TAX'
    tax_calculation_description: string
    calculated_tax: number
    final_tax: number
  }
  summary: {
    total_revenue_display: string
    taxable_income_display: string
    tax_amount_display: string
    effective_tax_rate: string
  }
  calculated_at: string
}

/**
 * 申報記錄狀態
 */
export type IncomeTaxFilingStatus = 'DRAFT' | 'CALCULATED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'

/**
 * 營所稅申報記錄
 */
export interface IncomeTaxFiling {
  id: string
  company_id: string
  tax_year: number
  filing_method: 'EXPANDED_AUDIT' | 'REGULAR' | 'CPA_CERTIFIED'
  status: IncomeTaxFilingStatus
  company_name: string
  company_tax_id: string
  total_revenue: number
  other_income: number
  gross_income: number
  industry_code: string | null
  industry_name: string | null
  profit_rate: number | null
  taxable_income: number
  deductions: number
  calculated_tax: number
  final_tax: number
  is_eligible: boolean
  calculation_details: Record<string, unknown> | null
  calculated_at: string | null
  submitted_at: string | null
  submitted_by: string | null
  acceptance_number: string | null
  rejection_reason: string | null
  pdf_url: string | null
  pdf_generated_at: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * 行業純益率
 */
export interface IndustryProfitRate {
  id: string
  industry_code: string
  industry_name: string
  industry_category: string | null
  profit_rate: number
  tax_year: number
  source: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * 申報統計摘要
 */
export interface FilingSummary {
  total_filings: number
  latest_year: number | null
  total_tax_paid: number
  filings_by_status: Record<IncomeTaxFilingStatus, number>
}

/**
 * 預覽參數
 */
export interface PreviewParams {
  companyId: string
  companyName: string
  companyTaxId: string
  taxYear: number
  industryCode?: string
}

/**
 * 計算並儲存參數
 */
export interface CalculateAndSaveParams {
  company_id: string
  company_name: string
  tax_id: string
  tax_year: number
  industry_code: string
  other_income?: number
  deductions?: number
  override_revenue?: number
  override_profit_rate?: number
}

/**
 * 純益率搜尋參數
 */
export interface SearchProfitRatesParams {
  query: string
  taxYear?: number
  companyId: string
}

// ============================================================================
// Query Keys
// ============================================================================

export const incomeTaxKeys = {
  all: ['income-tax'] as const,
  preview: (companyId: string, taxYear: number, industryCode?: string) =>
    [...incomeTaxKeys.all, 'preview', companyId, taxYear, industryCode] as const,
  filings: (companyId: string) =>
    [...incomeTaxKeys.all, 'filings', companyId] as const,
  filing: (companyId: string, taxYear: number) =>
    [...incomeTaxKeys.all, 'filing', companyId, taxYear] as const,
  summary: (companyId: string) =>
    [...incomeTaxKeys.all, 'summary', companyId] as const,
  profitRates: (taxYear: number, search?: string) =>
    [...incomeTaxKeys.all, 'profit-rates', taxYear, search] as const,
}

// ============================================================================
// API 呼叫函數
// ============================================================================

/**
 * 預覽擴大書審計算
 */
async function fetchPreview(params: PreviewParams): Promise<{
  tax_year: number
  revenue_summary: AnnualRevenueSummary
  eligibility: EligibilityCheckResult
  revenue_limit: number
  result?: ExpandedAuditResult
}> {
  const searchParams = new URLSearchParams({
    company_id: params.companyId,
    tax_year: params.taxYear.toString(),
    action: 'preview',
    company_name: params.companyName,
    tax_id: params.companyTaxId,
  })

  if (params.industryCode) {
    searchParams.set('industry_code', params.industryCode)
  }

  const response = await fetch(`/api/accounting/income-tax/expanded-audit?${searchParams}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '預覽計算失敗')
  }

  const json = await response.json()
  return json.data
}

/**
 * 取得申報記錄列表
 */
async function fetchFilings(companyId: string): Promise<IncomeTaxFiling[]> {
  const response = await fetch(
    `/api/accounting/income-tax/expanded-audit?company_id=${companyId}&action=list`
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '取得申報記錄失敗')
  }

  const json = await response.json()
  return json.data
}

/**
 * 取得申報統計摘要
 */
async function fetchSummary(companyId: string): Promise<FilingSummary> {
  const response = await fetch(
    `/api/accounting/income-tax/expanded-audit?company_id=${companyId}&action=summary`
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '取得統計摘要失敗')
  }

  const json = await response.json()
  return json.data
}

/**
 * 計算並儲存申報
 */
async function calculateAndSave(params: CalculateAndSaveParams): Promise<{
  filing: IncomeTaxFiling
  calculation: ExpandedAuditResult
}> {
  const response = await fetch('/api/accounting/income-tax/expanded-audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '計算儲存失敗')
  }

  const json = await response.json()
  return json.data
}

/**
 * 搜尋純益率
 */
async function searchProfitRates(params: SearchProfitRatesParams): Promise<IndustryProfitRate[]> {
  const response = await fetch('/api/accounting/income-tax/expanded-audit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_id: params.companyId,
      query: params.query,
      tax_year: params.taxYear,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '搜尋純益率失敗')
  }

  const json = await response.json()
  return json.data
}

/**
 * 取得所有純益率
 */
async function fetchProfitRates(taxYear: number, search?: string): Promise<IndustryProfitRate[]> {
  const searchParams = new URLSearchParams({
    tax_year: taxYear.toString(),
  })

  if (search) {
    searchParams.set('search', search)
  }

  const response = await fetch(`/api/accounting/profit-rates?${searchParams}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '取得純益率失敗')
  }

  const json = await response.json()
  return json.data
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * 預覽擴大書審計算
 */
export function useExpandedAuditPreview(params: PreviewParams | null, enabled = true) {
  return useQuery({
    queryKey: params
      ? incomeTaxKeys.preview(params.companyId, params.taxYear, params.industryCode)
      : ['invalid'],
    queryFn: () => {
      if (!params) throw new Error('缺少必要參數')
      return fetchPreview(params)
    },
    enabled: enabled && !!params?.companyId && !!params?.taxYear,
    staleTime: 5 * 60 * 1000, // 5 分鐘
    gcTime: 30 * 60 * 1000, // 30 分鐘
  })
}

/**
 * 取得申報記錄列表
 */
export function useIncomeTaxFilings(companyId: string | null, enabled = true) {
  return useQuery({
    queryKey: companyId ? incomeTaxKeys.filings(companyId) : ['invalid'],
    queryFn: () => {
      if (!companyId) throw new Error('缺少公司 ID')
      return fetchFilings(companyId)
    },
    enabled: enabled && !!companyId,
    staleTime: 2 * 60 * 1000, // 2 分鐘
  })
}

/**
 * 取得申報統計摘要
 */
export function useIncomeTaxSummary(companyId: string | null, enabled = true) {
  return useQuery({
    queryKey: companyId ? incomeTaxKeys.summary(companyId) : ['invalid'],
    queryFn: () => {
      if (!companyId) throw new Error('缺少公司 ID')
      return fetchSummary(companyId)
    },
    enabled: enabled && !!companyId,
    staleTime: 2 * 60 * 1000, // 2 分鐘
  })
}

/**
 * 取得純益率列表
 */
export function useProfitRates(taxYear: number, search?: string) {
  return useQuery({
    queryKey: incomeTaxKeys.profitRates(taxYear, search),
    queryFn: () => fetchProfitRates(taxYear, search),
    staleTime: 60 * 60 * 1000, // 1 小時（純益率不常變動）
    gcTime: 24 * 60 * 60 * 1000, // 24 小時
  })
}

/**
 * 計算並儲存申報
 */
export function useCalculateAndSave() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: calculateAndSave,
    onSuccess: (data, variables) => {
      // 更新相關快取
      queryClient.invalidateQueries({
        queryKey: incomeTaxKeys.filings(variables.company_id),
      })
      queryClient.invalidateQueries({
        queryKey: incomeTaxKeys.summary(variables.company_id),
      })
      queryClient.invalidateQueries({
        queryKey: incomeTaxKeys.preview(
          variables.company_id,
          variables.tax_year,
          variables.industry_code
        ),
      })
    },
  })
}

/**
 * 搜尋純益率（mutation，用於即時搜尋）
 */
export function useSearchProfitRates() {
  return useMutation({
    mutationFn: searchProfitRates,
  })
}

/**
 * 使快取失效
 */
export function useInvalidateIncomeTax() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: incomeTaxKeys.all }),
    invalidateFilings: (companyId: string) =>
      queryClient.invalidateQueries({ queryKey: incomeTaxKeys.filings(companyId) }),
    invalidateSummary: (companyId: string) =>
      queryClient.invalidateQueries({ queryKey: incomeTaxKeys.summary(companyId) }),
  }
}
