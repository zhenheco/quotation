/**
 * AI Analysis Cache Service
 *
 * 財務分析結果快取服務
 * 使用 Supabase 作為持久化快取儲存
 */

import { SupabaseClient, getSupabaseClient } from '@/lib/db/supabase-client'
import {
  AnalysisType,
  AIAnalysisResult,
} from './ai-client.service'

// ============================================================================
// TYPES
// ============================================================================

export interface CachedAnalysis<T> {
  id: string
  company_id: string
  analysis_type: AnalysisType
  result: T
  model: string
  usage_tokens: number
  cache_key: string
  expires_at: string
  created_at: string
}

export interface CacheConfig {
  /**
   * 快取存活時間（秒）
   * cash_flow: 4 小時（財務資料變動頻繁）
   * receivable_risk: 12 小時
   * tax_optimization: 24 小時（稅務計算較穩定）
   */
  ttl: Record<AnalysisType, number>
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: {
    cash_flow: 4 * 60 * 60, // 4 hours
    receivable_risk: 12 * 60 * 60, // 12 hours
    tax_optimization: 24 * 60 * 60, // 24 hours
  },
}

// ============================================================================
// CACHE KEY GENERATION
// ============================================================================

/**
 * 產生快取鍵
 * 基於公司 ID、分析類型和資料特徵
 */
export function generateCacheKey(
  companyId: string,
  analysisType: AnalysisType,
  dataHash?: string
): string {
  const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return `${companyId}:${analysisType}:${date}:${dataHash || 'default'}`
}

/**
 * 計算資料的簡易 hash（用於判斷資料是否有變化）
 */
export function calculateDataHash(data: unknown): string {
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * 從快取取得分析結果
 */
export async function getCachedAnalysis<T>(
  companyId: string,
  analysisType: AnalysisType,
  dataHash?: string,
  db?: SupabaseClient
): Promise<CachedAnalysis<T> | null> {
  const client = db || getSupabaseClient()
  const cacheKey = generateCacheKey(companyId, analysisType, dataHash)
  const now = new Date().toISOString()

  const { data, error } = await client
    .from('ai_analysis_cache')
    .select('*')
    .eq('company_id', companyId)
    .eq('analysis_type', analysisType)
    .eq('cache_key', cacheKey)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[Cache] Failed to get cached analysis:', error)
    return null
  }

  if (!data) {
    return null
  }

  return {
    id: data.id,
    company_id: data.company_id,
    analysis_type: data.analysis_type,
    result: data.result as T,
    model: data.model,
    usage_tokens: data.usage_tokens,
    cache_key: data.cache_key,
    expires_at: data.expires_at,
    created_at: data.created_at,
  }
}

/**
 * 儲存分析結果到快取
 */
export async function setCachedAnalysis<T>(
  companyId: string,
  analysisType: AnalysisType,
  result: AIAnalysisResult<T>,
  dataHash?: string,
  config: CacheConfig = DEFAULT_CACHE_CONFIG,
  db?: SupabaseClient
): Promise<string | null> {
  if (!result.success || !result.data) {
    return null
  }

  const client = db || getSupabaseClient()
  const cacheKey = generateCacheKey(companyId, analysisType, dataHash)
  const ttl = config.ttl[analysisType]
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()

  const { data, error } = await client
    .from('ai_analysis_cache')
    .upsert({
      id: crypto.randomUUID(),
      company_id: companyId,
      analysis_type: analysisType,
      result: result.data,
      model: result.model,
      usage_tokens: result.usage?.total_tokens || 0,
      cache_key: cacheKey,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'company_id,analysis_type,cache_key',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Cache] Failed to cache analysis:', error)
    return null
  }

  return data?.id || null
}

/**
 * 清除公司的所有快取
 */
export async function clearCompanyCache(
  companyId: string,
  analysisType?: AnalysisType,
  db?: SupabaseClient
): Promise<number> {
  const client = db || getSupabaseClient()

  let query = client
    .from('ai_analysis_cache')
    .delete()
    .eq('company_id', companyId)

  if (analysisType) {
    query = query.eq('analysis_type', analysisType)
  }

  const { count, error } = await query

  if (error) {
    console.error('[Cache] Failed to clear cache:', error)
    return 0
  }

  return count || 0
}

/**
 * 清除過期的快取（可由 cron job 定期執行）
 */
