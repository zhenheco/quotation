import { createApiClient } from '@/lib/supabase/api'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'

const ALLOWED_TYPES = ['logo', 'signature', 'passbook'] as const
type FileType = typeof ALLOWED_TYPES[number]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    // 使用 API client 驗證用戶身份
    const authClient = createApiClient(request)
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const companyId = formData.get('companyId') as string | null
    const type = formData.get('type') as FileType | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid file type. Must be logo, signature, or passbook' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file format. Only JPEG, PNG, GIF, WebP are allowed' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${companyId}_${type}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()

    // 使用 Service Role client 進行 Storage 操作（繞過 RLS）
    // 安全性由 API 層的認證和路徑驗證保證
    const storageClient = getSupabaseClient()
    const { error: uploadError } = await storageClient.storage
      .from('company-files')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const apiUrl = `/api/storage/company-files?path=${encodeURIComponent(filePath)}`

    return NextResponse.json({ url: apiUrl, path: filePath })
  } catch (error: unknown) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
