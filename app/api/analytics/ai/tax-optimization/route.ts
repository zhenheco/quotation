/**
 * AI 稅務優化分析 API
 *
 * GET /api/analytics/ai/tax-optimization?company_id=xxx&year=2025
 * - 需要認證
 * - 需要專業版訂閱 (ai_tax_optimization 功能)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthOnlyAndSubscription } from '@/lib/api/middleware'
import {
  getTaxSummary,
  getFinancialSummary,
} from '@/lib/dal/financial-analysis/aggregator.dal'
import { analyzeTaxOptimization } from '@/lib/services/financial-analysis/ai-client.service'
import {
  getOrCreateAnalysis,
} from '@/lib/services/financial-analysis/cache.service'

// AI 分析月度用量限制（專業版）
const MONTHLY_LIMIT = 50

export const GET = withAuthOnlyAndSubscription({
  requiredFeature: 'ai_tax_optimization',
  getCompanyId: (req) => req.nextUrl.searchParams.get('company_id') || '',
})(async (request: NextRequest, { db, companyId }) => {
  if (!companyId) {
    return NextResponse.json(
      { error: 'company_id is required' },
      { status: 400 }
    )
  }

  // 取得年份參數（可選，預設當年）
  const currentYear = new Date().getFullYear()
  const year = parseInt(request.nextUrl.searchParams.get('year') || String(currentYear), 10)

  if (isNaN(year) || year < 2020 || year > currentYear + 1) {
    return NextResponse.json(
      { error: `year must be between 2020 and ${currentYear + 1}` },
      { status: 400 }
    )
  }

  // 取得財務資料
  const startOfYear = `${year}-01-01`
  const endOfYear = `${year}-12-31`

  const [taxSummary, summary] = await Promise.all([
    getTaxSummary(db, companyId, year),
    getFinancialSummary(db, companyId, startOfYear, endOfYear),
  ])

  // 使用快取包裝的分析
  const result = await getOrCreateAnalysis(
    companyId,
    'tax_optimization',
    { taxSummary, summary, year },
    () => analyzeTaxOptimization(taxSummary, summary),
    MONTHLY_LIMIT,
    db
  )

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        data: null,
      },
      { status: result.error?.includes('limit') ? 402 : 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      analysis: result.data,
      input_data: {
        year: taxSummary.year,
        revenue: taxSummary.revenue,
        expenses: taxSummary.expenses,
        output_tax: taxSummary.output_tax,
        input_tax: taxSummary.input_tax,
        estimated_income_tax: taxSummary.estimated_income_tax,
      },
      metadata: {
        model: result.model,
        cached: result.cached,
        generated_at: result.generated_at,
      },
    },
  })
})

export const dynamic = 'force-dynamic'
