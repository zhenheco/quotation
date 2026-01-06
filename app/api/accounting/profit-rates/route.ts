/**
 * 行業純益率 API Route
 * 提供行業純益率查詢服務
 */

import { NextResponse } from 'next/server'
import { withAuth, withAuthOnly } from '@/lib/api/middleware'
import {
  getProfitRates,
  getProfitRateByCode,
  getIndustryCategories,
  createProfitRate,
  bulkImportProfitRates,
  DEFAULT_PROFIT_RATES,
} from '@/lib/dal/accounting/profit-rates.dal'

/**
 * GET /api/accounting/profit-rates
 * 查詢行業純益率
 *
 * Query params:
 * - tax_year: 適用年度 (可選，預設當年)
 * - industry_code: 特定行業代碼 (可選)
 * - category: 行業大類 (可選)
 * - search: 搜尋關鍵字 (可選)
 * - categories_only: 只取得行業大類列表 (可選)
 * - limit: 筆數限制 (可選，預設 100)
 * - offset: 位移 (可選，預設 0)
 */
export const GET = withAuthOnly(async (request, { db }) => {
  const searchParams = request.nextUrl.searchParams
  const taxYearStr = searchParams.get('tax_year')
  const industryCode = searchParams.get('industry_code')
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const categoriesOnly = searchParams.get('categories_only') === 'true'
  const limitStr = searchParams.get('limit')
  const offsetStr = searchParams.get('offset')

  const rawTaxYear = taxYearStr ? parseInt(taxYearStr, 10) : new Date().getFullYear()
  const limit = limitStr ? parseInt(limitStr, 10) : 100
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0

  // 轉換西元年為民國年（如果需要）
  // 如果年份 > 1911，表示是西元年，需要轉換
  // 如果年份 <= 200，表示已經是民國年格式
  const taxYear = rawTaxYear > 1911 ? rawTaxYear - 1911 : rawTaxYear

  // 只取得行業大類列表
  if (categoriesOnly) {
    const categories = await getIndustryCategories(db, taxYear)
    return NextResponse.json({
      success: true,
      data: categories,
      meta: { count: categories.length, tax_year: taxYear },
    })
  }

  // 查詢特定行業代碼
  if (industryCode) {
    const rate = await getProfitRateByCode(db, industryCode, taxYear)

    if (!rate) {
      return NextResponse.json(
        { error: `找不到行業代碼 ${industryCode} 在 ${taxYear} 年度的純益率` },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: rate })
  }

  // 查詢列表
  const rates = await getProfitRates(db, {
    tax_year: taxYear,
    industry_category: category || undefined,
    search: search || undefined,
    limit,
    offset,
  })

  return NextResponse.json({
    success: true,
    data: rates,
    meta: {
      count: rates.length,
      tax_year: taxYear,
      limit,
      offset,
    },
  })
})

/**
 * POST /api/accounting/profit-rates
 * 新增行業純益率（僅管理員）
 *
 * Body:
 * - industry_code: 行業代碼 (必填)
 * - industry_name: 行業名稱 (必填)
 * - industry_category: 行業大類 (可選)
 * - profit_rate: 純益率 (必填，0-1 之間)
 * - tax_year: 適用年度 (必填)
 * - source: 資料來源 (可選)
 * - notes: 備註 (可選)
 *
 * 或批次匯入:
 * - bulk: true
 * - rates: 純益率陣列
 */
export const POST = withAuth('reports:read')(async (request, { db }) => {
  const body = (await request.json()) as {
    bulk?: boolean
    rates?: Array<{
      industry_code: string
      industry_name: string
      industry_category?: string
      profit_rate: number
      tax_year: number
      source?: string
      notes?: string
    }>
    industry_code?: string
    industry_name?: string
    industry_category?: string
    profit_rate?: number
    tax_year?: number
    source?: string
    notes?: string
  }

  // 批次匯入
  if (body.bulk && body.rates) {
    if (!Array.isArray(body.rates) || body.rates.length === 0) {
      return NextResponse.json({ error: 'rates must be a non-empty array' }, { status: 400 })
    }

    const result = await bulkImportProfitRates(db, body.rates)

    return NextResponse.json({
      success: true,
      data: result,
      message: `成功匯入 ${result.success} 筆，失敗 ${result.failed} 筆`,
    })
  }

  // 單筆新增
  const { industry_code, industry_name, industry_category, profit_rate, tax_year, source, notes } =
    body

  if (!industry_code || !/^\d{4}$/.test(industry_code)) {
    return NextResponse.json({ error: 'industry_code must be a 4-digit string' }, { status: 400 })
  }
  if (!industry_name) {
    return NextResponse.json({ error: 'industry_name is required' }, { status: 400 })
  }
  if (profit_rate === undefined || profit_rate < 0 || profit_rate > 1) {
    return NextResponse.json(
      { error: 'profit_rate must be a number between 0 and 1' },
      { status: 400 }
    )
  }
  if (!tax_year || tax_year < 2000 || tax_year > 2100) {
    return NextResponse.json({ error: 'Invalid tax_year' }, { status: 400 })
  }

  const rate = await createProfitRate(db, {
    industry_code,
    industry_name,
    industry_category,
    profit_rate,
    tax_year,
    source,
    notes,
  })

  return NextResponse.json({
    success: true,
    data: rate,
    message: '已建立純益率記錄',
  })
})

/**
 * PUT /api/accounting/profit-rates
 * 取得預設純益率列表（靜態資料，不需認證）
 * 用於前端初始化載入
 */
export async function PUT() {
  const rates = Object.entries(DEFAULT_PROFIT_RATES).map(([code, info]) => ({
    industry_code: code,
    industry_name: info.name,
    industry_category: info.category,
    profit_rate: info.rate,
    profit_rate_display: `${(info.rate * 100).toFixed(1)}%`,
  }))

  // 按行業大類分組
  const byCategory: Record<string, typeof rates> = {}
  for (const rate of rates) {
    if (!byCategory[rate.industry_category]) {
      byCategory[rate.industry_category] = []
    }
    byCategory[rate.industry_category].push(rate)
  }

  return NextResponse.json({
    success: true,
    data: {
      rates,
      by_category: byCategory,
    },
    meta: {
      count: rates.length,
      categories: Object.keys(byCategory),
      source: 'default',
    },
  })
}
