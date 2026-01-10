/**
 * Supabase Mock
 *
 * 這個 mock 支援 Supabase 查詢建構器的鏈式調用。
 * 使用 Proxy 動態處理所有方法調用，確保鏈式調用可以繼續。
 */

import { vi, type Mock } from 'vitest'

// 儲存 mock 結果
let mockResult: { data: unknown; error: unknown; count?: number } = { data: null, error: null }

// Mock 方法追蹤
const mockCalls: { method: string; args: unknown[] }[] = []

// 查詢建構器介面
interface ChainableQueryResult {
  proxy: object
  methodMocks: Record<string, Mock>
  setResult: (result: { data: unknown; error: unknown; count?: number }) => void
  getCalls: () => { method: string; args: unknown[] }[]
  clearCalls: () => void
}

// 創建一個支持無限鏈式調用的查詢建構器
function createChainableQuery(): ChainableQueryResult {
  const methodMocks: Record<string, Mock> = {}

  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      // 如果是 then 屬性，返回一個 Promise resolver（用於 await）
      if (prop === 'then') {
        return (resolve: (value: unknown) => void) => {
          resolve(mockResult)
        }
      }

      // 為每個方法創建或返回 mock
      if (!methodMocks[prop]) {
        methodMocks[prop] = vi.fn()
      }

      // 返回一個函數，執行時記錄調用並返回可鏈式的 proxy
      return (...args: unknown[]) => {
        methodMocks[prop](...args)
        mockCalls.push({ method: prop, args })
        return proxy
      }
    },
  }

  const proxy = new Proxy({}, handler)

  return {
    proxy,
    methodMocks,
    setResult: (result: { data: unknown; error: unknown; count?: number }) => {
      mockResult = result
    },
    getCalls: () => [...mockCalls],
    clearCalls: () => {
      mockCalls.length = 0
    },
  }
}

// 創建查詢建構器
function createQueryBuilder(): ChainableQueryResult {
  return createChainableQuery()
}

const queryBuilderInstance = createQueryBuilder()

// 導出 queryBuilder 以便測試可以訪問 mock 方法
export const queryBuilder = {
  select: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  insert: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  update: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  delete: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  eq: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  neq: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  in: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  gte: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  gt: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  lte: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  lt: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  like: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  ilike: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  or: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  and: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  order: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  limit: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  range: vi.fn().mockImplementation(() => queryBuilderInstance.proxy),
  single: vi.fn().mockImplementation(() => Promise.resolve(mockResult)),
  maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(mockResult)),
  // 支持 Promise-like 行為
  then: (resolve: (value: unknown) => void) => resolve(mockResult),
}

// 設置查詢結果
export function setQueryResult(result: { data: unknown; error: unknown; count?: number }) {
  mockResult = result
}

// 重置 queryBuilder
export function resetQueryBuilder() {
  mockResult = { data: null, error: null }
  mockCalls.length = 0

  Object.keys(queryBuilder).forEach((key) => {
    if (key === 'then') return
    const mock = queryBuilder[key as keyof typeof queryBuilder]
    if (typeof mock === 'function' && 'mockReset' in mock) {
      (mock as Mock).mockReset()
      if (key === 'single' || key === 'maybeSingle') {
        (mock as Mock).mockImplementation(() => Promise.resolve(mockResult))
      } else {
        (mock as Mock).mockImplementation(() => queryBuilder)
      }
    }
  })
}

// 取得呼叫記錄
export function getQueryCalls() {
  return [...mockCalls]
}

// Storage Mock
export const storageBucket = {
  upload: vi.fn(),
  download: vi.fn(),
  remove: vi.fn(),
  list: vi.fn(),
  getPublicUrl: vi.fn(),
}

export const storageMock = {
  getBucket: vi.fn(),
  createBucket: vi.fn(),
  listBuckets: vi.fn(),
  from: vi.fn(() => storageBucket),
}

export function resetStorageMock() {
  storageMock.getBucket.mockReset()
  storageMock.createBucket.mockReset()
  storageMock.listBuckets.mockReset()
  storageMock.from.mockReset().mockImplementation(() => storageBucket)
  storageBucket.upload.mockReset()
  storageBucket.download.mockReset()
  storageBucket.remove.mockReset()
  storageBucket.list.mockReset()
  storageBucket.getPublicUrl.mockReset()
}

