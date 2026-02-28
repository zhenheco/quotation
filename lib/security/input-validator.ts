/**
 * 輸入驗證與清理模組
 * 
 * 防止 XSS、SQL 注入等攻擊
 */

// 不使用外部依賴，使用內建清理方法

/**
 * XSS 攻擊模式
 */
const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?>/gi,
  /<applet[\s\S]*?>[\s\S]*?<\/applet>/gi,
  /<form[\s\S]*?>[\s\S]*?<\/form>/gi,
]

/**
 * SQL 注入模式
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /('|\"|;|--|\/\*|\*\/)/g,
  /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/gi,
  /(WAITFOR\s+DELAY)/gi,
  /(CAST\s*\()/gi,
  /(CONVERT\s*\()/gi,
]

/**
 * 路徑遍歷模式
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\\\]/g,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /\.\.%2f/gi,
  /\.\.%5c/gi,
]

/**
 * 驗證結果
 */
export interface ValidationResult {
  isValid: boolean
  sanitized?: string
  errors: string[]
}

/**
 * 驗證選項
 */
export interface ValidationOptions {
  /** 是否允許 HTML 標籤 */
  allowHtml?: boolean
  /** 最大長度限制 */
  maxLength?: number
  /** 最小長度限制 */
  minLength?: number
  /** 是否必填 */
  required?: boolean
  /** 自定義正則模式 */
  customPattern?: RegExp
  /** 是否檢查 SQL 注入 */
  checkSqlInjection?: boolean
  /** 是否檢查路徑遍歷 */
  checkPathTraversal?: boolean
}

/**
 * 檢查是否包含惡意模式
 */
function hasmaliciousPatterns(value: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(value))
}

/**
 * 移除危險字元
 */
function removeDangerousChars(value: string): string {
  // 移除控制字元 (除了常見的換行、製表符等)
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
}

/**
 * HTML 編碼
 */
function htmlEncode(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * 簡單的 HTML 清理 (移除所有標籤)
 */
function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '')
}

/**
 * 驗證並清理字串輸入
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: ValidationOptions = {}
): ValidationResult {
  const {
    allowHtml = false,
    maxLength = 10000,
    minLength = 0,
    required = false,
    customPattern,
    checkSqlInjection = true,
    checkPathTraversal = true,
  } = options

  const errors: string[] = []

  // 檢查類型
  if (typeof value !== 'string') {
    if (required || value != null) {
      errors.push(`${fieldName} must be a string`)
    }
    return { isValid: false, errors }
  }

  let sanitized = value.trim()

  // 檢查必填
  if (required && !sanitized) {
    errors.push(`${fieldName} is required`)
    return { isValid: false, errors }
  }

  // 空值處理
  if (!sanitized) {
    return { isValid: true, sanitized: '', errors: [] }
  }

  // 檢查長度
  if (sanitized.length > maxLength) {
    errors.push(`${fieldName} exceeds maximum length of ${maxLength}`)
  }
  if (sanitized.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters`)
  }

  // 檢查 XSS 攻擊
  if (hasmaliciousPatterns(sanitized, XSS_PATTERNS)) {
    errors.push(`${fieldName} contains potentially malicious content`)
  }

  // 檢查 SQL 注入
  if (checkSqlInjection && hasmaliciousPatterns(sanitized, SQL_INJECTION_PATTERNS)) {
    errors.push(`${fieldName} contains potentially malicious SQL patterns`)
  }

  // 檢查路徑遍歷
  if (checkPathTraversal && hasmaliciousPatterns(sanitized, PATH_TRAVERSAL_PATTERNS)) {
    errors.push(`${fieldName} contains path traversal patterns`)
  }

  // 自定義模式檢查
  if (customPattern && !customPattern.test(sanitized)) {
    errors.push(`${fieldName} does not match required format`)
  }

  // 清理輸入
  sanitized = removeDangerousChars(sanitized)

  if (allowHtml) {
    // 移除所有 HTML 標籤 (保守做法)
    sanitized = stripHtml(sanitized)
  } else {
    // HTML 編碼
    sanitized = htmlEncode(sanitized)
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
  }
}

/**
 * 驗證數值輸入
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean
    min?: number
    max?: number
    integer?: boolean
  } = {}
): ValidationResult {
  const { required = false, min, max, integer = false } = options
  const errors: string[] = []

  if (value == null || value === '') {
    if (required) {
      errors.push(`${fieldName} is required`)
    }
    return { isValid: !required, errors }
  }

  const num = typeof value === 'string' ? parseFloat(value) : Number(value)

  if (isNaN(num) || !isFinite(num)) {
    errors.push(`${fieldName} must be a valid number`)
    return { isValid: false, errors }
  }

  if (integer && !Number.isInteger(num)) {
    errors.push(`${fieldName} must be an integer`)
  }

  if (min !== undefined && num < min) {
    errors.push(`${fieldName} must be at least ${min}`)
  }

  if (max !== undefined && num > max) {
    errors.push(`${fieldName} must be at most ${max}`)
  }

  return {
    isValid: errors.length === 0,
    sanitized: num.toString(),
    errors,
  }
}

/**
 * 驗證 Email
 */
