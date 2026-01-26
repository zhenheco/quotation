/**
 * Pricing Callback 頁面測試
 *
 * 測試範圍：
 * 1. 付款成功狀態顯示
 * 2. 付款失敗狀態顯示
 * 3. 自動導向功能（成功時 3 秒後導向 dashboard）
 * 4. 導航按鈕功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CallbackPage from '@/app/pricing/callback/page'

// Mock Next.js hooks
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}))

import { useSearchParams, useRouter } from 'next/navigation'

describe('Pricing Callback Page', () => {
  let mockPush: ReturnType<typeof vi.fn>
  let mockRouter: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockPush = vi.fn()
    mockRouter = {
      push: mockPush,
    }

    vi.mocked(useRouter).mockReturnValue(mockRouter)
  })

  describe('✅ 付款成功狀態', () => {
    it('應顯示成功圖示和訊息', async () => {
      const mockSearchParams = {
        get: (key: string) => {
          if (key === 'status') return 'success'
          if (key === 'message') return '付款成功！'
          return null
        },
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      await waitFor(() => {
        expect(screen.getByText('付款完成')).toBeInTheDocument()
        expect(screen.getByText('付款成功！')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('應顯示感謝訂閱訊息', async () => {
      const mockSearchParams = {
        get: (key: string) => {
          if (key === 'status') return 'success'
          return null
        },
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      await waitFor(() => {
        expect(screen.getByText(/感謝您的訂閱/)).toBeInTheDocument()
        expect(screen.getByText(/您的方案已經生效/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('應提供前往儀表板的按鈕', async () => {
      const mockSearchParams = {
        get: (key: string) => (key === 'status' ? 'success' : null),
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      await waitFor(() => {
        const dashboardButton = screen.getByText('前往儀表板')
        expect(dashboardButton).toBeInTheDocument()
        expect(dashboardButton.closest('a')).toHaveAttribute('href', '/dashboard')
      }, { timeout: 3000 })
    })

    it('應在 3 秒後自動導向到 dashboard', async () => {
      vi.useFakeTimers()

      const mockSearchParams = {
        get: (key: string) => (key === 'status' ? 'success' : null),
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      // 讓初始 useEffect 執行
      await vi.advanceTimersByTimeAsync(0)

      expect(screen.getByText('付款完成')).toBeInTheDocument()

      // 等待 3 秒觸發自動導向
      await vi.advanceTimersByTimeAsync(3000)

      expect(mockPush).toHaveBeenCalledWith('/dashboard')

      vi.useRealTimers()
    })

    it('SUCCESS (大寫) 應視為成功', async () => {
      const mockSearchParams = {
        get: (key: string) => (key === 'status' ? 'SUCCESS' : null),
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      await waitFor(() => {
        expect(screen.getByText('付款完成')).toBeInTheDocument()
        expect(screen.getByText(/感謝您的訂閱/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('❌ 付款失敗狀態', () => {
    it('應顯示失敗圖示和訊息', async () => {
      const mockSearchParams = {
        get: (key: string) => {
          if (key === 'status') return 'failed'
          if (key === 'message') return '付款失敗'
          return null
        },
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      await waitFor(() => {
        expect(screen.getByText('付款未完成')).toBeInTheDocument()
        expect(screen.getByText('付款失敗')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('應提供重新選擇方案的按鈕', async () => {
      const mockSearchParams = {
        get: (key: string) => (key === 'status' ? 'failed' : null),
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      await waitFor(() => {
        const retryButton = screen.getByText('重新選擇方案')
        expect(retryButton).toBeInTheDocument()
        expect(retryButton.closest('a')).toHaveAttribute('href', '/pricing')
      }, { timeout: 3000 })
    })

    it('應使用預設訊息當未提供 message', async () => {
      const mockSearchParams = {
        get: (key: string) => (key === 'status' ? 'failed' : null),
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      await waitFor(() => {
        expect(screen.getByText('付款失敗或已取消')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('失敗時不應自動導向', async () => {
      vi.useFakeTimers()

      const mockSearchParams = {
        get: (key: string) => (key === 'status' ? 'failed' : null),
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      // 讓初始 useEffect 執行
      await vi.advanceTimersByTimeAsync(0)

      expect(screen.getByText('付款未完成')).toBeInTheDocument()

      // 等待 3 秒
      await vi.advanceTimersByTimeAsync(3000)

      expect(mockPush).not.toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('🔍 其他狀態', () => {
    it('空 status 應視為失敗', async () => {
      const mockSearchParams = {
        get: () => null,
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      await waitFor(() => {
        expect(screen.getByText('付款未完成')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('應顯示客戶服務提示', async () => {
      const mockSearchParams = {
        get: (key: string) => (key === 'status' ? 'success' : null),
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      await waitFor(() => {
        expect(screen.getByText(/客戶服務/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('⏳ Loading 狀態', () => {
    it('應顯示 loading 狀態然後轉換為成功', async () => {
      const mockSearchParams = {
        get: (key: string) => (key === 'status' ? 'success' : null),
      } as any

      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)

      render(<CallbackPage />)

      // 等待狀態轉換
      await waitFor(
        () => {
          expect(screen.queryByText('處理中...')).not.toBeInTheDocument()
          expect(screen.getByText('付款完成')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })
  })
})
