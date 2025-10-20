/**
 * 統一的 API 錯誤處理系統
 *
 * 提供標準化的錯誤回應格式和錯誤類別
 *
 * 使用方式：
 * ```typescript
 * import { ApiError, handleApiError } from '@/lib/errors/api-error'
 *
 * // 拋出錯誤
 * throw new ApiError(400, 'INVALID_INPUT', 'Email format is invalid')
 *
 * // 在 API route 中處理
 * export async function POST(request: NextRequest) {
 *   try {
 *     // ...
 *   } catch (error) {
 *     return handleApiError(error)
 *   }
 * }
 * ```
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// ========================================
// 錯誤代碼定義
// ========================================

/**
 * 標準錯誤代碼
 */
export enum ErrorCode {
  // 認證和授權 (4xx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // 輸入驗證 (4xx)
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // 資源相關 (4xx)
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate Limiting (4xx)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // 業務邏輯 (4xx)
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 伺服器錯誤 (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT = 'TIMEOUT',

  // 安全相關
  CSRF_TOKEN_INVALID = 'CSRF_TOKEN_INVALID',
  CSRF_TOKEN_MISSING = 'CSRF_TOKEN_MISSING',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
}

// ========================================
// 錯誤類別定義
// ========================================

/**
 * 基礎 API 錯誤類別
 */
export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode | string
  public readonly details?: any
  public readonly isOperational: boolean

  constructor(
    statusCode: number,
    code: ErrorCode | string,
    message: string,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = isOperational

    // 維護正確的 stack trace（V8 引擎）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * 400 Bad Request - 客戶端輸入錯誤
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request', details?: any) {
    super(400, ErrorCode.INVALID_INPUT, message, details)
  }
}

/**
 * 401 Unauthorized - 未認證
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(401, ErrorCode.UNAUTHORIZED, message, details)
  }
}

/**
 * 403 Forbidden - 無權限
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(403, ErrorCode.FORBIDDEN, message, details)
  }
}

/**
 * 404 Not Found - 資源不存在
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource', details?: any) {
    super(404, ErrorCode.NOT_FOUND, `${resource} not found`, details)
  }
}

/**
 * 409 Conflict - 資源衝突
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(409, ErrorCode.CONFLICT, message, details)
  }
}

/**
 * 422 Unprocessable Entity - 驗證失敗
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(422, ErrorCode.VALIDATION_FAILED, message, details)
  }
}

/**
 * 429 Too Many Requests - Rate Limit
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(429, ErrorCode.RATE_LIMIT_EXCEEDED, message, { retryAfter })
  }
}

/**
 * 500 Internal Server Error - 伺服器錯誤
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(500, ErrorCode.INTERNAL_ERROR, message, details, false)
  }
}

/**
 * 503 Service Unavailable - 外部服務錯誤
 */
export class ServiceUnavailableError extends ApiError {
  constructor(service: string = 'Service', details?: any) {
    super(503, ErrorCode.EXTERNAL_SERVICE_ERROR, `${service} is unavailable`, details, false)
  }
}

/**
 * 504 Gateway Timeout - 超時
 */
export class TimeoutError extends ApiError {
  constructor(message: string = 'Request timeout', details?: any) {
    super(504, ErrorCode.TIMEOUT, message, details)
  }
}

// ========================================
// 錯誤回應格式
// ========================================

/**
 * 標準錯誤回應介面
 */
export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
    timestamp?: string
    path?: string
    requestId?: string
  }
}

/**
 * 建立標準錯誤回應
 */
function createErrorResponse(
  error: ApiError,
  path?: string,
  requestId?: string
): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString()
    }
  }

  // 只在開發環境或特定錯誤類型添加詳細資訊
  if (process.env.NODE_ENV === 'development' || error.details) {
    response.error.details = error.details
  }

  if (path) {
    response.error.path = path
  }

  if (requestId) {
    response.error.requestId = requestId
  }

  return response
}

// ========================================
// 錯誤處理函式
// ========================================

/**
 * 統一的錯誤處理函式
 *
 * 將各種錯誤轉換為標準的 NextResponse
 */
export function handleApiError(
  error: unknown,
  path?: string,
  requestId?: string
): NextResponse {
  // 如果是已知的 ApiError
  if (error instanceof ApiError) {
    // 記錄錯誤
    if (error.statusCode >= 500) {
      logger.error(error.message, error, {
        code: error.code,
        statusCode: error.statusCode,
        path,
        requestId
      })
    } else if (error.statusCode >= 400) {
      logger.warn(error.message, {
        code: error.code,
        statusCode: error.statusCode,
        path,
        requestId
      })
    }

    return NextResponse.json(
      createErrorResponse(error, path, requestId),
      { status: error.statusCode }
    )
  }

  // 如果是標準 Error
  if (error instanceof Error) {
    logger.error('Unexpected error', error, { path, requestId })

    // 在生產環境不洩漏內部錯誤訊息
    const message = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message

    const apiError = new InternalServerError(message)
    return NextResponse.json(
      createErrorResponse(apiError, path, requestId),
      { status: 500 }
    )
  }

  // 未知錯誤類型
  logger.error('Unknown error type', new Error(String(error)), { path, requestId })

  const apiError = new InternalServerError('An unexpected error occurred')
  return NextResponse.json(
    createErrorResponse(apiError, path, requestId),
    { status: 500 }
  )
}

// ========================================
// 工具函式
// ========================================

/**
 * 檢查錯誤是否為操作性錯誤（預期的業務錯誤）
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isOperational
  }
  return false
}

/**
 * 從 Zod 驗證錯誤創建 ValidationError
 */
export function fromZodError(error: any): ValidationError {
  const details = error.errors?.map((e: any) => ({
    field: e.path.join('.'),
    message: e.message
  }))

  return new ValidationError('Validation failed', details)
}

/**
 * 從資料庫錯誤創建 ApiError
 */
export function fromDatabaseError(error: any): ApiError {
  // PostgreSQL 錯誤代碼
  const code = error.code

  switch (code) {
    case '23505': // unique_violation
      return new ConflictError('Resource already exists', { constraint: error.constraint })

    case '23503': // foreign_key_violation
      return new BadRequestError('Related resource not found', { constraint: error.constraint })

    case '23502': // not_null_violation
      return new BadRequestError('Required field is missing', { column: error.column })

    case '22P02': // invalid_text_representation
      return new BadRequestError('Invalid input format')

    default:
      // 不洩漏資料庫內部錯誤
      logger.error('Database error', error)
      return new InternalServerError('Database operation failed')
  }
}

// ========================================
// Express/Next.js 中介層（可選）
// ========================================

/**
 * 創建錯誤處理 wrapper
 *
 * 自動捕獲非同步函式的錯誤並使用 handleApiError 處理
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error) as any
    }
  }
}

// ========================================
// 導出便利函式
// ========================================

/**
 * 快速創建常用錯誤的便利函式
 */
export const errors = {
  badRequest: (message: string, details?: any) => new BadRequestError(message, details),
  unauthorized: (message?: string) => new UnauthorizedError(message),
  forbidden: (message?: string) => new ForbiddenError(message),
  notFound: (resource?: string) => new NotFoundError(resource),
  conflict: (message: string, details?: any) => new ConflictError(message, details),
  validation: (message: string, details?: any) => new ValidationError(message, details),
  rateLimit: (retryAfter?: number) => new RateLimitError(undefined, retryAfter),
  internal: (message?: string) => new InternalServerError(message),
  serviceUnavailable: (service: string) => new ServiceUnavailableError(service),
  timeout: (message?: string) => new TimeoutError(message),
}
