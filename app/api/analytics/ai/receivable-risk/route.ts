/**
 * AI 應收帳款風險分析 API
 *
 * GET /api/analytics/ai/receivable-risk?company_id=xxx
 * - 需要認證
 * - 需要專業版訂閱 (ai_receivable_risk 功能)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthOnlyAndSubscription } from '@/lib/api/middleware'
import {
  getReceivableAging,
  getFinancialSummary,
} from '@/lib/dal/financial-analysis/aggregator.dal'
import { analyzeReceivableRisk } from '@/lib/services/financial-analysis/ai-client.service'
import {
  getOrCreateAnalysis,
} from '@/lib/services/financial-analysis/cache.service'

// AI 分析月度用量限制（專業版）
const MONTHLY_LIMIT = 50

export const GET = withAuthOnlyAndSubscription({
  requiredFeature: 'ai_receivable_risk',
  getCompanyId: (req) => req.nextUrl.searchParams.get('company_id') || '',
})(async (request: NextRequest, { db, companyId }) => {
  if (!companyId) {
    return NextResponse.json(
      { error: 'company_id is required' },
      { status: 400 }
    )
  }

  // 取得財務資料
  const now = new Date()
  const startOfYear = `${now.getFullYear()}-01-01`
  const today = now.toISOString().split('T')[0]

  const [aging, summary] = await Promise.all([
    getReceivableAging(db, companyId),
    getFinancialSummary(db, companyId, startOfYear, today),
  ])

  // 使用快取包裝的分析
  const result = await getOrCreateAnalysis(
    companyId,
    'receivable_risk',
    { aging, summary },
    () => analyzeReceivableRisk(aging, summary),
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
        total_outstanding: aging.total_outstanding,
        total_overdue: aging.total_overdue,
        customer_count: aging.by_customer.length,
        average_days_outstanding: aging.average_days_outstanding,
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
