/**
 * 統一的 API 回應格式工具
 *
 * 確保所有 API 端點使用一致的回應格式和安全標頭
 */

import { NextResponse } from "next/server";

/**
 * 標準 API 錯誤回應格式
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * 標準 API 成功回應格式
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * 為 API 回應添加安全標頭
 */
function addApiSecurityHeaders(response: NextResponse): NextResponse {
  // 基本安全標頭（針對 API 端點）
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // 確保 Content-Type 正確設定
  if (!response.headers.get("Content-Type")) {
    response.headers.set("Content-Type", "application/json");
  }

  return response;
}

/**
 * 創建統一的錯誤回應
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  options?: {
    code?: string;
    details?: unknown;
  },
): NextResponse {
  const response: ApiErrorResponse = {
    success: false,
    error: error,
    ...(options?.code && { code: options.code }),
    ...(options?.details && { details: options.details }),
  };

  const nextResponse = NextResponse.json(response, { status });
  return addApiSecurityHeaders(nextResponse);
}

/**
 * 創建統一的成功回應
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
): NextResponse {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data: data,
  };

  const nextResponse = NextResponse.json(response, { status });
  return addApiSecurityHeaders(nextResponse);
}

/**
 * 常用的錯誤回應
 */
export const ErrorResponses = {
  unauthorized: () => createErrorResponse("Unauthorized", 401),
  forbidden: (message = "Access denied") => createErrorResponse(message, 403),
  notFound: (resource = "Resource") =>
    createErrorResponse(`${resource} not found`, 404),
  badRequest: (message = "Invalid request") =>
    createErrorResponse(message, 400),
  methodNotAllowed: () => createErrorResponse("Method not allowed", 405),
  tooManyRequests: () => createErrorResponse("Too many requests", 429),
  internalServerError: (message = "Internal server error") =>
    createErrorResponse(message, 500),

  // 特定業務錯誤
  invalidInput: (details?: unknown) =>
    createErrorResponse("Invalid input data", 400, {
      code: "INVALID_INPUT",
      details,
    }),
  insufficientPermissions: (permission?: string) =>
    createErrorResponse(
      `Insufficient permissions${permission ? ` (required: ${permission})` : ""}`,
      403,
      { code: "INSUFFICIENT_PERMISSIONS" },
    ),
  resourceNotFound: (resource: string, id?: string) =>
    createErrorResponse(
      `${resource} not found${id ? ` (ID: ${id})` : ""}`,
      404,
      { code: "RESOURCE_NOT_FOUND" },
    ),
  validationFailed: (errors: string[]) =>
    createErrorResponse("Validation failed", 400, {
      code: "VALIDATION_FAILED",
      details: errors,
    }),
};

/**
 * 包裝現有的 NextResponse.json 以確保安全標頭
 *
 * @deprecated 請使用 createSuccessResponse 或 createErrorResponse
 */
export function secureApiResponse<T>(
  data: T,
  init?: ResponseInit,
): NextResponse {
  const response = NextResponse.json(data, init);
  return addApiSecurityHeaders(response);
}

/**
 * 統一的錯誤處理包裝器
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options?: {
    defaultError?: string;
    logErrors?: boolean;
  },
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      const defaultError = options?.defaultError || "Internal server error";
      const shouldLog = options?.logErrors !== false;

      if (shouldLog) {
        console.error("API Error:", error);
      }

      // 在開發環境中提供更詳細的錯誤信息
      if (process.env.NODE_ENV === "development" && error instanceof Error) {
        return createErrorResponse(error.message, 500, {
          details: error.stack,
        });
      }

      return createErrorResponse(defaultError, 500);
    }
  };
}
