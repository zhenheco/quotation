/**
 * AI Client Service for Financial Analysis
 *
 * 財務分析 AI 客戶端服務
 * 使用 OpenRouter 或 Cloudflare AI Gateway 呼叫 LLM
 */

import {
  isGatewayEnabled,
  getOpenRouterBaseUrl,
  buildOpenRouterHeaders,
} from '@/lib/cloudflare/ai-gateway'
import {
  CashFlowHistory,
  ReceivableAging,
  TaxSummary,
  FinancialSummary,
} from '@/lib/dal/financial-analysis/aggregator.dal'

// ============================================================================
// TYPES
// ============================================================================

export type AnalysisType = 'cash_flow' | 'receivable_risk' | 'tax_optimization'

export interface CashFlowAnalysis {
  summary: string
  predictions: Array<{
    period: string
    predicted_inflow: number
    predicted_outflow: number
    predicted_net: number
    confidence: number
  }>
  risks: string[]
  recommendations: string[]
  health_score: number // 0-100
}

export interface ReceivableRiskAnalysis {
  summary: string
  high_risk_customers: Array<{
    customer_id: string
    customer_name: string
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    risk_score: number
    outstanding_amount: number
    recommendation: string
  }>
  collection_priority: Array<{
    customer_id: string
    customer_name: string
    amount: number
    days_overdue: number
    suggested_action: string
  }>
  overall_risk_score: number
  recommendations: string[]
}

export interface TaxOptimizationAnalysis {
  summary: string
  current_tax_position: {
    estimated_vat: number
    estimated_income_tax: number
    effective_rate: number
  }
  optimization_opportunities: Array<{
    category: string
    potential_savings: number
    description: string
    implementation_difficulty: 'easy' | 'medium' | 'hard'
    legal_risk: 'none' | 'low' | 'medium'
  }>
  timing_recommendations: string[]
  compliance_notes: string[]
}

export interface AIAnalysisResult<T> {
  success: boolean
  data?: T
  error?: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  cached?: boolean
  generated_at: string
}

// ============================================================================
// PROMPTS
// ============================================================================

const SYSTEM_PROMPT = `你是一位專業的財務分析師，專門協助台灣中小企業進行財務分析。
你的分析應該：
1. 使用繁體中文回應
2. 提供具體、可行的建議
3. 符合台灣稅法規定
4. 考慮中小企業的實際營運限制
5. 以 JSON 格式回應，不要包含 markdown 標記

重要：你的回應必須是純 JSON 格式，不要包含任何解釋文字或 markdown 代碼塊。`

function buildCashFlowPrompt(data: CashFlowHistory, summary: FinancialSummary): string {
  return `請分析以下現金流資料並預測未來 3 個月的現金流。

## 歷史現金流資料（最近 12 個月）
${JSON.stringify(data.periods, null, 2)}

## 財務摘要
- 總收入：${summary.revenue.total.toLocaleString()} TWD
- 總支出：${summary.expenses.total.toLocaleString()} TWD
- 毛利率：${summary.profit.gross_margin.toFixed(1)}%
- 應收帳款：${summary.cash_position.accounts_receivable.toLocaleString()} TWD
- 應付帳款：${summary.cash_position.accounts_payable.toLocaleString()} TWD

請以下列 JSON 格式回應：
{
  "summary": "整體現金流狀況的摘要說明（2-3 句）",
  "predictions": [
    {
      "period": "YYYY-MM",
      "predicted_inflow": 數字,
      "predicted_outflow": 數字,
      "predicted_net": 數字,
      "confidence": 0.0-1.0
    }
  ],
  "risks": ["風險1", "風險2"],
  "recommendations": ["建議1", "建議2"],
  "health_score": 0-100
}`
}

