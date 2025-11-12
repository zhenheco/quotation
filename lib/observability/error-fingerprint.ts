/**
 * 錯誤 Fingerprint 生成工具
 * 用於錯誤去重和聚合
 */

export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string;
  type?: string;
}

/**
 * 生成錯誤的唯一指紋
 * 使用 message + stack 前 3 行生成 SHA-256 hash
 */
export async function getErrorFingerprint(error: ErrorInfo): Promise<string> {
  const { message, stack } = error;

  const stackLines = stack
    ? stack.split('\n').slice(0, 3).join('\n')
    : '';

  const content = `${message}|${stackLines}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * 從標準 Error 物件提取錯誤資訊
 */
export function extractErrorInfo(error: Error | unknown): ErrorInfo {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      type: error.name,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    return {
      message: String(err.message || 'Unknown error'),
      stack: err.stack ? String(err.stack) : undefined,
      code: err.code ? String(err.code) : undefined,
      type: err.name ? String(err.name) : undefined,
    };
  }

  return {
    message: 'Unknown error',
  };
}

/**
 * 格式化錯誤堆疊追蹤，只保留關鍵資訊
 */
export function formatStackTrace(stack: string | undefined, maxLines = 10): string | undefined {
  if (!stack) return undefined;

  const lines = stack.split('\n');
  const relevantLines = lines
    .slice(0, maxLines)
    .filter(line => {
      return !line.includes('node_modules') &&
             !line.includes('internal/');
    });

  return relevantLines.join('\n');
}
