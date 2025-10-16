/**
 * Phase 2: 圖表和分析功能單元測試
 * 測試路徑: lib/services/analytics.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getRevenueTrend,
  getCurrencyDistribution,
  getStatusStatistics,
  getDashboardSummary,
} from '@/lib/services/analytics'
import { mockSupabaseClient, createMockUser } from '../mocks/supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

describe('Analytics Service - Phase 2 測試', () => {
  const mockUser = createMockUser()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
  })

  describe('getRevenueTrend - 營收趨勢', () => {
    it('應該返回過去 6 個月的營收數據', async () => {
      const mockQuotations = [
        {
          issue_date: '2025-01-15',
          total_amount: 10000,
          currency: 'TWD',
          status: 'accepted',
        },
        {
          issue_date: '2025-01-20',
          total_amount: 15000,
          currency: 'TWD',
          status: 'accepted',
        },
        {
          issue_date: '2025-02-10',
          total_amount: 20000,
          currency: 'USD',
          status: 'accepted',
        },
      ]

      mockSupabaseClient.from().order.mockResolvedValue({
        data: mockQuotations,
        error: null,
      })

      const result = await getRevenueTrend(6)

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('month')
      expect(result[0]).toHaveProperty('revenue')
      expect(result[0]).toHaveProperty('count')
    })

    it('應該只統計已接受狀態的報價單營收', async () => {
      const mockQuotations = [
        { issue_date: '2025-01-15', total_amount: 10000, status: 'accepted' },
        { issue_date: '2025-01-16', total_amount: 5000, status: 'draft' },
        { issue_date: '2025-01-17', total_amount: 8000, status: 'sent' },
        { issue_date: '2025-01-18', total_amount: 12000, status: 'accepted' },
      ]

      mockSupabaseClient.from().order.mockResolvedValue({
        data: mockQuotations,
        error: null,
      })

      const result = await getRevenueTrend(1)

      // 驗證只有 accepted 的報價單被計入營收
      const totalRevenue = result.reduce((sum, item) => sum + item.revenue, 0)
      expect(totalRevenue).toBe(22000) // 10000 + 12000
    })

    it('應該填充缺失的月份數據（營收為 0）', async () => {
      mockSupabaseClient.from().order.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await getRevenueTrend(3)

      expect(result.length).toBeGreaterThan(0)
      result.forEach((item) => {
        expect(item.revenue).toBe(0)
        expect(item.count).toBe(0)
      })
    })

    it('應該處理未認證用戶', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getRevenueTrend(6)

      expect(result).toEqual([])
    })
  })

  describe('getCurrencyDistribution - 貨幣分布', () => {
    it('應該返回各貨幣的營收分布', async () => {
      const mockQuotations = [
        { currency: 'TWD', total_amount: 50000, status: 'accepted' },
        { currency: 'TWD', total_amount: 30000, status: 'accepted' },
        { currency: 'USD', total_amount: 2000, status: 'accepted' },
        { currency: 'EUR', total_amount: 1500, status: 'accepted' },
      ]

      mockSupabaseClient.from().eq.mockResolvedValue({
        data: mockQuotations,
        error: null,
      })

      const result = await getCurrencyDistribution()

      expect(result).toBeDefined()
      expect(result.length).toBe(3) // TWD, USD, EUR

      const twdData = result.find((item) => item.currency === 'TWD')
      expect(twdData?.value).toBe(80000)
      expect(twdData?.count).toBe(2)
    })

    it('應該只統計已接受狀態的報價單', async () => {
      const mockQuotations = [
        { currency: 'TWD', total_amount: 10000, status: 'accepted' },
        { currency: 'TWD', total_amount: 5000, status: 'draft' },
      ]

      mockSupabaseClient.from().eq.mockResolvedValue({
        data: mockQuotations.filter((q) => q.status === 'accepted'),
        error: null,
      })

      const result = await getCurrencyDistribution()

      const twdData = result.find((item) => item.currency === 'TWD')
      expect(twdData?.value).toBe(10000)
    })

    it('應該按營收金額降序排序', async () => {
      const mockQuotations = [
        { currency: 'EUR', total_amount: 1000, status: 'accepted' },
        { currency: 'TWD', total_amount: 50000, status: 'accepted' },
        { currency: 'USD', total_amount: 3000, status: 'accepted' },
      ]

      mockSupabaseClient.from().eq.mockResolvedValue({
        data: mockQuotations,
        error: null,
      })

      const result = await getCurrencyDistribution()

      expect(result[0].currency).toBe('TWD')
      expect(result[1].currency).toBe('USD')
      expect(result[2].currency).toBe('EUR')
    })

    it('應該處理未認證用戶', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getCurrencyDistribution()

      expect(result).toEqual([])
    })
  })

  describe('getStatusStatistics - 狀態統計', () => {
    it('應該返回所有狀態的統計數據', async () => {
      const mockQuotations = [
        { status: 'draft', total_amount: 5000 },
        { status: 'draft', total_amount: 3000 },
        { status: 'sent', total_amount: 10000 },
        { status: 'accepted', total_amount: 20000 },
        { status: 'rejected', total_amount: 8000 },
      ]

      mockSupabaseClient.from().eq.mockResolvedValue({
        data: mockQuotations,
        error: null,
      })

      const result = await getStatusStatistics()

      expect(result).toBeDefined()
      expect(result.length).toBe(4) // draft, sent, accepted, rejected

      const draftStats = result.find((item) => item.status === 'draft')
      expect(draftStats?.count).toBe(2)
      expect(draftStats?.value).toBe(8000)
    })

    it('應該初始化所有狀態（即使沒有數據）', async () => {
      mockSupabaseClient.from().eq.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await getStatusStatistics()

      expect(result.length).toBe(4)
      result.forEach((item) => {
        expect(item.count).toBe(0)
        expect(item.value).toBe(0)
      })
    })

    it('應該處理未認證用戶', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getStatusStatistics()

      expect(result).toEqual([])
    })
  })

  describe('getDashboardSummary - 儀表板摘要', () => {
    it('應該計算當月營收和成長率', async () => {
      const currentMonthQuotations = [
        { total_amount: 10000, status: 'accepted' },
        { total_amount: 15000, status: 'accepted' },
        { total_amount: 5000, status: 'draft' },
      ]

      const lastMonthQuotations = [
        { total_amount: 20000, status: 'accepted' },
      ]

      mockSupabaseClient.from().gte.mockResolvedValueOnce({
        data: currentMonthQuotations,
        error: null,
      })

      mockSupabaseClient.from().lt.mockResolvedValueOnce({
        data: lastMonthQuotations,
        error: null,
      })

      const result = await getDashboardSummary()

      expect(result).toBeDefined()
      expect(result?.currentMonthRevenue).toBe(25000)
      expect(result?.revenueGrowth).toBe(25) // (25000-20000)/20000 * 100
    })

    it('應該計算轉換率', async () => {
      const currentMonthQuotations = [
        { total_amount: 10000, status: 'accepted' },
        { total_amount: 15000, status: 'accepted' },
        { total_amount: 5000, status: 'sent' },
        { total_amount: 8000, status: 'rejected' },
        { total_amount: 3000, status: 'draft' },
      ]

      mockSupabaseClient.from().gte.mockResolvedValueOnce({
        data: currentMonthQuotations,
        error: null,
      })

      mockSupabaseClient.from().lt.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await getDashboardSummary()

      // 轉換率 = accepted / (sent + accepted + rejected)
      // = 2 / (1 + 2 + 1) = 2/4 = 50%
      expect(result?.conversionRate).toBe(50)
      expect(result?.acceptedCount).toBe(2)
      expect(result?.pendingCount).toBe(1)
      expect(result?.draftCount).toBe(1)
    })

    it('應該處理沒有上月數據的情況', async () => {
      const currentMonthQuotations = [
        { total_amount: 10000, status: 'accepted' },
      ]

      mockSupabaseClient.from().gte.mockResolvedValueOnce({
        data: currentMonthQuotations,
        error: null,
      })

      mockSupabaseClient.from().lt.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await getDashboardSummary()

      expect(result?.revenueGrowth).toBe(0)
      expect(result?.countGrowth).toBe(0)
    })

    it('應該處理未認證用戶', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getDashboardSummary()

      expect(result).toBeNull()
    })
  })

  describe('性能測試 - N+1 查詢問題', () => {
    it('應該避免 N+1 查詢', async () => {
      const mockQuotations = Array.from({ length: 100 }, (_, i) => ({
        issue_date: '2025-01-01',
        total_amount: 1000,
        currency: 'TWD',
        status: 'accepted',
      }))

      mockSupabaseClient.from().order.mockResolvedValue({
        data: mockQuotations,
        error: null,
      })

      const startTime = Date.now()
      await getRevenueTrend(6)
      const duration = Date.now() - startTime

      // 應該在合理時間內完成（< 100ms）
      expect(duration).toBeLessThan(100)

      // 驗證只調用了一次數據庫查詢
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1)
    })
  })
})
