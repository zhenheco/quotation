/**
 * 發票 OCR 服務
 * 透過 Cloudflare AI Gateway + OpenRouter 調用視覺模型識別發票
 * 支援 Fallback 機制：Qwen-VL-Plus → GLM-4.6V
 */

import {
  isGatewayEnabled,
  getOpenRouterBaseUrl,
  buildOpenRouterHeaders,
} from '@/lib/cloudflare/ai-gateway'

// 支援的 OCR 模型（按優先順序排列）
const OCR_MODELS = [
  'qwen/qwen-vl-plus', // 主要：中文識別最佳
  'z-ai/glm-4.6v', // Fallback：智譜 GLM-4.6V
] as const

// 發票識別提示詞（台灣發票格式）
const INVOICE_OCR_PROMPT = `請從這張台灣發票圖片中提取以下資訊，以 JSON 格式回傳：
{
  "number": "發票號碼（例如：AB-12345678）",
  "type": "發票類型（OUTPUT 銷項發票 或 INPUT 進項發票）",
  "date": "發票日期（格式：YYYY-MM-DD）",
  "untaxed_amount": 未稅金額（數字，不含逗號）,
  "tax_amount": 稅額（數字，不含逗號）,
  "total_amount": 含稅總額（數字，不含逗號）,
  "counterparty_name": "交易對象名稱",
  "counterparty_tax_id": "統一編號（8位數字）",
  "description": "品名或摘要",
  "confidence": {
    "number": 信心度 0-1,
    "type": 信心度 0-1,
    "date": 信心度 0-1,
    "untaxed_amount": 信心度 0-1,
    "tax_amount": 信心度 0-1,
    "total_amount": 信心度 0-1,
    "counterparty_name": 信心度 0-1,
    "counterparty_tax_id": 信心度 0-1,
    "description": 信心度 0-1
  }
}

重要提示：
1. 只回傳純 JSON，不要任何說明或 markdown 格式
2. 如果某欄位無法識別，設為 null，並將該欄位的信心度設為 0
3. 信心度範圍 0-1，1 表示完全確定，0.5 以下表示不確定
4. 如果是銷售給客戶的發票，type 設為 "OUTPUT"
5. 如果是從供應商收到的發票，type 設為 "INPUT"
6. 發票號碼格式通常是兩個英文字母加上 8 位數字
7. 金額欄位必須是數字，不能有逗號或貨幣符號`

/**
 * 發票 OCR 識別結果資料結構
 */
export interface InvoiceOCRData {
  number: string | null
  type: 'OUTPUT' | 'INPUT' | null
  date: string | null
  untaxed_amount: number | null
  tax_amount: number | null
  total_amount: number | null
  counterparty_name: string | null
  counterparty_tax_id: string | null
  description: string | null
}

/**
 * 各欄位的信心度
 */
export interface InvoiceOCRConfidence {
  number: number
  type: number
  date: number
  untaxed_amount: number
  tax_amount: number
  total_amount: number
  counterparty_name: number
  counterparty_tax_id: number
  description: number
}

/**
 * OCR 完整回應結果
 */
export interface InvoiceOCRResult {
  success: boolean
  data: InvoiceOCRData
  confidence: InvoiceOCRConfidence
  model: string
  error?: string
}

/**
 * OCR API 回應結構（OpenAI 格式）
 */
interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
    code?: string
  }
}

/**
 * 掃描發票並提取資訊
 * @param imageBase64 Base64 編碼的圖片資料（不含 data:image/... 前綴）
 * @returns 結構化的發票資訊與信心度
 */
