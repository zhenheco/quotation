/**
 * 發票 OCR 掃描 API
 * POST /api/accounting/invoices/scan - 使用 AI 視覺模型識別發票圖片
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import {
  scanInvoice,
  getFieldsNeedingReview,
  type InvoiceOCRResult,
} from '@/lib/services/accounting/invoice-ocr.service'

export interface ScanResponse {
  success: boolean
  data?: InvoiceOCRResult['data']
  confidence?: InvoiceOCRResult['confidence']
  model?: string
  fieldsNeedingReview?: string[]
  error?: string
}

/**
 * POST /api/accounting/invoices/scan - 掃描發票圖片
 *
 * Request body:
 * - image: Base64 編碼的圖片資料（不含 data:image/... 前綴）
 * - mimeType: 圖片 MIME 類型（可選）
 */
export const POST = withAuth('invoices:write')(async (request) => {
  // 解析請求
  const contentType = request.headers.get('content-type') || ''
  let imageBase64: string

  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { image?: string; mimeType?: string }

    if (!body.image) {
      return NextResponse.json(
        {
          success: false,
          error: '請提供圖片資料',
        },
        { status: 400 }
      )
    }

    // 移除可能的 data URL 前綴
    imageBase64 = body.image.replace(/^data:image\/\w+;base64,/, '')
  } else if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: '請上傳圖片檔案',
        },
        { status: 400 }
      )
    }

    // 驗證檔案類型
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: '不支援的檔案格式，請上傳 JPG、PNG、WebP 或 PDF',
        },
        { status: 400 }
      )
    }

    // 檔案大小限制：10MB
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: '檔案大小超過限制（最大 10MB）',
        },
        { status: 400 }
      )
    }

    // 轉換為 Base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    imageBase64 = buffer.toString('base64')
  } else {
    return NextResponse.json(
      {
        success: false,
        error: '不支援的請求格式',
      },
      { status: 400 }
    )
  }

  // 呼叫 OCR 服務
  const result = await scanInvoice(imageBase64)

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'OCR 識別失敗',
      },
      { status: 500 }
    )
  }

  // 取得需要人工確認的欄位
  const fieldsNeedingReview = getFieldsNeedingReview(result.confidence)

  return NextResponse.json({
    success: true,
    data: result.data,
    confidence: result.confidence,
    model: result.model,
    fieldsNeedingReview,
  })
})
