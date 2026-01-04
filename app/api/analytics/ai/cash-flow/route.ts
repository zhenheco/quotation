/**
 * AI 現金流分析 API
 *
 * GET /api/analytics/ai/cash-flow?company_id=xxx
 * - 需要認證
 * - 需要專業版訂閱 (ai_cash_flow 功能)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthOnlyAndSubscription } from '@/lib/api/middleware'
import {
  getCashFlowHistory,
  getFinancialSummary,
} from '@/lib/dal/financial-analysis/aggregator.dal'
import { analyzeCashFlow } from '@/lib/services/financial-analysis/ai-client.service'
import {
  getOrCreateAnalysis,
} from '@/lib/services/financial-analysis/cache.service'

// AI 分析月度用量限制（專業版）
const MONTHLY_LIMIT = 50

export const GET = withAuthOnlyAndSubscription({
  requiredFeature: 'ai_cash_flow',
  getCompanyId: (req) => req.nextUrl.searchParams.get('company_id') || '',
})(async (request: NextRequest, { db, companyId }) => {
  if (!companyId) {
    return NextResponse.json(
      { error: 'company_id is required' },
      { status: 400 }
    )
  }

  // 取得月份數參數（可選，預設 12）
  const monthsBack = parseInt(request.nextUrl.searchParams.get('months') || '12', 10)
  if (isNaN(monthsBack) || monthsBack < 3 || monthsBack > 24) {
    return NextResponse.json(
      { error: 'months must be between 3 and 24' },
      { status: 400 }
    )
  }

  // 取得財務資料
  const now = new Date()
  const startOfYear = `${now.getFullYear()}-01-01`
  const today = now.toISOString().split('T')[0]

  const [cashFlow, summary] = await Promise.all([
    getCashFlowHistory(db, companyId, monthsBack),
    getFinancialSummary(db, companyId, startOfYear, today),
  ])

  // 使用快取包裝的分析
  const result = await getOrCreateAnalysis(
    companyId,
    'cash_flow',
    { cashFlow, summary },
    () => analyzeCashFlow(cashFlow, summary),
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
        periods: cashFlow.periods.length,
        total_inflow: cashFlow.total_inflow,
        total_outflow: cashFlow.total_outflow,
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