function buildReceivableRiskPrompt(aging: ReceivableAging, summary: FinancialSummary): string {
  return `請分析以下應收帳款資料並評估風險。

## 應收帳款帳齡分析
${JSON.stringify(aging.buckets, null, 2)}

## 客戶應收明細（依金額排序）
${JSON.stringify(aging.by_customer.slice(0, 10), null, 2)}

## 財務指標
- 應收帳款總額：${aging.total_outstanding.toLocaleString()} TWD
- 逾期金額：${aging.total_overdue.toLocaleString()} TWD
- 平均逾期天數：${aging.average_days_outstanding} 天
- 總收入：${summary.revenue.total.toLocaleString()} TWD

請以下列 JSON 格式回應：
{
  "summary": "應收帳款風險的整體評估（2-3 句）",
  "high_risk_customers": [
    {
      "customer_id": "客戶ID",
      "customer_name": "客戶名稱",
      "risk_level": "low|medium|high|critical",
      "risk_score": 0-100,
      "outstanding_amount": 數字,
      "recommendation": "針對此客戶的具體建議"
    }
  ],
  "collection_priority": [
    {
      "customer_id": "客戶ID",
      "customer_name": "客戶名稱",
      "amount": 數字,
      "days_overdue": 數字,
      "suggested_action": "建議採取的催收行動"
    }
  ],
  "overall_risk_score": 0-100,
  "recommendations": ["整體建議1", "整體建議2"]
}`
}

function buildTaxOptimizationPrompt(tax: TaxSummary, summary: FinancialSummary): string {
  return `請分析以下稅務資料並提供合法節稅建議。

## 年度稅務摘要
- 年度：${tax.year}
- 營業收入：${tax.revenue.toLocaleString()} TWD
- 營業費用：${tax.expenses.toLocaleString()} TWD
- 銷項稅額：${tax.output_tax.toLocaleString()} TWD
- 進項稅額：${tax.input_tax.toLocaleString()} TWD
- 應納營業稅：${tax.net_tax.toLocaleString()} TWD
- 純益率：${tax.profit_rate.toFixed(1)}%
- 預估營所稅：${tax.estimated_income_tax.toLocaleString()} TWD

## 財務指標
- 毛利：${summary.profit.gross.toLocaleString()} TWD
- 毛利率：${summary.profit.gross_margin.toFixed(1)}%
- 銷項發票數：${tax.output_invoices_count}
- 進項發票數：${tax.input_invoices_count}

請以下列 JSON 格式回應：
{
  "summary": "稅務狀況的整體評估（2-3 句）",
  "current_tax_position": {
    "estimated_vat": 數字,
    "estimated_income_tax": 數字,
    "effective_rate": 數字（百分比）
  },
  "optimization_opportunities": [
    {
      "category": "類別（如：費用認列、資產折舊、研發扣抵等）",
      "potential_savings": 數字,
      "description": "具體說明如何節稅",
      "implementation_difficulty": "easy|medium|hard",
      "legal_risk": "none|low|medium"
    }
  ],
  "timing_recommendations": ["時機建議1", "時機建議2"],
  "compliance_notes": ["合規注意事項1", "合規注意事項2"]
}`
}

// ============================================================================
// AI CLIENT
// ============================================================================

const DEFAULT_MODEL = 'anthropic/claude-3-haiku'
// Fallback model for future use if primary model fails
// const FALLBACK_MODEL = 'meta-llama/llama-3.1-70b-instruct'