export async function scanInvoice(imageBase64: string): Promise<InvoiceOCRResult> {
  const errors: string[] = []

  for (const model of OCR_MODELS) {
    try {
      console.log(`[Invoice OCR] 嘗試使用模型: ${model}`)
      const result = await callOpenRouter(model, imageBase64)
      if (result) {
        console.log(`[Invoice OCR] 成功使用模型: ${model}`)
        return {
          success: true,
          data: result.data,
          confidence: result.confidence,
          model,
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[Invoice OCR] ${model} 失敗:`, errorMsg)
      errors.push(`${model}: ${errorMsg}`)
    }
  }

  // 所有模型都失敗時，回傳空結果
  return {
    success: false,
    data: {
      number: null,
      type: null,
      date: null,
      untaxed_amount: null,
      tax_amount: null,
      total_amount: null,
      counterparty_name: null,
      counterparty_tax_id: null,
      description: null,
    },
    confidence: {
      number: 0,
      type: 0,
      date: 0,
      untaxed_amount: 0,
      tax_amount: 0,
      total_amount: 0,
      counterparty_name: 0,
      counterparty_tax_id: 0,
      description: 0,
    },
    model: '',
    error: `所有 OCR 模型都失敗: ${errors.join('; ')}`,
  }
}

/**
 * 透過 OpenRouter API 呼叫視覺模型
 */
async function callOpenRouter(
  model: string,
  imageBase64: string
): Promise<{ data: InvoiceOCRData; confidence: InvoiceOCRConfidence } | null> {
  // 取得 API 端點和 headers
  const baseUrl = getOpenRouterBaseUrl()
  const apiUrl = `${baseUrl}/chat/completions`

  // Gateway 模式：使用 BYOK（存儲的 API key），不需要傳 apiKey
  // 非 Gateway 模式：需要 OPENROUTER_API_KEY
  const apiKey = isGatewayEnabled() ? undefined : process.env.OPENROUTER_API_KEY?.trim()

  if (!isGatewayEnabled() && !apiKey) {
    throw new Error('缺少 OPENROUTER_API_KEY 環境變數')
  }

  const headers = buildOpenRouterHeaders(apiKey)

  // 加入 OpenRouter 特定 headers
  headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL || 'https://quote24.cc'
  headers['X-Title'] = 'Quotation System - Invoice OCR'

  console.log(
    `[Invoice OCR] 使用 ${isGatewayEnabled() ? 'AI Gateway' : '直連'} 模式, URL: ${apiUrl}`
  )

  // 自動偵測圖片格式
  const mimeType = detectImageMimeType(imageBase64)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: INVOICE_OCR_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.1, // 低溫度以確保穩定輸出
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 請求失敗 (${response.status}): ${errorText}`)
  }

  const responseData = (await response.json()) as OpenRouterResponse

  if (responseData.error) {
    throw new Error(responseData.error.message || '未知 API 錯誤')
  }

  const content = responseData.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('API 回應中沒有內容')
  }

  // 解析 JSON 回應
  return parseInvoiceJson(content)
}

/**
 * 解析模型回傳的 JSON 字串
 */
function parseInvoiceJson(
  content: string
): { data: InvoiceOCRData; confidence: InvoiceOCRConfidence } | null {
  // 嘗試移除可能的 markdown 代碼塊
  let jsonStr = content.trim()

  // 處理 ```json ... ``` 格式
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  try {
    const parsed = JSON.parse(jsonStr) as {
      number?: string
      type?: string
      date?: string
      untaxed_amount?: number
      tax_amount?: number
      total_amount?: number
      counterparty_name?: string
      counterparty_tax_id?: string
      description?: string
      confidence?: Partial<InvoiceOCRConfidence>
    }

    return normalizeInvoiceData(parsed)
  } catch {
    console.error('[Invoice OCR] JSON 解析失敗，原始內容:', content)
    throw new Error('無法解析 OCR 結果為 JSON 格式')
  }
}

/**
 * 標準化發票資料
 */
function normalizeInvoiceData(parsed: {
  number?: string
  type?: string
  date?: string
  untaxed_amount?: number
  tax_amount?: number
  total_amount?: number
  counterparty_name?: string
  counterparty_tax_id?: string
  description?: string
  confidence?: Partial<InvoiceOCRConfidence>
}): { data: InvoiceOCRData; confidence: InvoiceOCRConfidence } {
  // 處理發票類型
  let invoiceType: 'OUTPUT' | 'INPUT' | null = null
  if (parsed.type) {
    const typeUpper = parsed.type.toUpperCase().trim()
    if (typeUpper === 'OUTPUT' || typeUpper === 'INPUT') {
      invoiceType = typeUpper
    }
  }

  // 處理日期格式
  let normalizedDate: string | null = null
  if (parsed.date) {
    const dateStr = parsed.date.trim()
    // 驗證 YYYY-MM-DD 格式
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      normalizedDate = dateStr
    } else {
      // 嘗試解析其他格式（如 YYYY/MM/DD）
      const dateMatch = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
      if (dateMatch) {
        const [, year, month, day] = dateMatch
        normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }
  }

  const confidence: InvoiceOCRConfidence = {
    number: parsed.confidence?.number ?? (parsed.number ? 0.8 : 0),
    type: parsed.confidence?.type ?? (invoiceType ? 0.8 : 0),
    date: parsed.confidence?.date ?? (normalizedDate ? 0.8 : 0),
    untaxed_amount:
      parsed.confidence?.untaxed_amount ??
      (parsed.untaxed_amount != null ? 0.8 : 0),
    tax_amount:
      parsed.confidence?.tax_amount ?? (parsed.tax_amount != null ? 0.8 : 0),
    total_amount:
      parsed.confidence?.total_amount ?? (parsed.total_amount != null ? 0.8 : 0),
    counterparty_name:
      parsed.confidence?.counterparty_name ?? (parsed.counterparty_name ? 0.7 : 0),
    counterparty_tax_id:
      parsed.confidence?.counterparty_tax_id ?? (parsed.counterparty_tax_id ? 0.7 : 0),
    description: parsed.confidence?.description ?? (parsed.description ? 0.6 : 0),
  }

  return {
    data: {
      number: parsed.number?.trim() || null,
      type: invoiceType,
      date: normalizedDate,
      untaxed_amount:
        typeof parsed.untaxed_amount === 'number' ? parsed.untaxed_amount : null,
      tax_amount: typeof parsed.tax_amount === 'number' ? parsed.tax_amount : null,
      total_amount:
        typeof parsed.total_amount === 'number' ? parsed.total_amount : null,
      counterparty_name: parsed.counterparty_name?.trim() || null,
      counterparty_tax_id: parsed.counterparty_tax_id?.trim() || null,
      description: parsed.description?.trim() || null,
    },
    confidence,
  }
}

/**
 * 從 Base64 字串偵測圖片 MIME 類型
 */
function detectImageMimeType(base64: string): string {
  // 檢查常見圖片格式的魔數
  const signatures: Record<string, string> = {
    '/9j/': 'image/jpeg',
    iVBORw0KGgo: 'image/png',
    R0lGODlh: 'image/gif',
    R0lGODdh: 'image/gif',
    UklGR: 'image/webp',
    JVBERi0: 'application/pdf', // PDF 支援
  }

  for (const [prefix, mimeType] of Object.entries(signatures)) {
    if (base64.startsWith(prefix)) {
      return mimeType
    }
  }

  // 預設使用 JPEG
  return 'image/jpeg'
}

/**
 * 判斷信心度是否低於閾值
 * @param confidence 信心度數值
 * @param threshold 閾值（預設 0.7）
 */
export function isLowConfidence(confidence: number, threshold = 0.7): boolean {
  return confidence < threshold
}

/**
 * 取得需要人工確認的欄位列表
 */
export function getFieldsNeedingReview(confidence: InvoiceOCRConfidence): string[] {
  const fields: string[] = []
  const threshold = 0.7

  if (isLowConfidence(confidence.number, threshold)) fields.push('number')
  if (isLowConfidence(confidence.type, threshold)) fields.push('type')
  if (isLowConfidence(confidence.date, threshold)) fields.push('date')
  if (isLowConfidence(confidence.untaxed_amount, threshold)) fields.push('untaxed_amount')
  if (isLowConfidence(confidence.tax_amount, threshold)) fields.push('tax_amount')
  if (isLowConfidence(confidence.total_amount, threshold)) fields.push('total_amount')
  if (isLowConfidence(confidence.counterparty_name, threshold))
    fields.push('counterparty_name')
  if (isLowConfidence(confidence.counterparty_tax_id, threshold))
    fields.push('counterparty_tax_id')
  if (isLowConfidence(confidence.description, threshold)) fields.push('description')

  return fields
}
