/**
 * Supabase Mock
 */

import { vi } from 'vitest'

// 創建一個可重用的查詢建構器
export const queryBuilder = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  gte: vi.fn(),
  lt: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
}

// 重置 queryBuilder 所有方法為返回 this（用於鏈式調用）
export function resetQueryBuilder() {
  // 使用 mockImplementation 讓測試可以用 mockResolvedValue 覆蓋
  queryBuilder.select.mockReset().mockImplementation(() => queryBuilder)
  queryBuilder.insert.mockReset().mockImplementation(() => queryBuilder)
  queryBuilder.update.mockReset().mockImplementation(() => queryBuilder)
  queryBuilder.delete.mockReset().mockImplementation(() => queryBuilder)
  queryBuilder.eq.mockReset().mockImplementation(() => queryBuilder)
  queryBuilder.in.mockReset().mockImplementation(() => queryBuilder)
  queryBuilder.gte.mockReset().mockImplementation(() => queryBuilder)
  queryBuilder.lt.mockReset().mockImplementation(() => queryBuilder)
  queryBuilder.order.mockReset().mockImplementation(() => queryBuilder)
  queryBuilder.limit.mockReset().mockImplementation(() => queryBuilder)
  queryBuilder.single.mockReset()
}

// 初始化 queryBuilder
resetQueryBuilder()

export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => queryBuilder),
}

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
  },
  ...overrides,
})

export const createMockQuotation = (overrides = {}) => ({
  id: 'test-quotation-id',
  quotation_number: 'QT-2025-001',
  user_id: 'test-user-id',
  customer_id: 'test-customer-id',
  issue_date: '2025-01-01',
  valid_until: '2025-01-31',
  status: 'draft',
  currency: 'TWD',
  subtotal: 10000,
  tax_rate: 5,
  tax_amount: 500,
  total_amount: 10500,
  notes: 'Test notes',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  customers: {
    id: 'test-customer-id',
    name: { zh: '測試客戶', en: 'Test Customer' },
    email: 'customer@example.com',
    phone: '0912345678',
    address: { zh: '台北市', en: 'Taipei' },
  },
  ...overrides,
})

export const createMockQuotationItem = (overrides = {}) => ({
  id: 'test-item-id',
  quotation_id: 'test-quotation-id',
  product_id: 'test-product-id',
  quantity: 2,
  unit_price: 5000,
  discount: 0,
  subtotal: 10000,
  products: {
    id: 'test-product-id',
    name: { zh: '測試產品', en: 'Test Product' },
    description: { zh: '測試描述', en: 'Test Description' },
    price: 5000,
    currency: 'TWD',
  },
  ...overrides,
})
