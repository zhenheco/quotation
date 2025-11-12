/**
 * Supabase Mock
 */

import { vi } from 'vitest'

// 創建一個可重用的查詢建構器
// 使用函式讓每個方法可以被 .mockResolvedValue() 覆蓋
const queryBuilder = {
  select: vi.fn(function(this: typeof queryBuilder) { return this }),
  insert: vi.fn(function(this: typeof queryBuilder) { return this }),
  update: vi.fn(function(this: typeof queryBuilder) { return this }),
  delete: vi.fn(function(this: typeof queryBuilder) { return this }),
  eq: vi.fn(function(this: typeof queryBuilder) { return this }),
  in: vi.fn(function(this: typeof queryBuilder) { return this }),
  gte: vi.fn(function(this: typeof queryBuilder) { return this }),
  lt: vi.fn(function(this: typeof queryBuilder) { return this }),
  order: vi.fn(function(this: typeof queryBuilder) { return this }),
  limit: vi.fn(function(this: typeof queryBuilder) { return this }),
  single: vi.fn(),
}

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
