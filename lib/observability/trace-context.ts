/**
 * W3C Trace Context 實作
 * https://www.w3.org/TR/trace-context/
 */

export interface TraceContext {
  traceId: string;
  parentId: string | null;
  spanId: string;
  sampled: boolean;
}

/**
 * 產生 Trace ID (128-bit)
 */
export function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 產生 Span ID (64-bit)
 */
export function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 解析 W3C Traceparent Header
 * Format: version-trace-id-parent-id-trace-flags
 * Example: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 */
export function parseTraceParent(traceparent: string | null): TraceContext | null {
  if (!traceparent) return null;

  const parts = traceparent.split('-');
  if (parts.length !== 4) return null;

  const [version, traceId, parentId, flags] = parts;

  if (version !== '00') return null;
  if (traceId.length !== 32) return null;
  if (parentId.length !== 16) return null;

  const sampled = parseInt(flags, 16) & 1 ? true : false;

  return {
    traceId,
    parentId,
    spanId: generateSpanId(),
    sampled,
  };
}

/**
 * 產生 Traceparent Header
 */
export function formatTraceParent(context: TraceContext): string {
  const flags = context.sampled ? '01' : '00';
  return `00-${context.traceId}-${context.spanId}-${flags}`;
}

/**
 * 從 Request 提取或產生 Trace Context
 */
export function getTraceContext(request: Request): TraceContext {
  const traceparent = request.headers.get('traceparent');
  const parsed = parseTraceParent(traceparent);

  if (parsed) {
    return parsed;
  }

  return {
    traceId: generateTraceId(),
    parentId: null,
    spanId: generateSpanId(),
    sampled: true,
  };
}

/**
 * 設定 Response Headers
 */
export function setTraceHeaders(headers: Headers, context: TraceContext): void {
  headers.set('traceparent', formatTraceParent(context));
  headers.set('x-trace-id', context.traceId);
  headers.set('x-request-id', context.traceId);
}
