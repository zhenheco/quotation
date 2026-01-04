/**
 * 行業純益率資料存取層 (DAL)
 *
 * 管理擴大書審的行業純益率對照表
 * 資料來源：財政部每年公告
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================================================
// 類型定義
// ============================================================================

/**
 * 行業純益率記錄
 */
export interface IndustryProfitRate {
  id: string
  industry_code: string // 行業代碼（4 碼）
  industry_name: string // 行業名稱
  industry_category: string | null // 行業大類
  profit_rate: number // 純益率（小數，如 0.06 = 6%）
  tax_year: number // 適用年度
  source: string | null // 資料來源
  notes: string | null // 備註
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * 建立純益率輸入
 */
export interface CreateProfitRateInput {
  industry_code: string
  industry_name: string
  industry_category?: string
  profit_rate: number
  tax_year: number
  source?: string
  notes?: string
}

/**
 * 更新純益率輸入
 */
export interface UpdateProfitRateInput {
  industry_name?: string
  industry_category?: string
  profit_rate?: number
  source?: string
  notes?: string
  is_active?: boolean
}

/**
 * 查詢選項
 */
export interface ProfitRateQueryOptions {
  tax_year?: number
  industry_category?: string
  search?: string
  is_active?: boolean
  limit?: number
  offset?: number
}

// ============================================================================
// 預設純益率資料（靜態 fallback）
// ============================================================================

/**
 * 常見行業純益率參考表（113 年度參考）
 * 當資料庫未建立時作為 fallback 使用
 */
export const DEFAULT_PROFIT_RATES: Record<string, {
  name: string
  category: string
  rate: number
}> = {
  // 資訊服務業
  '6201': { name: '電腦程式設計業', category: '資訊及通訊傳播業', rate: 0.06 },
  '6202': { name: '電腦諮詢服務業', category: '資訊及通訊傳播業', rate: 0.08 },
  '6209': { name: '其他資訊服務業', category: '資訊及通訊傳播業', rate: 0.07 },
  '6311': { name: '資料處理業', category: '資訊及通訊傳播業', rate: 0.08 },

  // 批發零售業
  '4610': { name: '綜合商品批發業', category: '批發及零售業', rate: 0.04 },
  '4619': { name: '其他批發業', category: '批發及零售業', rate: 0.04 },
  '4711': { name: '便利商店業', category: '批發及零售業', rate: 0.03 },
  '4719': { name: '其他綜合商品零售業', category: '批發及零售業', rate: 0.03 },
  '4741': { name: '資訊及通訊設備零售業', category: '批發及零售業', rate: 0.04 },

  // 餐飲業
  '5610': { name: '餐館業', category: '住宿及餐飲業', rate: 0.06 },
  '5620': { name: '外燴及團膳承包業', category: '住宿及餐飲業', rate: 0.06 },
  '5630': { name: '飲料店業', category: '住宿及餐飲業', rate: 0.08 },

  // 專業服務業
  '6910': { name: '法律服務業', category: '專業、科學及技術服務業', rate: 0.15 },
  '6920': { name: '會計及記帳服務業', category: '專業、科學及技術服務業', rate: 0.12 },
  '7010': { name: '企業總管理機構及管理顧問業', category: '專業、科學及技術服務業', rate: 0.10 },
  '7020': { name: '管理顧問業', category: '專業、科學及技術服務業', rate: 0.10 },
  '7111': { name: '建築師事務所', category: '專業、科學及技術服務業', rate: 0.10 },
  '7112': { name: '工程技術顧問業', category: '專業、科學及技術服務業', rate: 0.08 },
  '7310': { name: '廣告業', category: '專業、科學及技術服務業', rate: 0.08 },
  '7320': { name: '市場研究及民意調查業', category: '專業、科學及技術服務業', rate: 0.10 },
  '7410': { name: '設計業', category: '專業、科學及技術服務業', rate: 0.10 },
  '7490': { name: '其他專業、科學及技術服務業', category: '專業、科學及技術服務業', rate: 0.08 },

  // 製造業
  '1010': { name: '屠宰業', category: '製造業', rate: 0.03 },
  '1090': { name: '其他食品製造業', category: '製造業', rate: 0.05 },
  '2511': { name: '金屬結構製造業', category: '製造業', rate: 0.05 },
  '2599': { name: '其他金屬製品製造業', category: '製造業', rate: 0.05 },
  '2610': { name: '電子零組件製造業', category: '製造業', rate: 0.06 },
  '2620': { name: '電腦及周邊設備製造業', category: '製造業', rate: 0.06 },
  '2732': { name: '電線及電纜製造業', category: '製造業', rate: 0.04 },

  // 營造業
  '4100': { name: '建築工程業', category: '營建工程業', rate: 0.03 },
  '4210': { name: '土木工程業', category: '營建工程業', rate: 0.04 },
  '4321': { name: '電器及電信工程業', category: '營建工程業', rate: 0.05 },
  '4322': { name: '配管及冷凍空調工程業', category: '營建工程業', rate: 0.05 },
  '4329': { name: '其他建築設備安裝業', category: '營建工程業', rate: 0.05 },
  '4390': { name: '其他專門營造業', category: '營建工程業', rate: 0.04 },

  // 運輸業
  '4931': { name: '汽車貨運業', category: '運輸及倉儲業', rate: 0.05 },
  '4940': { name: '汽車客運業', category: '運輸及倉儲業', rate: 0.04 },
  '5210': { name: '報關服務業', category: '運輸及倉儲業', rate: 0.06 },
  '5220': { name: '船務代理業', category: '運輸及倉儲業', rate: 0.06 },

  // 不動產業
  '6811': { name: '不動產買賣業', category: '不動產業', rate: 0.10 },
  '6812': { name: '不動產租賃業', category: '不動產業', rate: 0.30 },

  // 教育服務業
  '8550': { name: '補習教育業', category: '教育業', rate: 0.10 },
  '8560': { name: '教育輔助服務業', category: '教育業', rate: 0.08 },

  // 支援服務業
  '7810': { name: '人力仲介業', category: '支援服務業', rate: 0.08 },
  '7820': { name: '人力供應業', category: '支援服務業', rate: 0.05 },
  '8010': { name: '保全服務業', category: '支援服務業', rate: 0.06 },
  '8110': { name: '建築物清潔服務業', category: '支援服務業', rate: 0.05 },
}

// ============================================================================
// 查詢函數
// ============================================================================

/**
 * 根據行業代碼取得純益率
 */
export async function getProfitRateByCode(
  db: SupabaseClient,
  industryCode: string,
  taxYear: number
): Promise<IndustryProfitRate | null> {
  try {
    const { data, error } = await db
      .from('industry_profit_rates')
      .select('*')
      .eq('industry_code', industryCode)
      .eq('tax_year', taxYear)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (data) {
      return data as IndustryProfitRate
    }
  } catch (error) {
    // 資料表可能不存在，使用 fallback
    console.warn('[ProfitRates] Database query failed, using fallback data:', error)
  }

  // Fallback 到靜態資料
  const fallback = DEFAULT_PROFIT_RATES[industryCode]
  if (fallback) {
    return {
      id: `fallback-${industryCode}-${taxYear}`,
      industry_code: industryCode,
      industry_name: fallback.name,
      industry_category: fallback.category,
      profit_rate: fallback.rate,
      tax_year: taxYear,
      source: '預設參考值',
      notes: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  return null
}

/**
 * 取得所有純益率（指定年度）
 */
export async function getProfitRates(
  db: SupabaseClient,
  options: ProfitRateQueryOptions = {}
): Promise<IndustryProfitRate[]> {
  const {
    tax_year,
    industry_category,
    search,
    is_active = true,
    limit = 100,
    offset = 0,
  } = options

  try {
    let query = db
      .from('industry_profit_rates')
      .select('*')
      .eq('is_active', is_active)
      .order('industry_code', { ascending: true })
      .range(offset, offset + limit - 1)

    if (tax_year) {
      query = query.eq('tax_year', tax_year)
    }

    if (industry_category) {
      query = query.eq('industry_category', industry_category)
    }

    if (search) {
      query = query.or(`industry_code.ilike.%${search}%,industry_name.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data || []) as IndustryProfitRate[]
  } catch (error) {
    console.warn('[ProfitRates] Database query failed, using fallback data:', error)

    // Fallback 到靜態資料
    const results: IndustryProfitRate[] = []
    const searchLower = search?.toLowerCase()

    for (const [code, info] of Object.entries(DEFAULT_PROFIT_RATES)) {
      // 搜尋過濾
      if (searchLower) {
        if (!code.includes(search!) && !info.name.toLowerCase().includes(searchLower)) {
          continue
        }
      }

      // 分類過濾
      if (industry_category && info.category !== industry_category) {
        continue
      }

      results.push({
        id: `fallback-${code}-${tax_year || new Date().getFullYear()}`,
        industry_code: code,
        industry_name: info.name,
        industry_category: info.category,
        profit_rate: info.rate,
        tax_year: tax_year || new Date().getFullYear(),
        source: '預設參考值',
        notes: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    // 排序並分頁
    results.sort((a, b) => a.industry_code.localeCompare(b.industry_code))
    return results.slice(offset, offset + limit)
  }
}

/**
 * 搜尋純益率
 */
export async function searchProfitRates(
  db: SupabaseClient,
  query: string,
  taxYear: number
): Promise<IndustryProfitRate[]> {
  return getProfitRates(db, {
    tax_year: taxYear,
    search: query,
    limit: 20,
  })
}

/**
 * 取得所有行業大類
 */
export async function getIndustryCategories(
  db: SupabaseClient,
  taxYear?: number
): Promise<string[]> {
  try {
    let query = db
      .from('industry_profit_rates')
      .select('industry_category')
      .eq('is_active', true)

    if (taxYear) {
      query = query.eq('tax_year', taxYear)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    // 去重
    const categories = [...new Set((data || []).map((d) => d.industry_category).filter(Boolean))]
    return categories.sort() as string[]
  } catch (error) {
    console.warn('[ProfitRates] Database query failed, using fallback data:', error)

    // Fallback
    const categories = [...new Set(Object.values(DEFAULT_PROFIT_RATES).map((r) => r.category))]
    return categories.sort()
  }
}

// ============================================================================
// 寫入函數
// ============================================================================

/**
 * 建立純益率記錄
 */
export async function createProfitRate(
  db: SupabaseClient,
  input: CreateProfitRateInput
): Promise<IndustryProfitRate> {
  const { data, error } = await db
    .from('industry_profit_rates')
    .insert({
      id: crypto.randomUUID(),
      industry_code: input.industry_code,
      industry_name: input.industry_name,
      industry_category: input.industry_category || null,
      profit_rate: input.profit_rate,
      tax_year: input.tax_year,
      source: input.source || null,
      notes: input.notes || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`行業代碼 ${input.industry_code} 在年度 ${input.tax_year} 已存在`)
    }
    throw new Error(`建立純益率記錄失敗: ${error.message}`)
  }

  return data as IndustryProfitRate
}

/**
 * 更新純益率記錄
 */
export async function updateProfitRate(
  db: SupabaseClient,
  id: string,
  input: UpdateProfitRateInput
): Promise<IndustryProfitRate> {
  const { data, error } = await db
    .from('industry_profit_rates')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`更新純益率記錄失敗: ${error.message}`)
  }

  return data as IndustryProfitRate
}

/**
 * 刪除純益率記錄（軟刪除）
 */
export async function deleteProfitRate(
  db: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await db
    .from('industry_profit_rates')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(`刪除純益率記錄失敗: ${error.message}`)
  }
}

/**
 * 批次匯入純益率
 */
export async function bulkImportProfitRates(
  db: SupabaseClient,
  rates: CreateProfitRateInput[]
): Promise<{
  success: number
  failed: number
  errors: Array<{ code: string; error: string }>
}> {
  const result = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ code: string; error: string }>,
  }

  for (const rate of rates) {
    try {
      await createProfitRate(db, rate)
      result.success++
    } catch (error) {
      result.failed++
      result.errors.push({
        code: rate.industry_code,
        error: error instanceof Error ? error.message : '未知錯誤',
      })
    }
  }

  return result
}

/**
 * 複製上一年度純益率到新年度
 */
export async function copyProfitRatesToNewYear(
  db: SupabaseClient,
  fromYear: number,
  toYear: number
): Promise<number> {
  // 取得上一年度資料
  const previousRates = await getProfitRates(db, {
    tax_year: fromYear,
    limit: 10000,
  })

  let copied = 0

  for (const rate of previousRates) {
    try {
      await createProfitRate(db, {
        industry_code: rate.industry_code,
        industry_name: rate.industry_name,
        industry_category: rate.industry_category || undefined,
        profit_rate: rate.profit_rate,
        tax_year: toYear,
        source: `從 ${fromYear} 年度複製`,
        notes: rate.notes || undefined,
      })
      copied++
    } catch {
      // 已存在則跳過
    }
  }

  return copied
}