interface OpenRouterResponse {
  id: string
  choices: Array<{
    message: {
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model: string
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_MODEL
): Promise<{ content: string; model: string; usage?: OpenRouterResponse['usage'] }> {
  const baseUrl = getOpenRouterBaseUrl()
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  const headers = buildOpenRouterHeaders(isGatewayEnabled() ? undefined : apiKey)

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as OpenRouterResponse

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from OpenRouter')
  }

  return {
    content: data.choices[0].message.content,
    model: data.model || model,
    usage: data.usage,
  }
}

function parseJsonResponse<T>(content: string): T {
  // 移除可能的 markdown 代碼塊
  let cleaned = content.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  return JSON.parse(cleaned) as T
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * 執行現金流分析
 */
export async function analyzeCashFlow(
  cashFlow: CashFlowHistory,
  summary: FinancialSummary
): Promise<AIAnalysisResult<CashFlowAnalysis>> {
  try {
    const prompt = buildCashFlowPrompt(cashFlow, summary)
    const { content, model, usage } = await callOpenRouter(SYSTEM_PROMPT, prompt)
    const analysis = parseJsonResponse<CashFlowAnalysis>(content)

    return {
      success: true,
      data: analysis,
      model,
      usage,
      generated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[AI Client] Cash flow analysis failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      model: DEFAULT_MODEL,
      generated_at: new Date().toISOString(),
    }
  }
}

/**
 * 執行應收帳款風險分析
 */
export async function analyzeReceivableRisk(
  aging: ReceivableAging,
  summary: FinancialSummary
): Promise<AIAnalysisResult<ReceivableRiskAnalysis>> {
  try {
    const prompt = buildReceivableRiskPrompt(aging, summary)
    const { content, model, usage } = await callOpenRouter(SYSTEM_PROMPT, prompt)
    const analysis = parseJsonResponse<ReceivableRiskAnalysis>(content)

    return {
      success: true,
      data: analysis,
      model,
      usage,
      generated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[AI Client] Receivable risk analysis failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      model: DEFAULT_MODEL,
      generated_at: new Date().toISOString(),
    }
  }
}

/**
 * 執行稅務優化分析
 */
export async function analyzeTaxOptimization(
  tax: TaxSummary,
  summary: FinancialSummary
): Promise<AIAnalysisResult<TaxOptimizationAnalysis>> {
  try {
    const prompt = buildTaxOptimizationPrompt(tax, summary)
    const { content, model, usage } = await callOpenRouter(SYSTEM_PROMPT, prompt)
    const analysis = parseJsonResponse<TaxOptimizationAnalysis>(content)

    return {
      success: true,
      data: analysis,
      model,
      usage,
      generated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[AI Client] Tax optimization analysis failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      model: DEFAULT_MODEL,
      generated_at: new Date().toISOString(),
    }
  }
}

// ============================================================================
// STREAMING API (for long-running analysis)
// ============================================================================

export interface StreamingCallbacks {
  onToken?: (token: string) => void
  onComplete?: (content: string) => void
  onError?: (error: Error) => void
}

/**
 * 使用 Streaming 呼叫 AI（避免 Cloudflare Workers 超時）
 */
export async function streamAnalysis(
  analysisType: AnalysisType,
  data: {
    cashFlow?: CashFlowHistory
    aging?: ReceivableAging
    tax?: TaxSummary
    summary: FinancialSummary
  },
  callbacks?: StreamingCallbacks
): Promise<string> {
  let prompt: string

  switch (analysisType) {
    case 'cash_flow':
      if (!data.cashFlow) throw new Error('Cash flow data required')
      prompt = buildCashFlowPrompt(data.cashFlow, data.summary)
      break
    case 'receivable_risk':
      if (!data.aging) throw new Error('Receivable aging data required')
      prompt = buildReceivableRiskPrompt(data.aging, data.summary)
      break
    case 'tax_optimization':
      if (!data.tax) throw new Error('Tax summary data required')
      prompt = buildTaxOptimizationPrompt(data.tax, data.summary)
      break
    default:
      throw new Error(`Unknown analysis type: ${analysisType}`)
  }

  const baseUrl = getOpenRouterBaseUrl()
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  const headers = buildOpenRouterHeaders(isGatewayEnabled() ? undefined : apiKey)

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let fullContent = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter((line) => line.trim().startsWith('data:'))

      for (const line of lines) {
        const data = line.slice(5).trim()
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>
          }
          const token = parsed.choices?.[0]?.delta?.content || ''
          if (token) {
            fullContent += token
            callbacks?.onToken?.(token)
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    callbacks?.onComplete?.(fullContent)
    return fullContent
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Streaming error')
    callbacks?.onError?.(err)
    throw err
  }
}
