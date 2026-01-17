/**
 * CSRF Token API 端點測試
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock CSRF 模組
vi.mock('@/lib/security/csrf', () => ({
  generateCsrfToken: vi.fn().mockResolvedValue('mock-token-value.mock-signature'),
  CSRF_COOKIE_NAME: '_csrf',
}))

// 動態 import 以確保 mock 生效
const { GET } = await import('@/app/api/csrf-token/route')

describe('GET /api/csrf-token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return token object', async () => {
    const request = new NextRequest('http://localhost/api/csrf-token')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('token')
    expect(typeof data.token).toBe('string')
  })

  it('should set no-cache headers', async () => {
    const request = new NextRequest('http://localhost/api/csrf-token')
    const response = await GET(request)

    expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate')
    expect(response.headers.get('Pragma')).toBe('no-cache')
  })

  it('should set CSRF cookie in response', async () => {
    const request = new NextRequest('http://localhost/api/csrf-token')
    const response = await GET(request)

    // 檢查 Set-Cookie header 包含 _csrf
    const setCookieHeader = response.headers.get('Set-Cookie')
    expect(setCookieHeader).toBeTruthy()
    expect(setCookieHeader).toContain('_csrf=')
  })

  it('should return same token in body and cookie', async () => {
    const request = new NextRequest('http://localhost/api/csrf-token')
    const response = await GET(request)
    const data = await response.json()

    const setCookieHeader = response.headers.get('Set-Cookie')
    expect(setCookieHeader).toContain(data.token)
  })
})
