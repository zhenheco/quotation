/**
 * PII (個人識別資訊) 自動遮罩工具
 * 用於保護敏感資訊，符合 GDPR 要求
 */

export const PII_PATTERNS = {
  jwt: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  apiKey: /\b[a-zA-Z0-9]{32,}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  taiwanIdCard: /\b[A-Z][12]\d{8}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}\b/g,
  ipAddress: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
} as const;

export const PII_REDACTED_MARKERS = {
  email: '[EMAIL_REDACTED]',
  phone: '[PHONE_REDACTED]',
  creditCard: '[CARD_REDACTED]',
  taiwanIdCard: '[ID_REDACTED]',
  apiKey: '[API_KEY_REDACTED]',
  jwt: '[TOKEN_REDACTED]',
  ipAddress: '[IP_REDACTED]',
} as const;

export interface RedactionOptions {
  preserveStructure?: boolean;
  customPatterns?: Record<string, RegExp>;
  customMarkers?: Record<string, string>;
}

/**
 * 遮罩字串中的 PII 資訊
 * @param message 原始訊息
 * @param options 遮罩選項
 * @returns 遮罩後的訊息
 */
export function redactPII(message: string, options?: RedactionOptions): string {
  if (!message) return message;

  let redacted = message;
  const patterns = {
    ...PII_PATTERNS,
    ...(options?.customPatterns || {}),
  };
  const markers = {
    ...PII_REDACTED_MARKERS,
    ...(options?.customMarkers || {}),
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const marker = markers[key as keyof typeof markers] || `[${key.toUpperCase()}_REDACTED]`;

    if (options?.preserveStructure && (key === 'email' || key === 'phone')) {
      redacted = redacted.replace(pattern, (match) => {
        const parts = match.split('@');
        if (parts.length === 2) {
          return `${parts[0].slice(0, 2)}***@${parts[1]}`;
        }
        return marker;
      });
    } else {
      redacted = redacted.replace(pattern, marker);
    }
  }

  return redacted;
}

/**
 * 遮罩物件中的 PII 資訊
 * @param obj 原始物件
 * @param options 遮罩選項
 * @returns 遮罩後的物件
 */
export function redactPIIFromObject<T extends Record<string, unknown>>(
  obj: T,
  options?: RedactionOptions
): T {
  if (!obj || typeof obj !== 'object') return obj;

  const redacted: Record<string, unknown> = { ...obj };

  for (const [key, value] of Object.entries(redacted)) {
    if (typeof value === 'string') {
      redacted[key] = redactPII(value, options);
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactPIIFromObject(value as Record<string, unknown>, options);
    }
  }

  return redacted as T;
}

/**
 * 檢查字串是否包含 PII
 * @param message 待檢查訊息
 * @returns 是否包含 PII
 */
export function containsPII(message: string): boolean {
  if (!message) return false;

  for (const pattern of Object.values(PII_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(message)) {
      return true;
    }
  }

  return false;
}

/**
 * 取得訊息中檢測到的 PII 類型
 * @param message 待檢查訊息
 * @returns PII 類型陣列
 */
export function detectPIITypes(message: string): string[] {
  if (!message) return [];

  const types: string[] = [];

  for (const [key, pattern] of Object.entries(PII_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(message)) {
      types.push(key);
    }
  }

  return types;
}
