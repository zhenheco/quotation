/**
 * 觀測系統中介層
 * 自動記錄所有請求
 */

import type { D1Database, ExecutionContext, AnalyticsEngineDataset } from './types';
import { createLogger, type Logger } from './logger';
import { getTraceContext, setTraceHeaders, type TraceContext } from './trace-context';
import { createAnalytics, type Analytics } from './analytics';

export interface ObservabilityEnv {
  DB: D1Database;
  ANALYTICS?: AnalyticsEngineDataset;
}

export interface RequestContext {
  request: Request;
  env: ObservabilityEnv;
  executionContext: ExecutionContext;
  logger?: Logger;
  traceContext?: TraceContext;
  analytics?: Analytics;
}

/**
 * 包裝 fetch handler 以加入觀測性
 */
export function withObservability(
  handler: (ctx: RequestContext) => Promise<Response>
): (request: Request, env: ObservabilityEnv, ctx: ExecutionContext) => Promise<Response> {
  return async (request: Request, env: ObservabilityEnv, ctx: ExecutionContext): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(request.url);

    const traceContext = getTraceContext(request);
    const logger = createLogger(env.DB).withTraceContext(traceContext);
    const analytics = createAnalytics(env.ANALYTICS);

    const requestContext: RequestContext = {
      request,
      env,
      executionContext: ctx,
      logger,
      traceContext,
      analytics,
    };

    try {
      const response = await handler(requestContext);

      const durationMs = Date.now() - startTime;
      const status = response.status;

      if (status >= 400) {
        logger.error(
          `HTTP ${status}: ${request.method} ${url.pathname}`,
          {
            path: url.pathname,
            method: request.method,
            statusCode: status,
            durationMs,
          },
          ctx
        );
      } else if (durationMs > 2000) {
        logger.warn(
          `Slow request: ${request.method} ${url.pathname} (${durationMs}ms)`,
          {
            path: url.pathname,
            method: request.method,
            statusCode: status,
            durationMs,
          },
          ctx
        );
      }

      // 追蹤 API 請求指標
      analytics.trackAPIRequest(
        url.pathname,
        request.method,
        status,
        durationMs
      );

      setTraceHeaders(response.headers, traceContext);
      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      await logger.error(
        error as Error,
        {
          path: url.pathname,
          method: request.method,
          statusCode: 500,
          durationMs,
        },
        ctx
      );

      const errorResponse = new Response('Internal Server Error', { status: 500 });
      setTraceHeaders(errorResponse.headers, traceContext);

      return errorResponse;
    }
  };
}