export async function clearExpiredCache(
  db?: SupabaseClient
): Promise<number> {
  const client = db || getSupabaseClient()
  const now = new Date().toISOString()

  const { count, error } = await client
    .from('ai_analysis_cache')
    .delete()
    .lt('expires_at', now)

  if (error) {
    console.error('[Cache] Failed to clear expired cache:', error)
    return 0
  }

  return count || 0
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * 記錄 AI 用量
 */
export async function trackAIUsage(
  companyId: string,
  analysisType: AnalysisType,
  tokens: number,
  cost?: number,
  db?: SupabaseClient
): Promise<void> {
  const client = db || getSupabaseClient()
  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // 更新月度用量
  const { error } = await client
    .from('ai_usage_logs')
    .upsert({
      id: crypto.randomUUID(),
      company_id: companyId,
      period,
      analysis_type: analysisType,
      request_count: 1,
      total_tokens: tokens,
      total_cost: cost || 0,
      created_at: now.toISOString(),
    }, {
      onConflict: 'company_id,period,analysis_type',
      ignoreDuplicates: false,
    })

  if (error) {
    // 如果 upsert 失敗（可能是 unique 約束），嘗試更新現有記錄
    const { error: updateError } = await client.rpc('increment_ai_usage', {
      p_company_id: companyId,
      p_period: period,
      p_analysis_type: analysisType,
      p_tokens: tokens,
      p_cost: cost || 0,
    })

    if (updateError) {
      console.error('[Cache] Failed to track AI usage:', updateError)
    }
  }
}

/**
 * 取得公司的 AI 用量統計
 */
export async function getAIUsageStats(
  companyId: string,
  period?: string,
  db?: SupabaseClient
): Promise<{
  period: string
  total_requests: number
  total_tokens: number
  total_cost: number
  by_type: Record<AnalysisType, { requests: number; tokens: number }>
}> {
  const client = db || getSupabaseClient()
  const targetPeriod = period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const { data, error } = await client
    .from('ai_usage_logs')
    .select('analysis_type, request_count, total_tokens, total_cost')
    .eq('company_id', companyId)
    .eq('period', targetPeriod)

  if (error) {
    console.error('[Cache] Failed to get AI usage stats:', error)
    return {
      period: targetPeriod,
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      by_type: {
        cash_flow: { requests: 0, tokens: 0 },
        receivable_risk: { requests: 0, tokens: 0 },
        tax_optimization: { requests: 0, tokens: 0 },
      },
    }
  }

  const byType: Record<AnalysisType, { requests: number; tokens: number }> = {
    cash_flow: { requests: 0, tokens: 0 },
    receivable_risk: { requests: 0, tokens: 0 },
    tax_optimization: { requests: 0, tokens: 0 },
  }

  let totalRequests = 0
  let totalTokens = 0
  let totalCost = 0

  for (const row of data || []) {
    const type = row.analysis_type as AnalysisType
    if (byType[type]) {
      byType[type].requests = row.request_count || 0
      byType[type].tokens = row.total_tokens || 0
    }
    totalRequests += row.request_count || 0
    totalTokens += row.total_tokens || 0
    totalCost += parseFloat(String(row.total_cost)) || 0
  }

  return {
    period: targetPeriod,
    total_requests: totalRequests,
    total_tokens: totalTokens,
    total_cost: totalCost,
    by_type: byType,
  }
}

/**
 * 檢查是否超過用量限制
 */
export async function checkUsageLimit(
  companyId: string,
  analysisType: AnalysisType,
  monthlyLimit: number,
  db?: SupabaseClient
): Promise<{
  allowed: boolean
  current_usage: number
  limit: number
  remaining: number
}> {
  const stats = await getAIUsageStats(companyId, undefined, db)
  const currentUsage = stats.by_type[analysisType]?.requests || 0

  return {
    allowed: currentUsage < monthlyLimit,
    current_usage: currentUsage,
    limit: monthlyLimit,
    remaining: Math.max(0, monthlyLimit - currentUsage),
  }
}

// ============================================================================
// HIGH-LEVEL API
// ============================================================================

/**
 * 取得分析結果（優先使用快取）
 */
export async function getOrCreateAnalysis<T>(
  companyId: string,
  analysisType: AnalysisType,
  inputData: unknown,
  analyzer: () => Promise<AIAnalysisResult<T>>,
  monthlyLimit?: number,
  db?: SupabaseClient
): Promise<AIAnalysisResult<T> & { cached: boolean }> {
  const client = db || getSupabaseClient()
  const dataHash = calculateDataHash(inputData)

  // 1. 檢查用量限制
  if (monthlyLimit !== undefined) {
    const usageCheck = await checkUsageLimit(companyId, analysisType, monthlyLimit, client)
    if (!usageCheck.allowed) {
      return {
        success: false,
        error: `Monthly AI usage limit reached (${usageCheck.current_usage}/${usageCheck.limit})`,
        model: '',
        generated_at: new Date().toISOString(),
        cached: false,
      }
    }
  }

  // 2. 嘗試從快取取得
  const cached = await getCachedAnalysis<T>(companyId, analysisType, dataHash, client)
  if (cached) {
    console.log(`[Cache] Hit for ${analysisType} (key: ${cached.cache_key})`)
    return {
      success: true,
      data: cached.result,
      model: cached.model,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: cached.usage_tokens },
      generated_at: cached.created_at,
      cached: true,
    }
  }

  // 3. 執行分析
  console.log(`[Cache] Miss for ${analysisType}, running analysis...`)
  const result = await analyzer()

  // 4. 儲存到快取（如果成功）
  if (result.success) {
    await setCachedAnalysis(companyId, analysisType, result, dataHash, DEFAULT_CACHE_CONFIG, client)

    // 記錄用量
    if (result.usage?.total_tokens) {
      await trackAIUsage(companyId, analysisType, result.usage.total_tokens, undefined, client)
    }
  }

  return {
    ...result,
    cached: false,
  }
}
