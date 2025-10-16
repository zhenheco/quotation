/**
 * 測試環境設置文件
 * 在所有測試前執行
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock 環境變數
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.ZEABUR_POSTGRES_URL = 'postgresql://test:test@localhost:5432/test'
process.env.EXCHANGE_RATE_API_KEY = 'test-api-key'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.EMAIL_FROM = 'test@example.com'
process.env.COMPANY_NAME = 'Test Company'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Mock Next.js 模組
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'zh',
}))

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => 'zh',
}))

// 全局 fetch mock（預設）
global.fetch = vi.fn()

// 清理函數
afterEach(() => {
  vi.clearAllMocks()
})