// 初始化 storage mock
resetStorageMock()

export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => queryBuilder),
  rpc: vi.fn(),
  storage: storageMock,
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

export const createMockCustomer = (overrides = {}) => ({
  id: 'test-customer-id',
  user_id: 'test-user-id',
  company_id: 'test-company-id',
  owner_id: 'test-user-id',
  customer_number: 'CUS-2025-001',
  name: { zh: '測試客戶', en: 'Test Customer' },
  email: 'customer@example.com',
  phone: '0912345678',
  fax: null,
  address: { zh: '台北市信義區', en: 'Xinyi District, Taipei' },
  tax_id: '12345678',
  contact_person: { name: '王小明', phone: '0912345678', email: 'contact@example.com' },
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const createMockProduct = (overrides = {}) => ({
  id: 'test-product-id',
  user_id: 'test-user-id',
  company_id: 'test-company-id',
  product_number: 'PRD-2025-001',
  sku: 'SKU-001',
  name: { zh: '測試商品', en: 'Test Product' },
  description: { zh: '這是測試商品描述', en: 'This is a test product description' },
  base_price: 1000,
  base_currency: 'TWD',
  category: 'electronics',
  cost_price: 800,
  cost_currency: 'TWD',
  profit_margin: 20,
  supplier: 'Test Supplier',
  supplier_code: 'SUP-001',
  unit: 'piece',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const createMockPayment = (overrides = {}) => ({
  id: 'test-payment-id',
  quotation_id: 'test-quotation-id',
  user_id: 'test-user-id',
  company_id: 'test-company-id',
  payment_number: 'PAY-2025-001',
  amount: 10000,
  currency: 'TWD',
  payment_method: 'bank_transfer',
  payment_date: '2025-01-15',
  status: 'completed',
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const createMockSupplier = (overrides = {}) => ({
  id: 'test-supplier-id',
  user_id: 'test-user-id',
  company_id: 'test-company-id',
  supplier_number: 'SUP-2025-001',
  name: { zh: '測試供應商', en: 'Test Supplier' },
  email: 'supplier@example.com',
  phone: '0223456789',
  fax: null,
  address: { zh: '新北市板橋區', en: 'Banqiao District, New Taipei' },
  tax_id: '87654321',
  contact_person: { name: '李大明', phone: '0923456789', email: 'supplier-contact@example.com' },
  payment_terms: 'Net 30',
  notes: null,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const createMockContract = (overrides = {}) => ({
  id: 'test-contract-id',
  quotation_id: 'test-quotation-id',
  user_id: 'test-user-id',
  company_id: 'test-company-id',
  contract_number: 'CON-2025-001',
  customer_id: 'test-customer-id',
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  total_amount: 120000,
  currency: 'TWD',
  status: 'active',
  terms: { zh: '合約條款', en: 'Contract Terms' },
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const createMockOrder = (overrides = {}) => ({
  id: 'test-order-id',
  quotation_id: 'test-quotation-id',
  user_id: 'test-user-id',
  company_id: 'test-company-id',
  order_number: 'ORD-2025-001',
  customer_id: 'test-customer-id',
  order_date: '2025-01-10',
  expected_delivery_date: '2025-01-20',
  total_amount: 50000,
  currency: 'TWD',
  status: 'confirmed',
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const createMockShipment = (overrides = {}) => ({
  id: 'test-shipment-id',
  order_id: 'test-order-id',
  user_id: 'test-user-id',
  company_id: 'test-company-id',
  shipment_number: 'SHP-2025-001',
  tracking_number: 'TRK123456789',
  carrier: 'FedEx',
  ship_date: '2025-01-18',
  estimated_arrival: '2025-01-20',
  actual_arrival: null,
  status: 'in_transit',
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const createMockCompany = (overrides = {}) => ({
  id: 'test-company-id',
  name: { zh: '測試公司', en: 'Test Company' },
  tax_id: '12345678',
  phone: '0223456789',
  email: 'company@example.com',
  website: 'https://example.com',
  address: { zh: '台北市中正區', en: 'Zhongzheng District, Taipei' },
  logo_url: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})
