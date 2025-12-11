/**
 * 報價單附件照片 API
 */
import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import {
  getQuotationImages,
  createQuotationImage,
  deleteQuotationImage
} from '@/lib/dal/quotation-images'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * GET /api/quotations/[id]/images - 取得報價單的所有附件照片
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得圖片列表
    const images = await getQuotationImages(db, id)

    return NextResponse.json({ images })
  } catch (error: unknown) {
    console.error('Error fetching quotation images:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/quotations/[id]/images - 上傳報價單附件照片
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 解析 multipart/form-data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const caption = formData.get('caption') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 驗證檔案類型
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // 驗證檔案大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // 生成唯一檔名
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `${id}/${timestamp}.${extension}`

    // 上傳到 Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('quotation-images')
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // 取得公開 URL
    const { data: urlData } = supabase.storage
      .from('quotation-images')
      .getPublicUrl(fileName)

    // 儲存到資料庫
    const existingImages = await getQuotationImages(db, id)
    const image = await createQuotationImage(db, {
      quotation_id: id,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      sort_order: existingImages.length,
      caption
    })

    return NextResponse.json({ image }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error uploading quotation image:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * DELETE /api/quotations/[id]/images - 刪除報價單附件照片
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得要刪除的圖片 ID
    interface DeleteImageBody {
      image_id: string
    }
    const body = await request.json() as DeleteImageBody
    const { image_id } = body

    if (!image_id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 })
    }

    // 從資料庫取得圖片資訊（用於刪除 Storage 中的檔案）
    const images = await getQuotationImages(db, id)
    const imageToDelete = images.find(img => img.id === image_id)

    if (!imageToDelete) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // 從 Storage 刪除檔案
    try {
      const url = new URL(imageToDelete.file_url)
      const pathParts = url.pathname.split('/quotation-images/')
      if (pathParts.length > 1) {
        const storagePath = pathParts[1]
        await supabase.storage
          .from('quotation-images')
          .remove([storagePath])
      }
    } catch (storageError) {
      console.error('Error deleting from storage:', storageError)
      // 繼續刪除資料庫記錄
    }

    // 從資料庫刪除記錄
    await deleteQuotationImage(db, image_id)

    return NextResponse.json({ message: 'Image deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting quotation image:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
