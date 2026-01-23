import { NextResponse } from 'next/server'

// 強制動態
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/debug/config - 診斷端點，顯示環境設定
 *
 * 用於確認 Vercel 部署是否生效
 */
export async function GET() {
  const response = NextResponse.json({
    apiVersion: 'v5',
    deployTime: '2026-01-23T07:05:00Z',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40) + '...',
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      vercelEnv: process.env.VERCEL_ENV,
      vercelRegion: process.env.VERCEL_REGION,
    },
    message: '如果您看到這個訊息，表示新程式碼已部署'
  })

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('X-API-Version', 'v5')
  return response
}
