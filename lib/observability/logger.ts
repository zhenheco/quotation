/**
 * 生產級 Logger
 * 功能：PII 遮罩、錯誤取樣、非阻塞寫入、Trace Context
 */

import type { D1Database, ExecutionContext } from './types';
import { redactPII } from '../security/pii-redactor';
import { ErrorAggregator } from './error-aggregator';
import { extractErrorInfo } from './error-fingerprint';
import type { TraceContext } from './trace-context';
import { CircuitBreaker, retryWithBackoff } from './circuit-breaker';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  id?: string;
  timestamp?: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  tenantId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  env?: string;
}

export interface LoggerOptions {
  minLevel?: LogLevel;
  enablePIIRedaction?: boolean;
  enableErrorSampling?: boolean;
  maxErrorsPerMinute?: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

export class Logger {
  private errorCounts: Map<string, { count: number; resetAt: number }> = new Map();
  private db: D1Database;
  private errorAggregator: ErrorAggregator;
  private options: Required<LoggerOptions>;
  private circuitBreaker: CircuitBreaker;

  constructor(
    db: D1Database,
    options?: LoggerOptions
  ) {
    this.db = db;
    this.errorAggregator = new ErrorAggregator(db);
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
    });
    this.options = {
      minLevel: options?.minLevel || 'info',
      enablePIIRedaction: options?.enablePIIRedaction !== false,
      enableErrorSampling: options?.enableErrorSampling !== false,
      maxErrorsPerMinute: options?.maxErrorsPerMinute || 100,
    };
  }

  /**
   * 記錄 Debug 日誌
   */
  debug(message: string, context?: Partial<LogEntry>): void {
    this.log('debug', message, context);
  }

  /**
   * 記錄 Info 日誌
   */
  info(message: string, context?: Partial<LogEntry>): void {
    this.log('info', message, context);
  }

  /**
   * 記錄 Warning 日誌
   */
  warn(message: string, context?: Partial<LogEntry>, executionContext?: ExecutionContext): void {
    this.log('warn', message, context, executionContext);
  }

  /**
   * 記錄 Error 日誌
   */
  async error(
    error: Error | string,
    context?: Partial<LogEntry>,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const errorInfo = typeof error === 'string'
      ? { message: error }
      : extractErrorInfo(error);

    const message = errorInfo.message;

    if (this.options.enableErrorSampling) {
      if (!this.shouldLogError(message)) {
        return;
      }
    }

    if (executionContext) {
      executionContext.waitUntil(
        this.errorAggregator.recordError(errorInfo)
      );
    } else {
      await this.errorAggregator.recordError(errorInfo);
    }

    this.log('error', message, {
      ...context,
      metadata: {
        ...context?.metadata,
        stack: errorInfo.stack,
      },
    });
  }

  /**
   * 記錄 Critical 日誌
   */
  critical(message: string, context?: Partial<LogEntry>): void {
    this.log('critical', message, context);
  }

  /**
   * 通用日誌方法（支援非阻塞寫入）
   */
  async log(
    level: LogLevel,
    message: string,
    context?: Partial<LogEntry>,
    executionContext?: ExecutionContext
  ): Promise<void> {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.options.minLevel]) {
      return;
    }

    let redactedMessage = message;
    let redactedMetadata = context?.metadata;

    if (this.options.enablePIIRedaction) {
      redactedMessage = redactPII(message);
      if (redactedMetadata) {
        redactedMetadata = JSON.parse(
          redactPII(JSON.stringify(redactedMetadata))
        );
      }
    }

    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      message: redactedMessage,
      ...context,
      metadata: redactedMetadata,
      env: context?.env || (process.env.ENVIRONMENT as string) || 'production',
    };

    const writePromise = this.writeToD1(entry);

    if (executionContext) {
      executionContext.waitUntil(writePromise);
    } else {
      await writePromise;
    }
  }

  /**
   * 寫入 D1 資料庫（帶 Circuit Breaker 和重試）
   */
  private async writeToD1(entry: LogEntry): Promise<void> {
    if (this.circuitBreaker.isOpen()) {
      console.warn('Circuit breaker is open, skipping log write');
      return;
    }

    try {
      await this.circuitBreaker.execute(async () => {
        await retryWithBackoff(
          async () => {
            await this.db
              .prepare(`
                INSERT INTO logs (
                  id, timestamp, level, message,
                  request_id, trace_id, span_id,
                  user_id, tenant_id,
                  path, method, status_code, duration_ms,
                  metadata, env
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `)
              .bind(
                entry.id,
                entry.timestamp,
                entry.level,
                entry.message,
                entry.requestId || null,
                entry.traceId || null,
                entry.spanId || null,
                entry.userId || null,
                entry.tenantId || null,
                entry.path || null,
                entry.method || null,
                entry.statusCode || null,
                entry.durationMs || null,
                entry.metadata ? JSON.stringify(entry.metadata) : null,
                entry.env
              )
              .run();
          },
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 5000,
          }
        );
      });
    } catch (error) {
      console.error('Failed to write log to D1 after retries:', error);
    }
  }

  /**
   * 錯誤取樣：檢查是否應該記錄此錯誤
   */
  private shouldLogError(message: string): boolean {
    const now = Date.now();
    const errorKey = message.substring(0, 100);
    const existing = this.errorCounts.get(errorKey);

    if (!existing || now > existing.resetAt) {
      this.errorCounts.set(errorKey, {
        count: 1,
        resetAt: now + 60000,
      });
      return true;
    }

    if (existing.count >= this.options.maxErrorsPerMinute) {
      return false;
    }

    existing.count++;
    return true;
  }

  /**
   * 清理過期的錯誤計數
   */
  cleanupErrorCounts(): void {
    const now = Date.now();
    for (const [key, value] of this.errorCounts.entries()) {
      if (now > value.resetAt) {
        this.errorCounts.delete(key);
      }
    }
  }

  /**
   * 建立帶有 Trace Context 的子 Logger
   */
  withTraceContext(traceContext: TraceContext): Logger {
    const childLogger = new Logger(this.db, this.options);
    childLogger.errorCounts = this.errorCounts;

    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = async (level, message, context, executionContext) => {
      return originalLog(level, message, {
        ...context,
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
        requestId: traceContext.traceId,
      }, executionContext);
    };

    return childLogger;
  }
}

/**
 * 建立全域 Logger 實例
 */
export function createLogger(db: D1Database, options?: LoggerOptions): Logger {
  return new Logger(db, options);
}
