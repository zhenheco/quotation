/**
 * API 速率限制中間件（改進版）
 *
 * 改進項目：
 * 1. 使用 LRU Cache 防止記憶體無限增長
 * 2. 整合結構化日誌系統
 * 3. 支援 Cloudflare 等多種 IP header
 * 4. 支援白名單功能
 * 5. Serverless 友好（不依賴 setInterval）
 *
 * 生產環境建議：
 * - 單一伺服器：使用此實現（LRU Cache）
 * - 多伺服器：使用 Redis 或其他分散式儲存
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

interface RateLimitConfig {
  windowMs: number  // 時間窗口（毫秒）
  maxRequests: number  // 最大請求數
  message?: string  // 錯誤訊息
  skipSuccessfulRequests?: boolean  // 是否跳過成功的請求
  keyGenerator?: (req: NextRequest) => string  // 產生唯一識別鍵的函數
}

// ========================================
// LRU Cache 實現
// ========================================

/**
 * 簡單的 LRU Cache
 * 防止記憶體無限增長
 */
class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxSize: number

  constructor(maxSize: number = 10000) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // LRU: 移動到最後（最近使用）
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    // 如果已存在，先刪除
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // 如果超過容量，刪除最舊的（第一個）
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, value)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

// 儲存請求記錄（使用 LRU Cache）
const requestStore = new LRUCache<string, { count: number; resetTime: number }>(10000)

// IP 白名單
const IP_WHITELIST = new Set<string>([
  // 添加需要白名單的 IP（例如：監控服務、內部服務等）
  // '127.0.0.1',
  // '::1',
])

// ========================================
// 工具函數
// ========================================

/**
 * 預設的 key 產生器（基於 IP）
 * 支援多種 IP header（Cloudflare, X-Real-IP, X-Forwarded-For）
 */
function defaultKeyGenerator(req: NextRequest): string {
  // 嘗試從多個 header 獲取真實 IP
  const cfConnectingIp = req.headers.get('cf-connecting-ip')  // Cloudflare
  const realIp = req.headers.get('x-real-ip')                  // Nginx
  const forwarded = req.headers.get('x-forwarded-for')         // 通用

  // 優先級：Cloudflare > X-Real-IP > X-Forwarded-For
  const ip = cfConnectingIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : 'unknown')

  return `${req.nextUrl.pathname}-${ip}`
}

/**
 * 檢查 IP 是否在白名單中
 */
function isWhitelisted(ip: string): boolean {
  return IP_WHITELIST.has(ip)
}

/**
 * 從 request 提取 IP
 */
function extractIP(req: NextRequest): string {
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  const realIp = req.headers.get('x-real-ip')
  const forwarded = req.headers.get('x-forwarded-for')

  return cfConnectingIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : 'unknown')
}

// ========================================
// Rate Limiter 主要函數
// ========================================

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
    const ip = extractIP(req)

    // 檢查白名單
    if (isWhitelisted(ip)) {
      logger.debug('Request from whitelisted IP', { ip, path: req.nextUrl.pathname })
      return handler()
    }

    const key = keyGenerator(req)
    const now = Date.now()
    const resetTime = now + windowMs

    // 獲取或初始化請求記錄（LRU 自動處理過期和容量）
    let record = requestStore.get(key)

    if (!record || record.resetTime < now) {
      // 新的時間窗口
      record = { count: 0, resetTime }
      requestStore.set(key, record)
    }

    // 檢查是否超過限制
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000)

      // 記錄超限事件
      logger.warn('Rate limit exceeded', {
        ip,
        path: req.nextUrl.pathname,
        count: record.count,
        limit: maxRequests,
        resetTime: new Date(record.resetTime).toISOString()
      })

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

// ========================================
// 白名單管理
// ========================================

/**
 * 添加 IP 到白名單
 */
export function addToWhitelist(ip: string): void {
  IP_WHITELIST.add(ip)
  logger.info('IP added to whitelist', { ip })
}

/**
 * 從白名單移除 IP
 */
export function removeFromWhitelist(ip: string): void {
  IP_WHITELIST.delete(ip)
  logger.info('IP removed from whitelist', { ip })
}

/**
 * 獲取白名單列表
 */
export function getWhitelist(): string[] {
  return Array.from(IP_WHITELIST)
}

/**
 * 清空白名單
 */
export function clearWhitelist(): void {
  IP_WHITELIST.clear()
  logger.warn('Whitelist cleared')
}

// ========================================
// Rate Limit 管理
// ========================================

/**
 * 重置指定 key 的 rate limit
 */
export function resetRateLimit(key: string): void {
  requestStore.delete(key)
  logger.info('Rate limit reset', { key })
}

/**
 * 清空所有 rate limit 記錄
 */
export function clearAllRateLimits(): void {
  requestStore.clear()
  logger.warn('All rate limits cleared')
}

/**
 * 獲取 rate limit 統計資訊
 */
export function getRateLimitStats(): {
  totalKeys: number
  cacheSize: number
} {
  return {
    totalKeys: requestStore.size,
    cacheSize: requestStore.size
  }
}

// ========================================
// 配置檢查
// ========================================

/**
 * 檢查 Rate Limiter 配置
 */
export function checkRateLimiterConfig(): {
  isConfigured: boolean
  warnings: string[]
  info: {
    lruCacheEnabled: true
    loggerIntegrated: true
    whitelistSupport: true
    serverlessFriendly: true
  }
} {
  const warnings: string[] = []

  // 檢查是否在生產環境
  if (process.env.NODE_ENV === 'production') {
    if (IP_WHITELIST.size === 0) {
      warnings.push('No IPs in whitelist. Consider adding monitoring services or internal services.')
    }
  }

  return {
    isConfigured: warnings.length === 0,
    warnings,
    info: {
      lruCacheEnabled: true,
      loggerIntegrated: true,
      whitelistSupport: true,
      serverlessFriendly: true
    }
  }
}