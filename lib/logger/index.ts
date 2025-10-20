/**
 * 結構化日誌系統
 *
 * 提供統一的日誌記錄介面，支援不同的日誌級別和上下文資訊
 *
 * 功能：
 * 1. 結構化日誌格式（JSON）
 * 2. 自動添加時間戳和請求 ID
 * 3. 不同的日誌級別（DEBUG, INFO, WARN, ERROR）
 * 4. 生產環境自動移除 DEBUG 日誌
 * 5. 安全的錯誤訊息（不洩漏敏感資訊）
 * 6. 整合第三方監控服務（Sentry, Datadog 等）
 *
 * 使用方式：
 * ```typescript
 * import { logger } from '@/lib/logger'
 *
 * logger.info('User login', { userId: '123', ip: '1.2.3.4' })
 * logger.error('Database error', error, { query: 'SELECT ...' })
 * ```
 */

import { randomUUID } from 'crypto'

// ========================================
// 日誌級別定義
// ========================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

// ========================================
// 類型定義
// ========================================

/**
 * 日誌上下文資訊
 */
export interface LogContext {
  requestId?: string
  userId?: string
  action?: string
  ip?: string
  userAgent?: string
  duration?: number
  [key: string]: any
}

/**
 * 日誌條目
 */
export interface LogEntry {
  timestamp: string
  level: string
  message: string
  service: string
  environment: string
  context?: LogContext
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

/**
 * Logger 配置
 */
export interface LoggerConfig {
  service: string
  minLevel: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteEndpoint?: string
  sensitiveFields?: string[]
}

// ========================================
// Logger 類別
// ========================================

class Logger {
  private config: LoggerConfig
  private requestIdStore: Map<string, string> = new Map()

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      service: config.service || 'quotation-system',
      minLevel: config.minLevel ?? (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG),
      enableConsole: config.enableConsole ?? true,
      enableRemote: config.enableRemote ?? process.env.NODE_ENV === 'production',
      remoteEndpoint: config.remoteEndpoint || process.env.LOG_ENDPOINT,
      sensitiveFields: config.sensitiveFields || ['password', 'token', 'apiKey', 'secret']
    }
  }

  /**
   * 設定當前請求的 ID（用於追蹤）
   */
  setRequestId(requestId: string): void {
    this.requestIdStore.set('current', requestId)
  }

  /**
   * 獲取當前請求 ID
   */
  getRequestId(): string {
    return this.requestIdStore.get('current') || randomUUID()
  }

  /**
   * 清除當前請求 ID
   */
  clearRequestId(): void {
    this.requestIdStore.delete('current')
  }

  /**
   * 過濾敏感資訊
   */
  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context }

    for (const field of this.config.sensitiveFields!) {
      if (field in sanitized) {
        sanitized[field] = '***'
      }
    }

    return sanitized
  }

  /**
   * 建立日誌條目
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      service: this.config.service,
      environment: process.env.NODE_ENV || 'development'
    }

    if (context) {
      entry.context = this.sanitizeContext({
        ...context,
        requestId: context.requestId || this.getRequestId()
      })
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        code: (error as any).code
      }
    }

    return entry
  }

  /**
   * 輸出日誌到 console
   */
  private logToConsole(entry: LogEntry): void {
    const { level } = entry

    // 生產環境的 console 會被 Next.js 移除
    if (level === 'DEBUG') {
      console.log(JSON.stringify(entry))
    } else if (level === 'INFO') {
      console.log(JSON.stringify(entry))
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(entry))
    } else {
      console.error(JSON.stringify(entry))
    }
  }

  /**
   * 發送日誌到遠程服務
   */
  private async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return
    }

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      })
    } catch (error) {
      // 避免日誌系統本身的錯誤導致應用崩潰
      console.error('Failed to send log to remote:', error)
    }
  }

  /**
   * 記錄日誌
   */
  private log(
    level: LogLevel,
    message: string,
    contextOrError?: LogContext | Error,
    error?: Error
  ): void {
    // 檢查日誌級別
    if (level < this.config.minLevel) {
      return
    }

    // 處理參數
    let context: LogContext | undefined
    let actualError: Error | undefined

    if (contextOrError instanceof Error) {
      actualError = contextOrError
    } else {
      context = contextOrError
      actualError = error
    }

    // 建立日誌條目
    const entry = this.createLogEntry(level, message, context, actualError)

    // 輸出日誌
    if (this.config.enableConsole) {
      this.logToConsole(entry)
    }

    if (this.config.enableRemote) {
      // 非同步發送，不阻塞主流程
      this.logToRemote(entry).catch(() => {})
    }
  }

  /**
   * DEBUG 級別日誌
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * INFO 級別日誌
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * WARN 級別日誌
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * ERROR 級別日誌
   */
  error(message: string, error: Error, context?: LogContext): void
  error(message: string, context?: LogContext): void
  error(message: string, errorOrContext?: Error | LogContext, context?: LogContext): void {
    if (errorOrContext instanceof Error) {
      this.log(LogLevel.ERROR, message, context, errorOrContext)
    } else {
      this.log(LogLevel.ERROR, message, errorOrContext)
    }
  }

  /**
   * CRITICAL 級別日誌
   */
  critical(message: string, error: Error, context?: LogContext): void {
    this.log(LogLevel.CRITICAL, message, context, error)

    // Critical 級別的錯誤需要特別處理
    if (process.env.NODE_ENV === 'production') {
      // 可以在這裡整合 Sentry 或其他錯誤追蹤服務
      // Sentry.captureException(error)
    }
  }

  /**
   * 記錄 API 請求
   */
  logRequest(method: string, path: string, context: LogContext): void {
    this.info(`${method} ${path}`, {
      ...context,
      type: 'request'
    })
  }

  /**
   * 記錄 API 響應
   */
  logResponse(method: string, path: string, status: number, duration: number, context?: LogContext): void {
    const level = status >= 500 ? LogLevel.ERROR : status >= 400 ? LogLevel.WARN : LogLevel.INFO

    this.log(level, `${method} ${path} ${status}`, {
      ...context,
      type: 'response',
      status,
      duration
    })
  }

  /**
   * 記錄資料庫查詢
   */
  logQuery(query: string, duration: number, context?: LogContext): void {
    // 不記錄完整 SQL 以避免洩漏敏感資訊
    const sanitizedQuery = query.length > 100 ? query.substring(0, 100) + '...' : query

    this.debug('Database query', {
      ...context,
      type: 'db_query',
      query: sanitizedQuery,
      duration
    })
  }
}

// ========================================
// 導出單例實例
// ========================================

export const logger = new Logger()

// ========================================
// 便利函式
// ========================================

/**
 * 為 Next.js API route 創建請求日誌
 */
export function createRequestLogger(requestId?: string) {
  const id = requestId || randomUUID()
  logger.setRequestId(id)

  return {
    requestId: id,
    info: (message: string, context?: LogContext) => logger.info(message, { ...context, requestId: id }),
    warn: (message: string, context?: LogContext) => logger.warn(message, { ...context, requestId: id }),
    error: (message: string, error?: Error, context?: LogContext) => {
      if (error) {
        logger.error(message, error, { ...context, requestId: id })
      } else {
        logger.error(message, { ...context, requestId: id })
      }
    }
  }
}

/**
 * 測量執行時間的裝飾器
 */
export function measureTime<T>(
  fn: () => Promise<T>,
  name: string,
  context?: LogContext
): Promise<T> {
  const start = Date.now()

  return fn().then(
    result => {
      const duration = Date.now() - start
      logger.debug(`${name} completed`, { ...context, duration })
      return result
    },
    error => {
      const duration = Date.now() - start
      logger.error(`${name} failed`, error, { ...context, duration })
      throw error
    }
  )
}
