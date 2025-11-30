import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

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
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const path = request.nextUrl.searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    if (!path.startsWith(user.id + '/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 使用 Cloudflare R2 讀取檔案
    const { env } = getCloudflareContext()
    const object = await env.R2_BUCKET.get(path)

    if (!object) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const ext = path.split('.').pop()?.toLowerCase() || 'png'
    const contentType = object.httpMetadata?.contentType || MIME_TYPES[ext] || 'application/octet-stream'

    const arrayBuffer = await object.arrayBuffer()

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
