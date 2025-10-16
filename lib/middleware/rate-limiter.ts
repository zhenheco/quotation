/**
 * API 速率限制中間件
 * 使用記憶體儲存進行簡單的速率限制
 * 生產環境建議使用 Redis 或其他分散式儲存
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number  // 時間窗口（毫秒）
  maxRequests: number  // 最大請求數
  message?: string  // 錯誤訊息
  skipSuccessfulRequests?: boolean  // 是否跳過成功的請求
  keyGenerator?: (req: NextRequest) => string  // 產生唯一識別鍵的函數
}

// 儲存請求記錄
const requestStore = new Map<string, { count: number; resetTime: number }>()

// 清理過期的記錄（每分鐘執行一次）
setInterval(() => {
  const now = Date.now()
  requestStore.forEach((value, key) => {
    if (value.resetTime < now) {
      requestStore.delete(key)
    }
  })
}, 60000)

/**
 * 預設的 key 產生器（基於 IP）
 */
function defaultKeyGenerator(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  return `${req.nextUrl.pathname}-${ip}`
}

/**
 * 建立速率限制中間件
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs = 60000,  // 預設 1 分鐘
    maxRequests = 60,   // 預設每分鐘 60 次
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    keyGenerator = defaultKeyGenerator,
  } = config

  return async function rateLimiter(
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(req)
    const now = Date.now()
    const resetTime = now + windowMs

    // 獲取或初始化請求記錄
    let record = requestStore.get(key)

    if (!record || record.resetTime < now) {
      // 新的時間窗口
      record = { count: 0, resetTime }
      requestStore.set(key, record)
    }

    // 檢查是否超過限制
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000)

      return NextResponse.json(
        {
          error: message,
          retryAfter: `${retryAfter} seconds`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      )
    }

    // 增加計數
    record.count++

    // 執行原始處理器
    const response = await handler()

    // 如果設定跳過成功請求且響應成功，則減少計數
    if (skipSuccessfulRequests && response.status < 400) {
      record.count--
    }

    // 添加速率限制標頭
    const remaining = Math.max(0, maxRequests - record.count)
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString())

    return response
  }
}

/**
 * 預設的速率限制配置
 */
export const defaultRateLimiter = createRateLimiter({
  windowMs: 60000,      // 1 分鐘
  maxRequests: 60,      // 每分鐘 60 次
})

/**
 * 嚴格的速率限制（用於敏感操作）
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60000,      // 1 分鐘
  maxRequests: 10,      // 每分鐘 10 次
  message: 'Rate limit exceeded for sensitive operation. Please wait before trying again.',
})

/**
 * 批次操作速率限制
 */
export const batchRateLimiter = createRateLimiter({
  windowMs: 300000,     // 5 分鐘
  maxRequests: 5,       // 每 5 分鐘 5 次
  message: 'Batch operation rate limit exceeded. Please wait before trying again.',
})

/**
 * Email 發送速率限制
 */
export const emailRateLimiter = createRateLimiter({
  windowMs: 3600000,    // 1 小時
  maxRequests: 20,      // 每小時 20 封
  message: 'Email sending rate limit exceeded. Please wait before sending more emails.',
})

/**
 * 匯率同步速率限制
 */
export const syncRateLimiter = createRateLimiter({
  windowMs: 3600000,    // 1 小時
  maxRequests: 10,      // 每小時 10 次
  message: 'Sync rate limit exceeded. Please wait before syncing again.',
})