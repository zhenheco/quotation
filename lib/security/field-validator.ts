/**
 * 欄位白名單驗證模組
 *
 * 用於防止 SQL Injection 攻擊，確保只有合法的欄位可以被更新
 *
 * 使用方式:
 * ```typescript
 * import { validateFields } from '@/lib/security/field-validator'
 *
 * const data = { name: 'test', malicious: 'DROP TABLE' }
 * const validData = validateFields(data, CUSTOMER_ALLOWED_FIELDS)
 * // 結果: { name: 'test' } - malicious 欄位被過濾掉
 * ```
 */

// ========================================
// 欄位白名單定義
// ========================================

/**
 * Customer 表允許更新的欄位
 */
export const CUSTOMER_ALLOWED_FIELDS = [
  'name',
  'email',
  'phone',
  'address',
  'tax_id',
  'contact_person'
] as const

/**
 * Product 表允許更新的欄位
 */
export const PRODUCT_ALLOWED_FIELDS = [
  'sku',
  'name',
  'description',
  'unit_price',
  'currency',
  'category'
] as const

/**
 * Quotation 表允許更新的欄位
 */
export const QUOTATION_ALLOWED_FIELDS = [
  'customer_id',
  'quotation_number',
  'status',
  'issue_date',
  'valid_until',
  'currency',
  'subtotal',
  'tax_rate',
  'tax_amount',
  'total_amount',
  'notes'
] as const

/**
 * QuotationItem 表允許更新的欄位
 */
export const QUOTATION_ITEM_ALLOWED_FIELDS = [
  'product_id',
  'quantity',
  'unit_price',
  'discount',
  'subtotal'
] as const

/**
 * Company 表允許更新的欄位
 */
export const COMPANY_ALLOWED_FIELDS = [
  'name',
  'address',
  'phone',
  'email',
  'tax_id',
  'website',
  'logo_url',
  'bank_account',
  'bank_name'
] as const

// ========================================
// 驗證函式
// ========================================

/**
 * 驗證欄位是否在白名單中
 *
 * @param fieldName - 欄位名稱
 * @param allowedFields - 允許的欄位白名單
 * @returns 是否為合法欄位
 *
 * @example
 * ```typescript
 * isFieldAllowed('name', CUSTOMER_ALLOWED_FIELDS) // true
 * isFieldAllowed('id', CUSTOMER_ALLOWED_FIELDS)   // false
 * isFieldAllowed('DROP TABLE', CUSTOMER_ALLOWED_FIELDS) // false
 * ```
 */
export function isFieldAllowed(
  fieldName: string,
  allowedFields: readonly string[]
): boolean {
  return allowedFields.includes(fieldName)
}

/**
 * 過濾並驗證欄位，只保留白名單中的欄位
 *
 * @param data - 原始資料物件
 * @param allowedFields - 允許的欄位白名單
 * @returns 過濾後的安全資料物件
 * @throws Error 如果發現非法欄位（在嚴格模式下）
 *
 * @example
 * ```typescript
 * const data = {
 *   name: 'John',
 *   email: 'john@example.com',
 *   malicious: 'DROP TABLE users'
 * }
 *
 * const safe = validateFields(data, CUSTOMER_ALLOWED_FIELDS)
 * // 結果: { name: 'John', email: 'john@example.com' }
 * // malicious 欄位被自動過濾掉
 * ```
 */
export function validateFields<T extends Record<string, any>>(
  data: T,
  allowedFields: readonly string[],
  options: { strict?: boolean; throwOnInvalid?: boolean } = {}
): Partial<T> {
  const { strict = false, throwOnInvalid = false } = options

  const validatedData: Partial<T> = {}
  const invalidFields: string[] = []

  for (const [key, value] of Object.entries(data)) {
    if (isFieldAllowed(key, allowedFields)) {
      validatedData[key as keyof T] = value
    } else {
      invalidFields.push(key)

      // 記錄警告（生產環境會被 Next.js 移除）
      console.warn(`⚠️  Security: Attempted to update invalid field: ${key}`)
    }
  }

  // 嚴格模式：發現非法欄位時拋出錯誤
  if (throwOnInvalid && invalidFields.length > 0) {
    throw new Error(
      `Invalid fields detected: ${invalidFields.join(', ')}. ` +
      `Allowed fields: ${allowedFields.join(', ')}`
    )
  }

  // 記錄過濾資訊（開發環境）
  if (process.env.NODE_ENV === 'development' && invalidFields.length > 0) {
    console.log(`🛡️  Filtered invalid fields: ${invalidFields.join(', ')}`)
  }

  return validatedData
}

/**
 * 建立 SQL UPDATE 語句的欄位部分
 *
 * @param data - 要更新的資料
 * @param allowedFields - 允許的欄位白名單
 * @param startParam - 起始參數編號（預設為 1）
 * @returns { fields, values, paramCount } - SQL 欄位字串、值陣列、下一個參數編號
 *
 * @example
 * ```typescript
 * const data = { name: 'John', email: 'john@example.com' }
 * const { fields, values, paramCount } = buildUpdateFields(
 *   data,
 *   CUSTOMER_ALLOWED_FIELDS
 * )
 *
 * // 結果:
 * // fields: ['name = $1', 'email = $2']
 * // values: ['John', 'john@example.com']
 * // paramCount: 3
 *
 * // 使用於 SQL:
 * const sql = `UPDATE customers SET ${fields.join(', ')}
 *              WHERE id = $${paramCount} AND user_id = $${paramCount + 1}`
 * const params = [...values, id, userId]
 * ```
 */
export function buildUpdateFields<T extends Record<string, any>>(
  data: T,
  allowedFields: readonly string[],
  startParam: number = 1
): { fields: string[]; values: any[]; paramCount: number } {
  // 先驗證欄位
  const validatedData = validateFields(data, allowedFields, { throwOnInvalid: true })

  const fields: string[] = []
  const values: any[] = []
  let paramCount = startParam

  for (const [key, value] of Object.entries(validatedData)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramCount++}`)
      values.push(value)
    }
  }

  return { fields, values, paramCount }
}

// ========================================
// 輔助函式
// ========================================

/**
 * 檢查物件是否包含任何非法欄位
 *
 * @param data - 要檢查的資料
 * @param allowedFields - 允許的欄位白名單
 * @returns 是否包含非法欄位
 */
export function hasInvalidFields(
  data: Record<string, any>,
  allowedFields: readonly string[]
): boolean {
  return Object.keys(data).some(key => !isFieldAllowed(key, allowedFields))
}

/**
 * 取得物件中所有非法的欄位名稱
 *
 * @param data - 要檢查的資料
 * @param allowedFields - 允許的欄位白名單
 * @returns 非法欄位名稱陣列
 */
export function getInvalidFields(
  data: Record<string, any>,
  allowedFields: readonly string[]
): string[] {
  return Object.keys(data).filter(key => !isFieldAllowed(key, allowedFields))
}

/**
 * 驗證並返回錯誤訊息（如果有）
 *
 * @param data - 要驗證的資料
 * @param allowedFields - 允許的欄位白名單
 * @returns 錯誤訊息，如果沒有錯誤則返回 null
 */
export function validateFieldsWithError(
  data: Record<string, any>,
  allowedFields: readonly string[]
): string | null {
  const invalidFields = getInvalidFields(data, allowedFields)

  if (invalidFields.length > 0) {
    return `Invalid fields: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`
  }

  return null
}