export function validateEmail(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): ValidationResult {
  const { required = false } = options
  
  // 先進行字串驗證
  const stringResult = validateString(value, fieldName, {
    required,
    maxLength: 254,
    checkSqlInjection: true,
  })

  if (!stringResult.isValid || !stringResult.sanitized) {
    return stringResult
  }

  // Email 格式驗證
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(stringResult.sanitized)) {
    return {
      isValid: false,
      errors: [`${fieldName} must be a valid email address`],
    }
  }

  return stringResult
}

/**
 * 驗證 URL
 */
export function validateUrl(
  value: unknown,
  fieldName: string,
  options: { required?: boolean; allowedProtocols?: string[] } = {}
): ValidationResult {
  const { required = false, allowedProtocols = ['http', 'https'] } = options

  const stringResult = validateString(value, fieldName, {
    required,
    maxLength: 2048,
    checkSqlInjection: true,
    checkPathTraversal: true,
  })

  if (!stringResult.isValid || !stringResult.sanitized) {
    return stringResult
  }

  try {
    const url = new URL(stringResult.sanitized)
    if (!allowedProtocols.includes(url.protocol.slice(0, -1))) {
      return {
        isValid: false,
        errors: [`${fieldName} must use allowed protocol (${allowedProtocols.join(', ')})`],
      }
    }
    return stringResult
  } catch {
    return {
      isValid: false,
      errors: [`${fieldName} must be a valid URL`],
    }
  }
}

/**
 * 驗證 UUID
 */
export function validateUuid(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): ValidationResult {
  const { required = false } = options

  const stringResult = validateString(value, fieldName, {
    required,
    maxLength: 36,
    minLength: 36,
    customPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    checkSqlInjection: false, // UUID 不需要檢查 SQL 注入
  })

  if (!stringResult.isValid) {
    // 自定義錯誤訊息
    return {
      isValid: false,
      errors: [`${fieldName} must be a valid UUID`],
    }
  }

  return stringResult
}

/**
 * 批量驗證物件
 */
export function validateObject(
  data: Record<string, unknown>,
  schema: Record<string, (value: unknown) => ValidationResult>
): { isValid: boolean; sanitized: Record<string, unknown>; errors: Record<string, string[]> } {
  const sanitized: Record<string, unknown> = {}
  const errors: Record<string, string[]> = {}
  let isValid = true

  for (const [key, validator] of Object.entries(schema)) {
    const result = validator(data[key])
    
    if (result.isValid && result.sanitized !== undefined) {
      sanitized[key] = result.sanitized
    }
    
    if (!result.isValid) {
      errors[key] = result.errors
      isValid = false
    }
  }

  return { isValid, sanitized, errors }
}

/**
 * 快速驗證常見欄位類型
 */
export const validators = {
  name: (value: unknown, required = true) =>
    validateString(value, 'name', { required, maxLength: 255, checkSqlInjection: true }),
  
  email: (value: unknown, required = false) =>
    validateEmail(value, 'email', { required }),
    
  phone: (value: unknown, required = false) =>
    validateString(value, 'phone', { required, maxLength: 50, checkSqlInjection: true }),
    
  address: (value: unknown, required = false) =>
    validateString(value, 'address', { required, maxLength: 1000, checkSqlInjection: true }),
    
  taxId: (value: unknown, required = false) =>
    validateString(value, 'tax_id', { required, maxLength: 50, checkSqlInjection: true }),
    
  companyId: (value: unknown, required = true) =>
    validateUuid(value, 'company_id', { required }),
    
  customerId: (value: unknown, required = true) =>
    validateUuid(value, 'customer_id', { required }),
    
  productId: (value: unknown, required = false) =>
    validateUuid(value, 'product_id', { required }),
    
  price: (value: unknown, required = true) =>
    validateNumber(value, 'price', { required, min: 0, max: 999999999 }),
    
  quantity: (value: unknown, required = true) =>
    validateNumber(value, 'quantity', { required, min: 0, max: 999999, integer: false }),
    
  notes: (value: unknown, required = false) =>
    validateString(value, 'notes', { required, maxLength: 5000, allowHtml: false }),
}