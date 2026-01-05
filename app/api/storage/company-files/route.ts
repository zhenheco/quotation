import { createApiClient } from '@/lib/supabase/api'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

const MIME_TYPES: Record<string, string> = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
}

export async function GET(request: NextRequest) {
  try {
    // 使用 API client 驗證用戶身份
    const authClient = createApiClient(request)
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const path = request.nextUrl.searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    // 安全：正規化路徑防止目錄遍歷攻擊（如 ../）
    const normalizedPath = path.split('/').filter(segment =>
      segment !== '' && segment !== '.' && segment !== '..'
    ).join('/')

    // 驗證路徑屬於當前用戶
    if (!normalizedPath.startsWith(user.id + '/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 使用 Service Role client 進行 Storage 操作（繞過 RLS）
    // 安全性由上面的路徑所有權驗證保證
    const storageClient = getSupabaseClient()
    const { data, error } = await storageClient.storage
      .from('company-files')
      .download(normalizedPath)

    if (error || !data) {
      console.error('Storage download error:', error)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const ext = normalizedPath.split('.').pop()?.toLowerCase() || 'png'
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    const arrayBuffer = await data.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
