/**
 * CSRF Token API 端點
 *
 * GET /api/csrf-token - 取得 CSRF Token
 *
 * 前端在進行 POST/PUT/DELETE 請求前，應先呼叫此端點取得 token，
 * 然後在請求中附帶 x-csrf-token header。
 *
 * 回應格式：
 * {
 *   "token": "xxx.yyy"
 * }
 */

import { NextResponse } from 'next/server'
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/security/csrf'

export async function GET() {
  // 生成新的 CSRF token
  const token = await generateCsrfToken()

  // 建立回應
  const response = NextResponse.json({ token })

  // 設定 cache headers（防止快取）
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')

  // 設定 CSRF cookie
  // httpOnly: false 以便前端 JavaScript 可以讀取
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 小時
  })

  return response
}
