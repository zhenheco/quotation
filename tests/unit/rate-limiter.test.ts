/**
 * 速率限制器測試
 * 測試路徑: lib/middleware/rate-limiter.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createRateLimiter,
  defaultRateLimiter,
  strictRateLimiter,
  batchRateLimiter,
  emailRateLimiter,
  syncRateLimiter,
} from '@/lib/middleware/rate-limiter'

describe('Rate Limiter 測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createRateLimiter - 基本功能', () => {
    it('應該允許在限制內的請求', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
      }))

      const request = new NextRequest('http://localhost:3000/api/test')

      for (let i = 0; i < 5; i++) {
        const response = await limiter(request, handler)
        expect(response.status).not.toBe(429)
      }

      expect(handler).toHaveBeenCalledTimes(5)
    })

    it('應該阻止超過限制的請求', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
      }))

      const request = new NextRequest('http://localhost:3000/api/test')

      // 前 3 次應該成功
      for (let i = 0; i < 3; i++) {
        const response = await limiter(request, handler)
        expect(response.status).not.toBe(429)
      }

      // 第 4 次應該被阻止
      const response = await limiter(request, handler)
      expect(response.status).toBe(429)

      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.retryAfter).toBeDefined()
    })

    it('應該設置正確的速率限制標頭', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/test')
      const response = await limiter(request, handler)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9')
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
    })

    it('應該在時間窗口重置後允許新請求', async () => {
      const limiter = createRateLimiter({
        windowMs: 100, // 100ms 窗口
        maxRequests: 2,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/test')

      // 達到限制
      await limiter(request, handler)
      await limiter(request, handler)

      const response1 = await limiter(request, handler)
      expect(response1.status).toBe(429)

      // 等待時間窗口過期
      await new Promise((resolve) => setTimeout(resolve, 150))

      // 應該可以再次請求
      const response2 = await limiter(request, handler)
      expect(response2.status).not.toBe(429)
    })
  })

  describe('Key Generator', () => {
    it('應該根據 IP 區分不同用戶', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      // 用戶 1
      const request1 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      // 用戶 2
      const request2 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.2',
        },
      })

      // 用戶 1 達到限制
      await limiter(request1, handler)
      await limiter(request1, handler)
      const response1 = await limiter(request1, handler)
      expect(response1.status).toBe(429)

      // 用戶 2 應該不受影響
      const response2 = await limiter(request2, handler)
      expect(response2.status).not.toBe(429)
    })

    it('應該支援自訂 key generator', async () => {
      const customKeyGen = (req: NextRequest) => {
        return `custom-${req.nextUrl.pathname}`
      }

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        keyGenerator: customKeyGen,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/test')

      await limiter(request, handler)
      await limiter(request, handler)
      const response = await limiter(request, handler)

      expect(response.status).toBe(429)
    })
  })

  describe('Skip Successful Requests', () => {
    it('應該在設置 skipSuccessfulRequests 時不計算成功請求', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: true,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/test')

      // 應該可以無限次請求成功的響應
      for (let i = 0; i < 10; i++) {
        const response = await limiter(request, handler)
        expect(response.status).toBe(200)
      }
    })

    it('應該計算失敗請求', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: true,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ error: 'Error' }),
        status: 500,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/test')

      await limiter(request, handler)
      await limiter(request, handler)
      const response = await limiter(request, handler)

      expect(response.status).toBe(429)
    })
  })

  describe('預設配置測試', () => {
    it('defaultRateLimiter 應該有正確的配置（60 req/min）', async () => {
      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/test')

      // 應該允許 60 次請求
      for (let i = 0; i < 60; i++) {
        const response = await defaultRateLimiter(request, handler)
        expect(response.status).not.toBe(429)
      }

      // 第 61 次應該被阻止
      const response = await defaultRateLimiter(request, handler)
      expect(response.status).toBe(429)
    })

    it('strictRateLimiter 應該有嚴格限制（10 req/min）', async () => {
      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/sensitive')

      // 應該允許 10 次請求
      for (let i = 0; i < 10; i++) {
        const response = await strictRateLimiter(request, handler)
        expect(response.status).not.toBe(429)
      }

      // 第 11 次應該被阻止
      const response = await strictRateLimiter(request, handler)
      expect(response.status).toBe(429)
    })

    it('batchRateLimiter 應該有批次限制（5 req/5min）', async () => {
      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/batch')

      // 應該允許 5 次請求
      for (let i = 0; i < 5; i++) {
        const response = await batchRateLimiter(request, handler)
        expect(response.status).not.toBe(429)
      }

      // 第 6 次應該被阻止
      const response = await batchRateLimiter(request, handler)
      expect(response.status).toBe(429)
    })

    it('emailRateLimiter 應該有 Email 限制（20 emails/hour）', async () => {
      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/email')

      // 應該允許 20 次請求
      for (let i = 0; i < 20; i++) {
        const response = await emailRateLimiter(request, handler)
        expect(response.status).not.toBe(429)
      }

      // 第 21 次應該被阻止
      const response = await emailRateLimiter(request, handler)
      expect(response.status).toBe(429)
    })

    it('syncRateLimiter 應該有同步限制（10 req/hour）', async () => {
      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/sync')

      // 應該允許 10 次請求
      for (let i = 0; i < 10; i++) {
        const response = await syncRateLimiter(request, handler)
        expect(response.status).not.toBe(429)
      }

      // 第 11 次應該被阻止
      const response = await syncRateLimiter(request, handler)
      expect(response.status).toBe(429)
    })
  })

  describe('錯誤訊息自訂', () => {
    it('應該支援自訂錯誤訊息', async () => {
      const customMessage = 'Custom rate limit error'

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        message: customMessage,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/test')

      await limiter(request, handler)
      const response = await limiter(request, handler)

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toBe(customMessage)
    })
  })

  describe('Retry-After 標頭', () => {
    it('應該提供正確的 Retry-After 時間', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000, // 1 分鐘
        maxRequests: 1,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/test')

      await limiter(request, handler)
      const response = await limiter(request, handler)

      expect(response.status).toBe(429)
      const retryAfter = response.headers.get('Retry-After')
      expect(retryAfter).toBeDefined()

      const retrySeconds = parseInt(retryAfter || '0')
      expect(retrySeconds).toBeGreaterThan(0)
      expect(retrySeconds).toBeLessThanOrEqual(60)
    })
  })

  describe('記憶體清理', () => {
    it('應該自動清理過期記錄', async () => {
      // 這個測試驗證記憶體清理機制
      // 實際上 setInterval 每 60 秒執行一次清理

      const limiter = createRateLimiter({
        windowMs: 100,
        maxRequests: 1,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/cleanup-test')

      // 第一次請求
      await limiter(request, handler)

      // 等待時間窗口過期
      await new Promise((resolve) => setTimeout(resolve, 150))

      // 應該可以再次請求（記錄已過期）
      const response = await limiter(request, handler)
      expect(response.status).not.toBe(429)
    })
  })

  describe('併發請求測試', () => {
    it('應該正確處理並發請求', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      })

      const handler = vi.fn(async () => ({
        json: async () => ({ success: true }),
        status: 200,
        headers: new Headers(),
      }))

      const request = new NextRequest('http://localhost:3000/api/concurrent')

      // 同時發送 10 個請求
      const promises = Array.from({ length: 10 }, () => limiter(request, handler))

      const responses = await Promise.all(promises)

      // 應該有 5 個成功，5 個被限制
      const successCount = responses.filter((r) => r.status !== 429).length
      const blockedCount = responses.filter((r) => r.status === 429).length

      expect(successCount).toBe(5)
      expect(blockedCount).toBe(5)
    })
  })
})
