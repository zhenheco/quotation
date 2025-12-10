/**
 * 通用重試工具函數
 * 支援指數退避 (Exponential Backoff) 策略
 */

export interface RetryOptions {
  /** 最大重試次數（不含首次嘗試），預設 3 */
  maxRetries?: number
  /** 基礎延遲時間（毫秒），預設 100 */
  baseDelayMs?: number
  /** 判斷是否應該重試的函數，預設總是重試 */
  shouldRetry?: (error: unknown) => boolean
}

/**
 * 帶指數退避重試的操作包裝函數
 *
 * @param operation - 要執行的非同步操作
 * @param options - 重試選項
 * @returns 操作成功時的結果
 * @throws 最後一次嘗試的錯誤（當所有重試都失敗時）
 *
 * @example
 * ```typescript
 * // 基本用法
 * const result = await withRetry(
 *   () => fetchDataFromAPI(),
 *   { maxRetries: 3 }
 * )
 *
 * // 只對特定錯誤重試
 * const result = await withRetry(
 *   () => createRecord(),
 *   {
 *     maxRetries: 3,
 *     shouldRetry: (error) => isConflictError(error)
 *   }
 * )
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 100,
    shouldRetry = () => true
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // 如果不應該重試，或已達最大重試次數，直接拋出錯誤
      if (!shouldRetry(error) || attempt === maxRetries) {
        throw error
      }

      // 指數退避等待
      const delayMs = baseDelayMs * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  // TypeScript 需要這行（理論上不會執行到）
  throw lastError
}
