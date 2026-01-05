/**
 * 名片 OCR 服務
 * 透過 Cloudflare AI Gateway + OpenRouter 調用視覺模型
 * 支援 Fallback 機制：Qwen-VL-Plus → GLM-4.6V
 */

import {
  isGatewayEnabled,
  getOpenRouterBaseUrl,
  buildOpenRouterHeaders,
} from '@/lib/cloudflare/ai-gateway'

// 支援的 OCR 模型（按優先順序排列）
const OCR_MODELS = [
  'qwen/qwen-vl-plus',    // 主要：中文識別最佳
  'z-ai/glm-4.6v',        // Fallback：智譜 GLM-4.6V
] as const

// 名片識別提示詞
const BUSINESS_CARD_PROMPT = `請從這張名片圖片中提取以下資訊，以 JSON 格式回傳：
{
  "name": { "zh": "中文姓名", "en": "English Name" },
  "company": "公司名稱",
  "title": "職稱",
  "email": "電子郵件",
  "phone": "電話號碼",
  "fax": "傳真號碼",
  "address": { "zh": "中文地址", "en": "English Address" }
}

注意事項：
1. 只回傳純 JSON，不要任何其他說明或 markdown 格式
2. 如果某個欄位無法識別，設為 null
3. 如果姓名只有中文或只有英文，另一個設為空字串
4. 電話號碼包含國碼和區碼（如果有的話）`

/**
 * 名片識別結果資料結構
 */
export interface BusinessCardData {
  name?: { zh: string; en: string } | null
  company?: string | null
  title?: string | null
  email?: string | null
  phone?: string | null
  fax?: string | null
  address?: { zh: string; en: string } | null
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
 * 掃描名片並提取聯絡資訊
 * @param imageBase64 Base64 編碼的圖片資料（不含 data:image/... 前綴）
 * @returns 結構化的名片資訊
 */
export async function scanBusinessCard(imageBase64: string): Promise<BusinessCardData> {
  const errors: string[] = []

  for (const model of OCR_MODELS) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[OCR] 嘗試使用模型: ${model}`)
      }
      const result = await callOpenRouter(model, imageBase64)
      if (result) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[OCR] 成功使用模型: ${model}`)
        }
        return result
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      // 保留錯誤日誌（生產環境仍需追蹤失敗）
      console.error(`[OCR] ${model} 失敗:`, errorMsg)
      errors.push(`${model}: ${errorMsg}`)
    }
  }

  throw new Error(`所有 OCR 模型都失敗了: ${errors.join('; ')}`)
}

/**
 * 透過 OpenRouter API 呼叫視覺模型
 */
async function callOpenRouter(model: string, imageBase64: string): Promise<BusinessCardData | null> {
  // 取得 API 端點和 headers
  const baseUrl = getOpenRouterBaseUrl()
  const apiUrl = `${baseUrl}/chat/completions`

  // Gateway 模式：使用 BYOK（存儲的 API key），不需要傳 apiKey
  // 非 Gateway 模式：需要 OPENROUTER_API_KEY
  const apiKey = isGatewayEnabled() ? undefined : process.env.OPENROUTER_API_KEY

  if (!isGatewayEnabled() && !apiKey) {
    throw new Error('缺少 OPENROUTER_API_KEY 環境變數')
  }

  const headers = buildOpenRouterHeaders(apiKey)

  // 加入 OpenRouter 特定 headers
  headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL || 'https://quote24.cc'
  headers['X-Title'] = 'Quotation System - Business Card OCR'

  if (process.env.NODE_ENV === 'development') {
    console.log(`[OCR] 使用 ${isGatewayEnabled() ? 'AI Gateway' : '直連'} 模式, URL: ${apiUrl}`)
  }

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
            { type: 'text', text: BUSINESS_CARD_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1, // 低溫度以確保穩定輸出
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 請求失敗 (${response.status}): ${errorText}`)
  }

  const data = await response.json() as OpenRouterResponse

  if (data.error) {
    throw new Error(data.error.message || '未知 API 錯誤')
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('API 回應中沒有內容')
  }

  // 解析 JSON 回應
  return parseBusinessCardJson(content)
}

/**
 * 解析模型回傳的 JSON 字串
 */
function parseBusinessCardJson(content: string): BusinessCardData {
  // 嘗試移除可能的 markdown 代碼塊
  let jsonStr = content.trim()

  // 處理 ```json ... ``` 格式
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  try {
    const parsed = JSON.parse(jsonStr) as BusinessCardData
    return normalizeBusinessCardData(parsed)
  } catch {
    console.error('[OCR] JSON 解析失敗，原始內容:', content)
    throw new Error('無法解析 OCR 結果為 JSON 格式')
  }
}

/**
 * 標準化名片資料
 */
function normalizeBusinessCardData(data: BusinessCardData): BusinessCardData {
  return {
    name: data.name ? {
      zh: data.name.zh?.trim() || '',
      en: data.name.en?.trim() || '',
    } : null,
    company: data.company?.trim() || null,
    title: data.title?.trim() || null,
    email: data.email?.trim()?.toLowerCase() || null,
    phone: data.phone?.trim() || null,
    fax: data.fax?.trim() || null,
    address: data.address ? {
      zh: data.address.zh?.trim() || '',
      en: data.address.en?.trim() || '',
    } : null,
  }
}

/**
 * 從 Base64 字串偵測圖片 MIME 類型
 */
function detectImageMimeType(base64: string): string {
  // 檢查常見圖片格式的魔數
  const signatures: Record<string, string> = {
    '/9j/': 'image/jpeg',
    'iVBORw0KGgo': 'image/png',
    'R0lGODlh': 'image/gif',
    'R0lGODdh': 'image/gif',
    'UklGR': 'image/webp',
  }

  for (const [prefix, mimeType] of Object.entries(signatures)) {
    if (base64.startsWith(prefix)) {
      return mimeType
    }
  }

  // 預設使用 JPEG
  return 'image/jpeg'
}
