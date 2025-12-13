'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api/errors'

/**
 * 統一的 API 錯誤處理 hook
 *
 * 提供一致的錯誤處理模式，包含：
 * - 錯誤訊息提取
 * - Toast 通知
 * - Console 記錄
 * - 認證錯誤重定向
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { handleError, getErrorMessage } = useApiError()
 *
 *   const handleSubmit = async () => {
 *     try {
 *       await apiPost('/api/data', data)
 *       toast.success('成功')
 *     } catch (error) {
 *       handleError(error, 'MyComponent.handleSubmit')
 *     }
 *   }
 * }
 * ```
 */
export function useApiError() {
  /**
   * 從錯誤物件提取使用者友善的訊息
   */
  const getErrorMessage = useCallback((error: unknown): string => {
    if (error instanceof ApiError) {
      return error.message
    }

    if (error instanceof Error) {
      return error.message
    }

    if (typeof error === 'string') {
      return error
    }

    return '發生未知錯誤，請稍後再試'
  }, [])

  /**
   * 處理錯誤：記錄到 console 並顯示 toast
   *
   * @param error - 錯誤物件
   * @param context - 錯誤發生的上下文（用於 debug）
   * @param options - 額外選項
   */
  const handleError = useCallback((
    error: unknown,
    context?: string,
    options?: {
      silent?: boolean  // 不顯示 toast
      redirect?: boolean // 認證錯誤時是否重定向
    }
  ) => {
    const message = getErrorMessage(error)

    // 記錄到 console
    if (context) {
      console.error(`[${context}]`, error)
    } else {
      console.error(error)
    }

    // 認證錯誤處理
    if (error instanceof ApiError && error.type === 'AUTHENTICATION_ERROR') {
      if (options?.redirect !== false) {
        // 預設重定向到登入頁
        window.location.href = '/login'
        return
      }
    }

    // 顯示 toast（除非 silent）
    if (!options?.silent) {
      toast.error(message)
    }
  }, [getErrorMessage])

  /**
   * 處理 mutation 錯誤的便捷方法
   * 用於 React Query 的 onError 回調
   */
  const handleMutationError = useCallback((
    error: unknown,
    context?: string
  ) => {
    handleError(error, context, { redirect: false })
  }, [handleError])

  return {
    handleError,
    handleMutationError,
    getErrorMessage,
  }
}

export default useApiError
