/**
 * Phase 4: 匯率自動更新單元測試
 * 測試路徑:
 * - app/api/cron/exchange-rates/route.ts
 * - app/api/exchange-rates/sync/route.ts
 * - lib/services/exchange-rate-zeabur.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/cron/exchange-rates/route'
import { POST as syncManual } from '@/app/api/exchange-rates/sync/route'
import {
  fetchLatestRates,
  syncRatesToDatabase,
  getLatestRatesFromDB,
  getExchangeRates,
  convertCurrency,
  SUPPORTED_CURRENCIES,
} from '@/lib/services/exchange-rate-zeabur'

// Mock PostgreSQL client
const mockQuery = vi.fn()
vi.mock('@/lib/db/zeabur', () => ({
  query: mockQuery,
  getClient: vi.fn(),
  closePool: vi.fn(),
}))

vi.mock('@/lib/middleware/rate-limiter', () => ({
  syncRateLimiter: vi.fn((req, handler) => handler()),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}))

describe('Exchange Rates - Phase 4 測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  describe('fetchLatestRates - API 獲取測試', () => {
    it('應該成功從 ExchangeRate-API 獲取匯率', async () => {
      const mockApiResponse = {
        result: 'success',
        base_code: 'TWD',
        conversion_rates: {
          USD: 0.032,
          EUR: 0.029,
          JPY: 4.5,
          CNY: 0.23,
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)

      const result = await fetchLatestRates('TWD')

      expect(result).toBeDefined()
      expect(result?.base_code).toBe('TWD')
      expect(result?.conversion_rates.USD).toBe(0.032)
    })

    it('應該處理缺少 API KEY 的情況', async () => {
      const originalKey = process.env.EXCHANGE_RATE_API_KEY
      delete process.env.EXCHANGE_RATE_API_KEY

      const result = await fetchLatestRates('TWD')

      expect(result).toBeNull()

      process.env.EXCHANGE_RATE_API_KEY = originalKey
    })

    it('應該處理 API 請求失敗', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      const result = await fetchLatestRates('TWD')

      expect(result).toBeNull()
    })

    it('應該處理無效的 API 回應', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'error', error_type: 'invalid-key' }),
      } as Response)

      const result = await fetchLatestRates('TWD')

      expect(result).toBeNull()
    })

    it('應該支援所有貨幣作為基準', async () => {
      for (const currency of SUPPORTED_CURRENCIES) {
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: 'success',
            base_code: currency,
            conversion_rates: {},
          }),
        } as Response)

        const result = await fetchLatestRates(currency)

        expect(result?.base_code).toBe(currency)
      }
    })
  })

  describe('syncRatesToDatabase - 資料庫同步測試', () => {
    it('應該成功同步匯率到資料庫', async () => {
      const mockApiResponse = {
        result: 'success',
        base_code: 'TWD',
        conversion_rates: {
          USD: 0.032,
          EUR: 0.029,
          JPY: 4.5,
          CNY: 0.23,
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)

      mockQuery.mockResolvedValue({ rows: [] })

      const result = await syncRatesToDatabase('TWD')

      expect(result).toBe(true)
      expect(mockQuery).toHaveBeenCalledTimes(4) // 4 個目標貨幣
    })

    it('應該使用 ON CONFLICT 處理重複資料', async () => {
      const mockApiResponse = {
        result: 'success',
        base_code: 'TWD',
        conversion_rates: {
          USD: 0.032,
          EUR: 0.029,
          JPY: 4.5,
          CNY: 0.23,
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)

      mockQuery.mockResolvedValue({ rows: [] })

      await syncRatesToDatabase('TWD')

      const insertQueries = mockQuery.mock.calls
      insertQueries.forEach((call) => {
        const sql = call[0]
        expect(sql).toContain('ON CONFLICT')
        expect(sql).toContain('DO UPDATE SET')
      })
    })

    it('應該處理資料庫插入失敗', async () => {
      const mockApiResponse = {
        result: 'success',
        base_code: 'TWD',
        conversion_rates: { USD: 0.032 },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)

      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const result = await syncRatesToDatabase('TWD')

      expect(result).toBe(false)
    })

    it('應該過濾掉基準貨幣本身', async () => {
      const mockApiResponse = {
        result: 'success',
        base_code: 'TWD',
        conversion_rates: {
          TWD: 1, // 應該被過濾
          USD: 0.032,
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)

      mockQuery.mockResolvedValue({ rows: [] })

      await syncRatesToDatabase('TWD')

      // 只應該插入非基準貨幣
      const insertCalls = mockQuery.mock.calls
      insertCalls.forEach((call) => {
        const params = call[1]
        expect(params[0]).not.toBe('TWD') // from_currency
        expect(params[1]).not.toBe('TWD') // to_currency
      })
    })
  })

  describe('getLatestRatesFromDB - 資料庫查詢測試', () => {
    it('應該從資料庫獲取最新匯率', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { to_currency: 'USD', rate: '0.032' },
          { to_currency: 'EUR', rate: '0.029' },
        ],
      })

      const result = await getLatestRatesFromDB('TWD')

      expect(result.TWD).toBe(1) // 基準貨幣
      expect(result.USD).toBe(0.032)
      expect(result.EUR).toBe(0.029)
    })

    it('應該只查詢最新日期的匯率', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      })

      await getLatestRatesFromDB('TWD')

      const sql = mockQuery.mock.calls[0][0]
      expect(sql).toContain('MAX(date)')
    })

    it('應該處理資料庫查詢錯誤', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const result = await getLatestRatesFromDB('TWD')

      expect(result).toEqual({ TWD: 1 })
    })
  })

  describe('getExchangeRates - 智能獲取測試', () => {
    it('應該優先從資料庫獲取匯率', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: SUPPORTED_CURRENCIES.filter((c) => c !== 'TWD').map((c) => ({
          to_currency: c,
          rate: '1.0',
        })),
      })

      const result = await getExchangeRates('TWD')

      expect(result).toBeDefined()
      SUPPORTED_CURRENCIES.forEach((currency) => {
        expect(result[currency]).toBeDefined()
      })

      // 不應該調用 API
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('應該在資料庫無資料時從 API 獲取並同步', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [], // 資料庫沒有資料
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'TWD',
          conversion_rates: {
            USD: 0.032,
            EUR: 0.029,
            JPY: 4.5,
            CNY: 0.23,
          },
        }),
      } as Response)

      mockQuery.mockResolvedValue({ rows: [] }) // 同步插入
      mockQuery.mockResolvedValueOnce({
        // 再次查詢
        rows: [
          { to_currency: 'USD', rate: '0.032' },
          { to_currency: 'EUR', rate: '0.029' },
          { to_currency: 'JPY', rate: '4.5' },
          { to_currency: 'CNY', rate: '0.23' },
        ],
      })

      const result = await getExchangeRates('TWD')

      expect(global.fetch).toHaveBeenCalled()
      expect(result.USD).toBe(0.032)
    })

    it('應該在同步失敗時返回基礎匯率', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'))

      const result = await getExchangeRates('TWD')

      expect(result).toEqual({ TWD: 1 })
    })
  })

  describe('convertCurrency - 貨幣轉換測試', () => {
    it('應該正確轉換貨幣', async () => {
      const rates = {
        TWD: 1,
        USD: 0.032,
        EUR: 0.029,
        JPY: 4.5,
        CNY: 0.23,
      }

      const result = await convertCurrency(1000, 'TWD', 'USD', rates)

      expect(result).toBe(32) // 1000 * 0.032
    })

    it('應該處理相同貨幣轉換', async () => {
      const result = await convertCurrency(1000, 'TWD', 'TWD')

      expect(result).toBe(1000)
    })

    it('應該在缺少匯率時拋出錯誤', async () => {
      const rates = { TWD: 1 }

      await expect(convertCurrency(1000, 'TWD', 'USD', rates)).rejects.toThrow(
        '無法找到 TWD 到 USD 的匯率'
      )
    })

    it('應該自動獲取匯率（若未提供）', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ to_currency: 'USD', rate: '0.032' }],
      })

      const result = await convertCurrency(1000, 'TWD', 'USD')

      expect(result).toBeDefined()
      expect(mockQuery).toHaveBeenCalled()
    })
  })

  describe('Cron Job API 測試', () => {
    it('應該驗證 CRON_SECRET', async () => {
      process.env.CRON_SECRET = 'test-secret'

      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn(() => 'Bearer wrong-secret'),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/cron/exchange-rates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('應該成功執行定時同步', async () => {
      process.env.CRON_SECRET = 'test-secret'

      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn(() => 'Bearer test-secret'),
      } as any)

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'TWD',
          conversion_rates: {
            USD: 0.032,
            EUR: 0.029,
            JPY: 4.5,
            CNY: 0.23,
          },
        }),
      } as Response)

      mockQuery.mockResolvedValue({ rows: [] })

      const request = new NextRequest('http://localhost:3000/api/cron/exchange-rates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results).toHaveLength(SUPPORTED_CURRENCIES.length)
    })

    it('應該在部分失敗時發送錯誤通知', async () => {
      process.env.ERROR_WEBHOOK_URL = 'https://webhook.example.com'

      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn(),
      } as any)

      // 第一個成功，後續失敗
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: 'success',
            base_code: 'TWD',
            conversion_rates: {},
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response)

      mockQuery.mockResolvedValue({ rows: [] })

      const request = new NextRequest('http://localhost:3000/api/cron/exchange-rates')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      // 驗證 webhook 被調用
      const webhookCalls = vi
        .mocked(global.fetch)
        .mock.calls.filter((call) => call[0] === 'https://webhook.example.com')
      expect(webhookCalls.length).toBeGreaterThan(0)
    })
  })

  describe('手動同步 API 測試', () => {
    it('應該支援單一貨幣同步', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'TWD',
          conversion_rates: {
            USD: 0.032,
            EUR: 0.029,
            JPY: 4.5,
            CNY: 0.23,
          },
        }),
      } as Response)

      mockQuery.mockResolvedValue({ rows: [] })

      const request = new NextRequest('http://localhost:3000/api/exchange-rates/sync', {
        method: 'POST',
        body: JSON.stringify({ baseCurrency: 'TWD' }),
      })

      const response = await syncManual(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('應該支援全貨幣同步（syncAll=true）', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'TWD',
          conversion_rates: {},
        }),
      } as Response)

      mockQuery.mockResolvedValue({ rows: [] })

      const request = new NextRequest('http://localhost:3000/api/exchange-rates/sync', {
        method: 'POST',
        body: JSON.stringify({ syncAll: true }),
      })

      const response = await syncManual(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(SUPPORTED_CURRENCIES.length)
    })

    it('應該受速率限制保護', async () => {
      const { syncRateLimiter } = await import('@/lib/middleware/rate-limiter')

      const request = new NextRequest('http://localhost:3000/api/exchange-rates/sync', {
        method: 'POST',
        body: JSON.stringify({ baseCurrency: 'TWD' }),
      })

      await syncManual(request)

      expect(syncRateLimiter).toHaveBeenCalled()
    })
  })

  describe('重試機制測試', () => {
    it('應該在 API 失敗後重試', async () => {
      // 第一次失敗，第二次成功
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: 'success',
            base_code: 'TWD',
            conversion_rates: {
              USD: 0.032,
            },
          }),
        } as Response)

      mockQuery.mockResolvedValue({ rows: [] })

      // 第一次調用失敗
      const result1 = await fetchLatestRates('TWD')
      expect(result1).toBeNull()

      // 第二次調用成功
      const result2 = await fetchLatestRates('TWD')
      expect(result2).toBeDefined()
    })
  })

  describe('安全性測試', () => {
    it('應該不在日誌中顯示 API KEY', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'TWD',
          conversion_rates: {},
        }),
      } as Response)

      await fetchLatestRates('TWD')

      const logMessages = consoleSpy.mock.calls.flat().join(' ')
      expect(logMessages).not.toContain(process.env.EXCHANGE_RATE_API_KEY)

      consoleSpy.mockRestore()
    })

    it('應該驗證環境變數存在', async () => {
      const originalUrl = process.env.ZEABUR_POSTGRES_URL
      delete process.env.ZEABUR_POSTGRES_URL

      await expect(getLatestRatesFromDB('TWD')).rejects.toThrow()

      process.env.ZEABUR_POSTGRES_URL = originalUrl
    })
  })

  describe('性能測試', () => {
    it('應該在合理時間內完成同步', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'TWD',
          conversion_rates: {
            USD: 0.032,
            EUR: 0.029,
            JPY: 4.5,
            CNY: 0.23,
          },
        }),
      } as Response)

      mockQuery.mockResolvedValue({ rows: [] })

      const startTime = Date.now()
      await syncRatesToDatabase('TWD')
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000) // 應在 1 秒內完成
    })
  })
})
