import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { scanBusinessCard, type BusinessCardData } from '@/lib/services/business-card-ocr'

/**
 * 名片 OCR API 請求格式
 */
interface OcrRequest {
  /** Base64 編碼的圖片（不含 data:image/... 前綴） */
  image: string
}

/**
 * API 回應格式
 */
interface OcrResponse {
  success: boolean
  data?: BusinessCardData
  error?: string
}

// 圖片大小限制：2MB
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

/**
 * POST /api/ocr/business-card - 掃描名片並識別聯絡資訊
 */
export async function POST(request: NextRequest): Promise<NextResponse<OcrResponse>> {
  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 檢查權限（需要有客戶寫入權限才能使用此功能）
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'customers:write')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: 需要客戶管理權限' },
        { status: 403 }
      )
    }

    // 解析請求
    const body = await request.json() as OcrRequest

    if (!body.image) {
      return NextResponse.json(
        { success: false, error: '缺少圖片資料' },
        { status: 400 }
      )
    }

    // 移除可能的 data URL 前綴
    let imageBase64 = body.image
    const dataUrlMatch = imageBase64.match(/^data:image\/\w+;base64,(.+)$/)
    if (dataUrlMatch) {
      imageBase64 = dataUrlMatch[1]
    }

    // 檢查圖片大小（Base64 約比原圖大 33%）
    const estimatedSize = (imageBase64.length * 3) / 4
    if (estimatedSize > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { success: false, error: `圖片太大，請壓縮至 ${MAX_IMAGE_SIZE / 1024 / 1024}MB 以下` },
        { status: 400 }
      )
    }

    // 驗證 Base64 格式
    if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      return NextResponse.json(
        { success: false, error: '無效的 Base64 圖片格式' },
        { status: 400 }
      )
    }

    // 呼叫 OCR 服務
    console.log(`[API] 使用者 ${user.id} 請求名片 OCR`)
    const result = await scanBusinessCard(imageBase64)

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error: unknown) {
    console.error('[API] 名片 OCR 失敗:', error)

    // 區分不同類型的錯誤
    const errorMessage = getErrorMessage(error)

    // 如果是配置錯誤（缺少 API key），返回 503
    if (errorMessage.includes('OPENROUTER_API_KEY')) {
      return NextResponse.json(
        { success: false, error: '服務暫時不可用，請聯繫管理員' },
        { status: 503 }
      )
    }

    // 其他錯誤
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
