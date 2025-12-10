/**
 * 重試工具函數測試
 * 測試路徑: lib/utils/retry.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withRetry } from '@/lib/utils/retry'

describe('withRetry - 重試工具函數', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  describe('基本功能', () => {
    it('應該在第一次成功時直接返回結果', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await withRetry(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('應該在失敗後重試並最終成功', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const resultPromise = withRetry(operation, {
        shouldRetry: () => true
      })

      // 快進時間以跳過延遲
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('應該在達到最大重試次數後拋出錯誤', async () => {
      // 使用真實 timers 和極短的延遲
      vi.useRealTimers()

      let callCount = 0
      const operation = vi.fn().mockImplementation(async () => {
        callCount++
        throw new Error('always fail')
      })

      await expect(
        withRetry(operation, {
          maxRetries: 2,
          baseDelayMs: 1, // 使用極短延遲
          shouldRetry: () => true
        })
      ).rejects.toThrow('always fail')

      // 初始嘗試 + 2 次重試 = 3 次
      expect(callCount).toBe(3)

      // 恢復 fake timers
      vi.useFakeTimers()
    })
  })

  describe('shouldRetry 條件', () => {
    it('當 shouldRetry 返回 false 時不應該重試', async () => {
      const error = new Error('non-retryable')
      const operation = vi.fn().mockRejectedValue(error)

      await expect(
        withRetry(operation, {
          shouldRetry: () => false
        })
      ).rejects.toThrow('non-retryable')

      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('應該根據錯誤類型決定是否重試', async () => {
      const retryableError = { code: '23505', message: 'conflict' }
      const nonRetryableError = new Error('other error')

      const isConflictError = (err: unknown) => {
        return (err as { code?: string })?.code === '23505'
      }

      // 可重試的錯誤
      const operation1 = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success')

      const resultPromise1 = withRetry(operation1, {
        shouldRetry: isConflictError
      })
      await vi.runAllTimersAsync()
      const result1 = await resultPromise1

      expect(result1).toBe('success')
      expect(operation1).toHaveBeenCalledTimes(2)

      // 不可重試的錯誤
      const operation2 = vi.fn().mockRejectedValue(nonRetryableError)

      await expect(
        withRetry(operation2, {
          shouldRetry: isConflictError
        })
      ).rejects.toThrow('other error')

      expect(operation2).toHaveBeenCalledTimes(1)
    })
  })

  describe('指數退避延遲', () => {
    it('應該使用指數退避策略', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockRejectedValueOnce(new Error('fail 3'))
        .mockResolvedValue('success')

      const baseDelayMs = 100

      const resultPromise = withRetry(operation, {
        maxRetries: 3,
        baseDelayMs,
        shouldRetry: () => true
      })

      // 第一次失敗後，延遲 100ms (100 * 2^0)
      expect(operation).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(100)

      // 第二次失敗後，延遲 200ms (100 * 2^1)
      expect(operation).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(200)

      // 第三次失敗後，延遲 400ms (100 * 2^2)
      expect(operation).toHaveBeenCalledTimes(3)
      await vi.advanceTimersByTimeAsync(400)

      // 第四次成功
      expect(operation).toHaveBeenCalledTimes(4)

      const result = await resultPromise
      expect(result).toBe('success')
    })
  })

  describe('預設參數', () => {
    it('應該使用預設的 maxRetries = 3', async () => {
      // 使用真實 timers 和極短的延遲
      vi.useRealTimers()

      let callCount = 0
      const operation = vi.fn().mockImplementation(async () => {
        callCount++
        throw new Error('fail')
      })

      await expect(
        withRetry(operation, {
          baseDelayMs: 1, // 使用極短延遲
          shouldRetry: () => true
        })
      ).rejects.toThrow('fail')

      // 初始嘗試 + 3 次重試（預設）= 4 次
      expect(callCount).toBe(4)

      // 恢復 fake timers
      vi.useFakeTimers()
    })

    it('應該使用預設的 baseDelayMs = 100', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')

      const resultPromise = withRetry(operation, {
        shouldRetry: () => true
      })

      // 應該在 100ms 後重試
      expect(operation).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(50)
      expect(operation).toHaveBeenCalledTimes(1) // 還沒重試
      await vi.advanceTimersByTimeAsync(50)
      expect(operation).toHaveBeenCalledTimes(2) // 已重試

      const result = await resultPromise
      expect(result).toBe('success')
    })
  })

  describe('邊界情況', () => {
    it('當 maxRetries = 0 時不應該重試', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('fail'))

      await expect(
        withRetry(operation, {
          maxRetries: 0,
          shouldRetry: () => true
        })
      ).rejects.toThrow('fail')

      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('應該正確處理非同步操作', async () => {
      const operation = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'async result'
      })

      const resultPromise = withRetry(operation)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('async result')
    })
  })
})
