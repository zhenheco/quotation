/**
 * 安全模組索引
 * Account-system → quotation-system 整合
 */

// 加密與遮罩
export * from './encryption'

/**
 * 驗證並清理搜尋查詢輸入
 * 防止 Supabase .or() filter injection 攻擊
 *
 * @param query - 原始搜尋字串
 * @param maxLength - 最大長度限制（預設 100）
 * @returns 清理後的安全字串
 */
export function sanitizeSearchQuery(query: string | null | undefined, maxLength = 100): string {
  if (!query) return ''

  // 移除可能用於 filter injection 的特殊字元
  // PostgREST filter 語法使用: . , ( ) 等
  const sanitized = query
    .replace(/[.,(){}[\]\\'"`;]/g, '') // 移除 PostgREST 特殊字元
    .replace(/\s+/g, ' ')              // 正規化空白
    .trim()
    .slice(0, maxLength)               // 限制長度

  return sanitized
}

/**
 * 驗證 UUID 格式
 */
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}
