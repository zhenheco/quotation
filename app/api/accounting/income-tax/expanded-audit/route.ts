/**
 * 營所稅擴大書審 API Route
 * 處理擴大書審計算與申報記錄
 */

import { NextResponse } from 'next/server'
import { withAuthAndSubscription } from '@/lib/api/middleware'
import {
  runExpandedAuditCalculation,
  checkExpandedAuditEligibility,
  aggregateAnnualRevenue,
  searchProfitRates,
  EXPANDED_AUDIT_REVENUE_LIMIT,
} from '@/lib/services/accounting/expanded-audit-calculator'
import {
  getIncomeTaxFilings,
  getIncomeTaxFilingByYear,
  createFilingFromResult,
  saveCalculationResult,
  getFilingSummary,
} from '@/lib/dal/accounting/expanded-audit.dal'

/**
 * GET /api/accounting/income-tax/expanded-audit
 * 取得擴大書審申報記錄或計算預覽
 *
 * Query params:
 * - company_id: 公司 ID (必填)
 * - tax_year: 課稅年度 (必填)
 * - action: preview | list | summary (預設 preview)
 *
 * action=preview: 預覽計算結果（不儲存）
 * action=list: 列出所有申報記錄
 * action=summary: 取得申報統計摘要
 */
export const GET = withAuthAndSubscription('reports:read', {
  requiredFeature: 'income_tax',
  getCompanyId: (req) => req.nextUrl.searchParams.get('company_id') || '',
})(async (request, { db, companyId }) => {
  const searchParams = request.nextUrl.searchParams
  const taxYearStr = searchParams.get('tax_year')
  const action = searchParams.get('action') || 'preview'
  const companyName = searchParams.get('company_name') || ''
  const companyTaxId = searchParams.get('tax_id') || ''
  const industryCode = searchParams.get('industry_code') || ''

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  // 取得申報統計摘要
  if (action === 'summary') {
    const summary = await getFilingSummary(db, companyId)
    return NextResponse.json({ success: true, data: summary })
  }

  // 列出所有申報記錄
  if (action === 'list') {
    const filings = await getIncomeTaxFilings(db, { company_id: companyId })
    return NextResponse.json({ success: true, data: filings })
  }

  // 預覽計算結果
  if (!taxYearStr) {
    return NextResponse.json({ error: 'tax_year is required for preview' }, { status: 400 })
  }

  const taxYear = parseInt(taxYearStr, 10)
  if (isNaN(taxYear) || taxYear < 2000 || taxYear > 2100) {
    return NextResponse.json({ error: 'Invalid tax_year' }, { status: 400 })
  }

  // 先匯總年度營收
  const revenueSummary = await aggregateAnnualRevenue(db, companyId, taxYear)

  // 檢查資格
  const eligibility = checkExpandedAuditEligibility(revenueSummary.total_revenue)

  // 如果沒有提供行業代碼，只回傳營收和資格
  if (!industryCode) {
    return NextResponse.json({
      success: true,
      data: {
        tax_year: taxYear,
        revenue_summary: revenueSummary,
        eligibility: eligibility,
        revenue_limit: EXPANDED_AUDIT_REVENUE_LIMIT,
        message: '請提供 industry_code 以計算稅額',
      },
    })
  }

  // 完整計算
  const result = await runExpandedAuditCalculation(
    db,
    companyId,
    companyName,
    companyTaxId,
    taxYear,
    industryCode
  )

  return NextResponse.json({
    success: true,
    data: {
      result,
      revenue_summary: revenueSummary,
    },
  })
})

/**
 * POST /api/accounting/income-tax/expanded-audit
 * 計算並儲存擴大書審申報
 *
 * Body:
 * - company_id: 公司 ID (必填)
 * - company_name: 公司名稱 (必填)
 * - tax_id: 公司統編 (必填)
 * - tax_year: 課稅年度 (必填)
 * - industry_code: 行業代碼 (必填)
 * - other_income: 非營業收入 (可選)
 * - deductions: 扣除額 (可選)
 * - override_revenue: 覆蓋營收（用於預估）(可選)
 * - override_profit_rate: 覆蓋純益率 (可選)
 */
export const POST = withAuthAndSubscription('reports:read', {
  requiredFeature: 'income_tax',
  getCompanyId: async (req) => {
    const body = await req.clone().json()
    return body.company_id || ''
  },
})(async (request, { user, db, companyId }) => {
  const body = (await request.json()) as {
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

  const {
    company_name: companyName,
    tax_id: taxId,
    tax_year: taxYear,
    industry_code: industryCode,
    other_income: otherIncome,
    deductions,
    override_revenue: overrideRevenue,
    override_profit_rate: overrideProfitRate,
  } = body

  // 驗證必填參數
  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }
  if (!companyName) {
    return NextResponse.json({ error: 'company_name is required' }, { status: 400 })
  }
  if (!taxId) {
    return NextResponse.json({ error: 'tax_id is required' }, { status: 400 })
  }
  if (!taxYear || taxYear < 2000 || taxYear > 2100) {
    return NextResponse.json({ error: 'Invalid tax_year' }, { status: 400 })
  }
  if (!industryCode) {
    return NextResponse.json({ error: 'industry_code is required' }, { status: 400 })
  }

  // 執行計算
  const result = await runExpandedAuditCalculation(
    db,
    companyId,
    companyName,
    taxId,
    taxYear,
    industryCode,
    {
      other_income: otherIncome,
      deductions,
      override_revenue: overrideRevenue,
      override_profit_rate: overrideProfitRate,
    }
  )

  // 檢查現有記錄
  const existingFiling = await getIncomeTaxFilingByYear(db, companyId, taxYear)

  let filing
  if (existingFiling) {
    // 更新現有記錄
    filing = await saveCalculationResult(db, existingFiling.id, result, user.id)
  } else {
    // 建立新記錄
    filing = await createFilingFromResult(db, {
      result,
      created_by: user.id,
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      filing,
      calculation: result,
    },
    message: existingFiling ? '已更新申報記錄' : '已建立申報記錄',
  })
})

/**
 * PUT /api/accounting/income-tax/expanded-audit
 * 搜尋行業純益率
 *
 * Body:
 * - query: 搜尋關鍵字（行業代碼或名稱）
 * - tax_year: 適用年度
 */
export const PUT = withAuthAndSubscription('reports:read', {
  getCompanyId: async (req) => {
    const body = await req.clone().json()
    return body.company_id || ''
  },
})(async (request, { db }) => {
  const body = (await request.json()) as {
    query: string
    tax_year?: number
  }

  const { query, tax_year: taxYear } = body

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'query must be at least 2 characters' }, { status: 400 })
  }

  const year = taxYear || new Date().getFullYear()
  const results = await searchProfitRates(db, query, year)

  return NextResponse.json({
    success: true,
    data: results,
    meta: {
      query,
      tax_year: year,
      count: results.length,
    },
  })
})
