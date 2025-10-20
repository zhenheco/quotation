# API 設計分析報告
> 報價系統 API 架構全面評估與優化建議

**生成日期**: 2025-10-20
**專案**: Quotation System (報價系統)
**API 端點總數**: 43 個
**技術棧**: Next.js 15.5 App Router + TypeScript + Supabase + PostgreSQL

---

## 執行摘要

本報告對報價系統的 43 個 API 端點進行了全面分析，評估其 RESTful 設計、安全性、性能和一致性。系統整體設計良好，但在以下領域需要改進：

### 🎯 關鍵發現

| 類別 | 評分 | 狀態 |
|------|------|------|
| RESTful 設計 | ⭐⭐⭐⭐☆ (8/10) | 良好 |
| API 一致性 | ⭐⭐⭐☆☆ (6/10) | 需改進 |
| 安全性 | ⭐⭐⭐⭐☆ (7/10) | 良好 |
| 錯誤處理 | ⭐⭐⭐☆☆ (6/10) | 需改進 |
| 性能優化 | ⭐⭐⭐☆☆ (5/10) | 需改進 |
| 文檔化 | ⭐⭐☆☆☆ (3/10) | 嚴重不足 |

### ⚠️ 主要問題

1. **缺少統一的錯誤處理格式** - 錯誤回應格式不一致
2. **缺少分頁機制** - 列表端點沒有分頁支援
3. **缺少 CSRF 保護** - 未實作 CSRF Token
4. **N+1 查詢問題** - 某些端點存在性能瓶頸
5. **缺少 OpenAPI 文檔** - 沒有標準化的 API 文檔
6. **缺少 API 版本控制** - 未來升級困難

---

## 1. RESTful API 設計評估

### 1.1 資源端點分析

系統共有 43 個 API 端點，主要資源如下：

#### ✅ 符合 RESTful 規範的端點

```
核心資源 (Core Resources)
├── /api/customers
│   ├── GET    - 列出客戶
│   ├── POST   - 創建客戶
│   ├── GET    /api/customers/[id]
│   ├── PUT    /api/customers/[id]
│   └── DELETE /api/customers/[id]
│
├── /api/products
│   ├── GET    - 列出產品
│   ├── POST   - 創建產品
│   ├── GET    /api/products/[id]
│   ├── PUT    /api/products/[id]
│   └── DELETE /api/products/[id]
│
├── /api/quotations
│   ├── GET    - 列出報價單
│   ├── POST   - 創建報價單
│   ├── PUT    /api/quotations/[id]
│   └── DELETE /api/quotations/[id]
│
└── /api/payments
    ├── GET    - 列出付款記錄
    └── POST   - 記錄付款
```

#### 🟡 需要改進的端點

```
批次操作 (Batch Operations)
├── POST /api/quotations/batch/delete   ❌ 應改為 DELETE /api/quotations
├── POST /api/quotations/batch/export   ✅ 可接受 (檔案生成)
└── POST /api/quotations/batch/status   ❌ 應改為 PATCH /api/quotations

合約相關 (Contracts)
├── POST /api/contracts/from-quotation  ❌ 應改為 POST /api/quotations/[id]/convert
├── GET  /api/contracts/overdue         ✅ 正確 (過濾器)
├── GET  /api/contracts/[id]/payment-progress      ✅ 正確 (子資源)
└── GET  /api/contracts/[id]/next-collection       ✅ 正確 (子資源)

付款相關 (Payments)
├── GET  /api/payments/unpaid           ✅ 正確 (過濾器)
├── GET  /api/payments/collected        ✅ 正確 (過濾器)
├── GET  /api/payments/reminders        ✅ 正確 (衍生資源)
└── POST /api/payments/[id]/mark-overdue ❌ 應改為 PATCH /api/payments/[id]

公司管理 (Companies)
├── GET  /api/companies                 ✅ 正確
├── POST /api/companies                 ✅ 正確
├── GET  /api/company/[id]/members      ✅ 正確
├── POST /api/company/[id]/members      ✅ 正確
├── PUT  /api/company/[id]/members/[userId]  ✅ 正確
└── DELETE /api/company/[id]/members/[userId] ✅ 正確
```

#### ❌ 不符合 RESTful 規範的端點

```
工具端點 (Utility Endpoints)
├── POST /api/seed-test-data            ⚠️ 應該是開發工具
├── POST /api/test-email                ⚠️ 應該是開發工具
└── GET  /api/test-admin                ⚠️ 應該是開發工具

其他
├── GET  /api/me                        ❌ 應改為 GET /api/users/me
├── GET  /api/user-info                 ❌ 應改為 GET /api/users/me
└── GET  /api/rbac/user-profile         ❌ 應改為 GET /api/users/me/profile
```

### 1.2 HTTP 方法使用評估

| HTTP 方法 | 使用情況 | 評分 |
|-----------|----------|------|
| GET | ✅ 正確用於查詢資源 | 10/10 |
| POST | ✅ 正確用於創建資源 | 9/10 |
| PUT | ✅ 正確用於更新整個資源 | 9/10 |
| PATCH | ⚠️ 應該用於部分更新，但未使用 | 5/10 |
| DELETE | ✅ 正確用於刪除資源 | 9/10 |

**建議**: 引入 PATCH 方法用於部分更新操作（如狀態變更）。

### 1.3 狀態碼使用分析

#### ✅ 正確使用的狀態碼

```typescript
200 OK           - 成功的 GET/PUT/PATCH 請求
201 Created      - 成功的 POST 請求
401 Unauthorized - 未認證
403 Forbidden    - 無權限
404 Not Found    - 資源不存在
500 Internal Server Error - 伺服器錯誤
```

#### ❌ 缺少的狀態碼

```typescript
204 No Content   - 成功的 DELETE 請求應返回 204
400 Bad Request  - 有使用但格式不統一
422 Unprocessable Entity - 驗證失敗應使用
429 Too Many Requests - Rate Limit 已實作但部分端點未使用
```

---

## 2. API 一致性分析

### 2.1 請求格式一致性

#### 🔴 問題：請求格式不統一

**範例 1: 客戶創建**
```typescript
// /api/customers - POST
{
  "name": "Customer Name",      // ❌ 不一致：應該是 { zh, en }
  "email": "customer@example.com",
  "phone": "+886-1234-5678"
}
```

**範例 2: 產品創建**
```typescript
// /api/products - POST
{
  "name": "Product Name",       // ❌ 不一致：應該是 { zh, en }
  "unit_price": 1000,
  "currency": "TWD"
}
```

**資料庫實際結構**（從 database service 看到）：
```typescript
export interface Customer {
  name: { zh: string; en: string }      // ✅ 雙語支援
  address?: { zh: string; en: string }
  contact_person?: { zh: string; en: string }
}

export interface Product {
  name: { zh: string; en: string }      // ✅ 雙語支援
  description?: { zh: string; en: string }
}
```

**🔧 建議修正**：統一使用雙語格式
```typescript
// 統一的請求格式
{
  "name": { "zh": "客戶名稱", "en": "Customer Name" },
  "email": "customer@example.com",
  "phone": "+886-1234-5678"
}
```

### 2.2 回應格式一致性

#### 🔴 問題：回應格式極度不一致

**格式 1: 直接返回資料**
```typescript
// /api/customers - GET
[
  { "id": "1", "name": "Customer 1", ... },
  { "id": "2", "name": "Customer 2", ... }
]
```

**格式 2: 包裝在 data 中**
```typescript
// /api/payments - GET
{
  "success": true,
  "data": [...],
  "count": 10
}
```

**格式 3: 包裝在 stats 中**
```typescript
// /api/admin/stats - GET
{
  "success": true,
  "stats": {
    "overview": { ... },
    "recent": { ... },
    "roles": [...]
  }
}
```

**格式 4: 簡單訊息**
```typescript
// /api/quotations/[id] - DELETE
{
  "message": "Quotation deleted successfully"
}
```

#### ✅ 建議：統一回應格式

```typescript
// 標準成功回應格式
interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: {
    total?: number
    page?: number
    pageSize?: number
    hasMore?: boolean
  }
  message?: string
}

// 標準錯誤回應格式 (RFC 9457: Problem Details for HTTP APIs)
interface ApiErrorResponse {
  success: false
  error: {
    type: string          // e.g., "validation_error"
    title: string         // e.g., "Validation Failed"
    status: number        // HTTP status code
    detail: string        // Human-readable explanation
    instance?: string     // URI reference to the specific occurrence
    errors?: Array<{      // Detailed validation errors
      field: string
      message: string
      code: string
    }>
  }
  timestamp: string
  requestId?: string
}
```

**範例應用**：

```typescript
// 成功回應
{
  "success": true,
  "data": {
    "id": "123",
    "name": { "zh": "客戶名稱", "en": "Customer Name" }
  },
  "message": "Customer created successfully"
}

// 列表回應
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}

// 錯誤回應
{
  "success": false,
  "error": {
    "type": "validation_error",
    "title": "Validation Failed",
    "status": 422,
    "detail": "The request contains invalid data",
    "instance": "/api/customers",
    "errors": [
      {
        "field": "email",
        "message": "Email format is invalid",
        "code": "invalid_email"
      }
    ]
  },
  "timestamp": "2025-10-20T10:30:00.000Z",
  "requestId": "req_abc123"
}
```

### 2.3 錯誤處理一致性

#### 🔴 問題：錯誤處理格式混亂

**當前的錯誤格式**：

```typescript
// 格式 1: 簡單字串
{ "error": "Unauthorized" }

// 格式 2: 帶細節
{ "error": "Failed to create quotation" }

// 格式 3: 帶訊息
{
  "error": "Invalid customer",
  "message": "Customer validation failed"
}

// 格式 4: 帶狀態
{
  "error": "Forbidden: Super admin access required"
}

// 格式 5: 開發模式詳細錯誤
{
  "error": "Internal server error",
  "details": error instanceof Error ? error.message : 'Unknown error'
}
```

#### ✅ 建議：統一錯誤處理

創建集中式錯誤處理工具：

```typescript
// lib/errors/api-error.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public type: string,
    public title: string,
    message: string,
    public errors?: Array<{ field: string; message: string; code: string }>
  ) {
    super(message)
    this.name = 'ApiError'
  }

  toJSON() {
    return {
      success: false,
      error: {
        type: this.type,
        title: this.title,
        status: this.status,
        detail: this.message,
        errors: this.errors
      },
      timestamp: new Date().toISOString()
    }
  }
}

// 預定義的錯誤類型
export const ApiErrors = {
  Unauthorized: () => new ApiError(
    401,
    'unauthorized',
    'Authentication Required',
    'You must be authenticated to access this resource'
  ),

  Forbidden: (resource?: string) => new ApiError(
    403,
    'forbidden',
    'Access Denied',
    resource
      ? `You don't have permission to access ${resource}`
      : 'You don\'t have permission to perform this action'
  ),

  NotFound: (resource: string) => new ApiError(
    404,
    'not_found',
    'Resource Not Found',
    `The requested ${resource} was not found`
  ),

  ValidationError: (errors: Array<{ field: string; message: string; code: string }>) =>
    new ApiError(
      422,
      'validation_error',
      'Validation Failed',
      'The request contains invalid data',
      errors
    ),

  RateLimitExceeded: (retryAfter: number) => new ApiError(
    429,
    'rate_limit_exceeded',
    'Too Many Requests',
    `Rate limit exceeded. Please retry after ${retryAfter} seconds`
  ),

  InternalError: (message?: string) => new ApiError(
    500,
    'internal_error',
    'Internal Server Error',
    message || 'An unexpected error occurred'
  )
}
```

**使用範例**：

```typescript
// app/api/customers/route.ts
import { ApiErrors } from '@/lib/errors/api-error'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw ApiErrors.Unauthorized()
    }

    const body = await request.json()

    // 驗證
    const validationErrors = []
    if (!body.name?.zh || !body.name?.en) {
      validationErrors.push({
        field: 'name',
        message: 'Name is required in both languages',
        code: 'required'
      })
    }
    if (!body.email) {
      validationErrors.push({
        field: 'email',
        message: 'Email is required',
        code: 'required'
      })
    }

    if (validationErrors.length > 0) {
      throw ApiErrors.ValidationError(validationErrors)
    }

    const customer = await createCustomer({ ...body, user_id: user.id })

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status })
    }

    console.error('Unexpected error:', error)
    const internalError = ApiErrors.InternalError()
    return NextResponse.json(internalError.toJSON(), { status: 500 })
  }
}
```

### 2.4 分頁機制

#### 🔴 問題：完全缺少分頁支援

當前所有列表端點都返回完整資料：

```typescript
// /api/customers - GET
export async function GET() {
  const customers = await getCustomers(userId)  // 返回所有記錄
  return NextResponse.json(customers)
}

// /api/products - GET
export async function GET() {
  const products = await getProducts(userId)    // 返回所有記錄
  return NextResponse.json(products)
}

// /api/quotations - GET (未實作，但推測類似)
```

**問題影響**：
- 當資料量增長時，性能會急劇下降
- 佔用大量記憶體和網路頻寬
- 前端渲染緩慢
- 使用者體驗差

#### ✅ 建議：實作統一的分頁機制

**方案 1: Offset-based Pagination（傳統分頁）**

適用於：一般列表查詢

```typescript
// 查詢參數
interface PaginationParams {
  page: number      // 頁碼，從 1 開始
  pageSize: number  // 每頁數量，預設 20，最大 100
}

// 回應格式
interface PaginatedResponse<T> {
  success: true
  data: T[]
  meta: {
    total: number       // 總記錄數
    page: number        // 當前頁碼
    pageSize: number    // 每頁數量
    totalPages: number  // 總頁數
    hasMore: boolean    // 是否有下一頁
  }
}

// 實作範例
// GET /api/customers?page=1&pageSize=20
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(
    parseInt(searchParams.get('pageSize') || '20'),
    100  // 最大限制
  )

  const offset = (page - 1) * pageSize

  const { data, total } = await getCustomersPaginated(userId, {
    limit: pageSize,
    offset: offset
  })

  return NextResponse.json({
    success: true,
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: offset + pageSize < total
    }
  })
}
```

**方案 2: Cursor-based Pagination（游標分頁）**

適用於：即時更新的資料、無限滾動

```typescript
// 查詢參數
interface CursorPaginationParams {
  cursor?: string   // 上次查詢的最後一筆記錄 ID
  limit: number     // 每次返回數量，預設 20
}

// 回應格式
interface CursorPaginatedResponse<T> {
  success: true
  data: T[]
  meta: {
    nextCursor: string | null  // 下一頁的游標
    hasMore: boolean            // 是否有下一頁
  }
}

// 實作範例
// GET /api/quotations?cursor=abc123&limit=20
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = Math.min(
    parseInt(searchParams.get('limit') || '20'),
    100
  )

  const { data, nextCursor } = await getQuotationsCursor(userId, {
    cursor,
    limit: limit + 1  // 多查一筆來判斷是否有下一頁
  })

  const hasMore = data.length > limit
  const results = hasMore ? data.slice(0, -1) : data

  return NextResponse.json({
    success: true,
    data: results,
    meta: {
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore
    }
  })
}
```

**資料庫層實作**：

```typescript
// lib/services/database.ts

// Offset-based
export async function getCustomersPaginated(
  userId: string,
  options: { limit: number; offset: number }
) {
  const pool = getZeaburPool()

  // 查詢資料
  const dataResult = await pool.query(
    `SELECT * FROM customers
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, options.limit, options.offset]
  )

  // 查詢總數
  const countResult = await pool.query(
    'SELECT COUNT(*) as total FROM customers WHERE user_id = $1',
    [userId]
  )

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].total)
  }
}

// Cursor-based
export async function getQuotationsCursor(
  userId: string,
  options: { cursor?: string; limit: number }
) {
  const pool = getZeaburPool()

  let query = `
    SELECT * FROM quotations
    WHERE user_id = $1
  `
  const params: any[] = [userId]

  if (options.cursor) {
    query += ` AND created_at < (
      SELECT created_at FROM quotations WHERE id = $2
    )`
    params.push(options.cursor)
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
  params.push(options.limit)

  const result = await pool.query(query, params)

  return {
    data: result.rows,
    nextCursor: result.rows.length > 0
      ? result.rows[result.rows.length - 1].id
      : null
  }
}
```

### 2.5 過濾和排序參數

#### 🔴 問題：缺少標準化的查詢參數

當前系統：
```typescript
// /api/payments - GET
const filters = {
  customer_id: searchParams.get('customer_id') || undefined,
  quotation_id: searchParams.get('quotation_id') || undefined,
  contract_id: searchParams.get('contract_id') || undefined,
  status: searchParams.get('status') || undefined,
  payment_type: searchParams.get('payment_type') || undefined,
}
```

沒有標準化的：
- 排序參數
- 搜尋參數
- 日期範圍過濾
- 多條件組合

#### ✅ 建議：標準化查詢參數

```typescript
// 標準查詢參數格式
interface StandardQueryParams {
  // 分頁
  page?: number
  pageSize?: number
  cursor?: string

  // 排序
  sort?: string         // e.g., "created_at" or "-created_at" (descending)

  // 搜尋
  q?: string            // 全文搜尋

  // 過濾
  filter?: {
    [key: string]: any
  }

  // 欄位選擇
  fields?: string[]     // 只返回指定欄位

  // 關聯載入
  include?: string[]    // 載入關聯資源
}

// 範例使用
// GET /api/quotations?page=1&pageSize=20&sort=-created_at&filter[status]=draft&filter[currency]=TWD&q=客戶名稱&include=customer,items

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // 解析標準查詢參數
  const queryParams = parseStandardQueryParams(searchParams)

  const quotations = await getQuotations(userId, queryParams)

  return NextResponse.json({
    success: true,
    data: quotations.data,
    meta: quotations.meta
  })
}

// 解析工具函數
function parseStandardQueryParams(searchParams: URLSearchParams): StandardQueryParams {
  const params: StandardQueryParams = {}

  // 分頁
  if (searchParams.has('page')) {
    params.page = parseInt(searchParams.get('page')!)
  }
  if (searchParams.has('pageSize')) {
    params.pageSize = Math.min(parseInt(searchParams.get('pageSize')!), 100)
  }

  // 排序
  if (searchParams.has('sort')) {
    params.sort = searchParams.get('sort')!
  }

  // 搜尋
  if (searchParams.has('q')) {
    params.q = searchParams.get('q')!
  }

  // 過濾
  params.filter = {}
  searchParams.forEach((value, key) => {
    if (key.startsWith('filter[')) {
      const filterKey = key.match(/filter\[(.+)\]/)?.[1]
      if (filterKey) {
        params.filter![filterKey] = value
      }
    }
  })

  // 欄位選擇
  if (searchParams.has('fields')) {
    params.fields = searchParams.get('fields')!.split(',')
  }

  // 關聯載入
  if (searchParams.has('include')) {
    params.include = searchParams.get('include')!.split(',')
  }

  return params
}
```

---

## 3. API 安全性評估

### 3.1 身份驗證機制

#### ✅ 優點：使用 Supabase Auth

```typescript
// 當前實作
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

- ✅ 使用 JWT token
- ✅ 基於 Cookie 的 session
- ✅ Google OAuth 整合
- ✅ 自動 token 刷新

#### 🟡 改進空間：統一認證中間件

**問題**：
- 認證邏輯分散在各個端點
- 缺少統一的認證攔截器
- 部分端點已使用 `withAuth`，部分沒有

**當前混合使用**：
```typescript
// 方式 1: 手動認證 (大部分端點)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... 業務邏輯
}

// 方式 2: withAuth HOC (少數端點)
export const GET = withAuth(async (request, { userId }) => {
  // 直接使用 userId
})
```

**建議**：統一使用 `withAuth` HOC

```typescript
// 所有需要認證的端點都應該使用
export const POST = withAuth(async (request, { userId }) => {
  // 業務邏輯，不需要再檢查認證
})

export const GET = withAuth(async (request, { userId }) => {
  // 業務邏輯
})
```

### 3.2 授權檢查

#### ✅ 優點：Row Level Security (RLS)

資料庫層面實作了 RLS：
```sql
-- 所有查詢都自動過濾 user_id
SELECT * FROM customers WHERE user_id = $1
```

#### ✅ 優點：RBAC 系統

```typescript
// lib/services/rbac.ts
export async function hasPermission(
  userId: string,
  resource: Resource,
  action: Action
): Promise<boolean>

// 使用範例
export const POST = withPermission('quotations', 'create',
  async (request, { userId }) => {
    // 只有有權限的使用者才能執行
  }
)
```

#### 🟡 問題：授權檢查不一致

```typescript
// 有些端點使用 RBAC
export const POST = withPermission('quotations', 'create', handler)

// 有些端點手動檢查
const isAdmin = await isSuperAdmin(user.id)
if (!isAdmin) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// 有些端點只檢查 user_id
const quotation = await getQuotationById(id, user.id)
if (!quotation) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
```

**建議**：統一使用 RBAC 中間件

```typescript
// lib/middleware/withPermission.ts - 改進版本
export function withPermission(
  resource: Resource,
  action: Action,
  options?: {
    checkOwnership?: (userId: string, resourceId: string) => Promise<boolean>
  }
) {
  return withAuth(async (request, context) => {
    const { userId, params } = context

    // 檢查基本權限
    const hasAccess = await hasPermission(userId, resource, action)
    if (!hasAccess) {
      throw ApiErrors.Forbidden(resource)
    }

    // 檢查資源所有權（如果提供）
    if (options?.checkOwnership && params?.id) {
      const isOwner = await options.checkOwnership(userId, params.id)
      if (!isOwner) {
        throw ApiErrors.NotFound(resource)
      }
    }

    return handler(request, context)
  })
}

// 使用範例
export const PUT = withPermission('quotations', 'update', {
  checkOwnership: async (userId, quotationId) => {
    const quotation = await getQuotationById(quotationId, userId)
    return quotation !== null
  }
})(async (request, { userId, params }) => {
  // 已確認有權限且擁有資源
  const body = await request.json()
  const quotation = await updateQuotation(params.id, userId, body)
  return NextResponse.json({ success: true, data: quotation })
})
```

### 3.3 輸入驗證

#### 🔴 問題：驗證邏輯分散且不完整

當前驗證方式：

```typescript
// 簡單的存在檢查
if (!customer_id || !issue_date || !valid_until) {
  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
}

// 型別驗證
const price = parseFloat(unit_price)
if (isNaN(price) || price < 0) {
  return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
}

// 日期驗證
const paymentDate = new Date(body.payment_date)
if (isNaN(paymentDate.getTime())) {
  return NextResponse.json({ error: 'Invalid payment date format' }, { status: 400 })
}

// 列舉值驗證
const validTypes: PaymentType[] = ['deposit', 'installment', 'final', 'full', 'recurring']
if (!validTypes.includes(body.payment_type)) {
  return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 })
}
```

**問題**：
- 驗證邏輯重複
- 錯誤訊息不一致
- 缺少詳細的錯誤資訊
- 難以維護

#### ✅ 建議：使用 Zod 進行型別驗證

```typescript
// lib/validations/customer.schema.ts
import { z } from 'zod'

export const CreateCustomerSchema = z.object({
  name: z.object({
    zh: z.string().min(1, '中文名稱為必填'),
    en: z.string().min(1, '英文名稱為必填')
  }),
  email: z.string().email('Email 格式不正確'),
  phone: z.string().regex(/^\+?[0-9\s\-()]+$/, '電話格式不正確').optional(),
  address: z.object({
    zh: z.string().optional(),
    en: z.string().optional()
  }).optional(),
  tax_id: z.string().optional(),
  contact_person: z.object({
    zh: z.string().optional(),
    en: z.string().optional()
  }).optional()
})

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>

// lib/validations/quotation.schema.ts
export const CreateQuotationSchema = z.object({
  customer_id: z.string().uuid('客戶 ID 格式不正確'),
  issue_date: z.string().datetime('發行日期格式不正確'),
  valid_until: z.string().datetime('有效期限格式不正確'),
  currency: z.enum(['TWD', 'USD', 'EUR', 'JPY', 'CNY'], {
    errorMap: () => ({ message: '不支援的幣別' })
  }),
  subtotal: z.number().positive('小計必須大於 0'),
  tax_rate: z.number().min(0).max(100, '稅率必須在 0-100 之間'),
  tax_amount: z.number().nonnegative('稅額不能為負數'),
  total_amount: z.number().positive('總額必須大於 0'),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid().optional(),
    quantity: z.number().positive('數量必須大於 0'),
    unit_price: z.number().positive('單價必須大於 0'),
    discount: z.number().min(0).max(100, '折扣必須在 0-100 之間').default(0),
    subtotal: z.number().nonnegative('小計不能為負數')
  })).min(1, '至少需要一個項目')
}).refine(
  data => {
    // 驗證總額計算是否正確
    const calculatedTotal = data.subtotal + data.tax_amount
    return Math.abs(calculatedTotal - data.total_amount) < 0.01
  },
  { message: '總額計算不正確' }
)

// lib/validations/payment.schema.ts
export const RecordPaymentSchema = z.object({
  customer_id: z.string().uuid(),
  quotation_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
  payment_type: z.enum(['deposit', 'installment', 'final', 'full', 'recurring']),
  payment_date: z.string().datetime(),
  amount: z.number().positive(),
  currency: z.enum(['TWD', 'USD', 'EUR', 'JPY', 'CNY']),
  payment_method: z.enum(['bank_transfer', 'credit_card', 'check', 'cash', 'other']).optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional()
}).refine(
  data => data.quotation_id || data.contract_id,
  { message: '必須提供報價單 ID 或合約 ID' }
)
```

**驗證中間件**：

```typescript
// lib/middleware/withValidation.ts
import { z } from 'zod'
import { ApiErrors } from '@/lib/errors/api-error'

export function withValidation<T extends z.ZodType>(schema: T) {
  return function(
    handler: (
      request: NextRequest,
      context: { userId: string; body: z.infer<T> }
    ) => Promise<NextResponse>
  ) {
    return withAuth(async (request, context) => {
      try {
        const body = await request.json()
        const validatedBody = schema.parse(body)

        return handler(request, { ...context, body: validatedBody })
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))

          throw ApiErrors.ValidationError(validationErrors)
        }
        throw error
      }
    })
  }
}

// 使用範例
export const POST = withValidation(CreateCustomerSchema)(
  async (request, { userId, body }) => {
    // body 已經過驗證且具有正確型別
    const customer = await createCustomer({ ...body, user_id: userId })

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    }, { status: 201 })
  }
)
```

### 3.4 CSRF 保護

#### 🔴 問題：完全缺少 CSRF 保護

當前系統沒有實作 CSRF token 機制。

**風險**：
- 跨站請求偽造攻擊
- 未經授權的狀態變更操作

#### ✅ 建議：實作 CSRF 保護

```typescript
// lib/middleware/csrf.ts
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET || 'your-csrf-secret-key'
const CSRF_TOKEN_LENGTH = 32

/**
 * 生成 CSRF token
 */
export function generateCsrfToken(sessionId: string): string {
  const random = randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
  const hmac = createHmac('sha256', CSRF_SECRET)
  hmac.update(`${sessionId}.${random}`)
  const signature = hmac.digest('hex')

  return `${random}.${signature}`
}

/**
 * 驗證 CSRF token
 */
export function verifyCsrfToken(token: string, sessionId: string): boolean {
  const [random, signature] = token.split('.')

  if (!random || !signature) {
    return false
  }

  const hmac = createHmac('sha256', CSRF_SECRET)
  hmac.update(`${sessionId}.${random}`)
  const expectedSignature = hmac.digest('hex')

  return signature === expectedSignature
}

/**
 * CSRF 保護中間件
 */
export function withCsrfProtection(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: any) => {
    // 只檢查狀態變更方法
    const methodsToProtect = ['POST', 'PUT', 'PATCH', 'DELETE']
    if (!methodsToProtect.includes(request.method)) {
      return handler(request, context)
    }

    // 獲取 CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token') ||
                      request.headers.get('X-XSRF-Token')

    if (!csrfToken) {
      return NextResponse.json(
        { error: 'CSRF token missing' },
        { status: 403 }
      )
    }

    // 驗證 token（使用 session ID）
    const sessionId = context.userId // 或從 cookie 獲取
    const isValid = verifyCsrfToken(csrfToken, sessionId)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    return handler(request, context)
  }
}

// 使用範例
export const POST = withCsrfProtection(
  withAuth(async (request, { userId }) => {
    // 已通過 CSRF 驗證
  })
)
```

**客戶端實作**：

```typescript
// lib/api/client.ts
export async function apiPost(url: string, data: any) {
  // 從 cookie 獲取 CSRF token
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1]

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || ''
    },
    body: JSON.stringify(data)
  })

  return response.json()
}
```

### 3.5 Rate Limiting

#### ✅ 優點：已實作 Rate Limiting

```typescript
// lib/middleware/rate-limiter.ts
export const defaultRateLimiter = createRateLimiter({
  windowMs: 60000,      // 1 分鐘
  maxRequests: 60,      // 每分鐘 60 次
})

export const strictRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 10,
})

export const batchRateLimiter = createRateLimiter({
  windowMs: 300000,     // 5 分鐘
  maxRequests: 5,
})
```

#### 🟡 問題：使用不一致

```typescript
// 有些端點使用 Rate Limiting
export async function POST(request: NextRequest) {
  return batchRateLimiter(request, async () => {
    // 業務邏輯
  })
}

// 大部分端點沒有使用
export async function POST(request: NextRequest) {
  // 直接執行，沒有 Rate Limiting
}
```

**建議**：統一應用 Rate Limiting

```typescript
// lib/middleware/withRateLimit.ts
export function withRateLimit(
  limiter: ReturnType<typeof createRateLimiter>
) {
  return function(
    handler: (request: NextRequest, context: any) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, context: any) => {
      return limiter(request, () => handler(request, context))
    }
  }
}

// 為不同類型的端點定義不同的限制
export const rateLimitConfig = {
  default: withRateLimit(defaultRateLimiter),
  strict: withRateLimit(strictRateLimiter),
  batch: withRateLimit(batchRateLimiter),
  email: withRateLimit(emailRateLimiter)
}

// 使用範例
export const POST = rateLimitConfig.default(
  withAuth(async (request, { userId }) => {
    // 業務邏輯
  })
)

export const POST = rateLimitConfig.batch(
  withAuth(async (request, { userId }) => {
    // 批次操作
  })
)
```

**改進建議**：使用 Redis 儲存限制資料

```typescript
// lib/middleware/rate-limiter-redis.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export function createRedisRateLimiter(config: RateLimitConfig) {
  return async function(
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = config.keyGenerator(req)
    const now = Date.now()
    const windowStart = now - config.windowMs

    // 使用 Redis ZSET 儲存請求時間戳
    const multi = redis.multi()

    // 移除過期的請求
    multi.zremrangebyscore(key, 0, windowStart)

    // 計算當前窗口內的請求數
    multi.zcard(key)

    // 添加當前請求
    multi.zadd(key, now, `${now}-${Math.random()}`)

    // 設定過期時間
    multi.expire(key, Math.ceil(config.windowMs / 1000))

    const results = await multi.exec()
    const currentRequests = results?.[1]?.[1] as number

    if (currentRequests >= config.maxRequests) {
      const retryAfter = Math.ceil(config.windowMs / 1000)

      return NextResponse.json(
        { error: config.message, retryAfter: `${retryAfter} seconds` },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'Retry-After': retryAfter.toString()
          }
        }
      )
    }

    const response = await handler()

    // 添加 rate limit headers
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set(
      'X-RateLimit-Remaining',
      (config.maxRequests - currentRequests - 1).toString()
    )

    return response
  }
}
```

---

## 4. API 性能優化

### 4.1 N+1 查詢問題

#### 🔴 問題：多個端點存在 N+1 查詢

**範例 1: 報價單列表**

```typescript
// 當前實作 (推測)
export async function GET(request: NextRequest) {
  const quotations = await getQuotations(userId)

  // 對每個報價單查詢客戶資訊 (N+1)
  for (const quotation of quotations) {
    quotation.customer = await getCustomerById(quotation.customer_id)
  }

  return NextResponse.json(quotations)
}
```

**問題**：
- 如果有 100 個報價單，會執行 101 次查詢（1 + 100）
- 嚴重影響性能

#### ✅ 解決方案：使用 JOIN 或批次載入

**方案 1: 使用 SQL JOIN**

```typescript
// lib/services/database.ts
export async function getQuotationsWithRelations(userId: string) {
  const result = await query(`
    SELECT
      q.*,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'email', c.email
      ) as customer
    FROM quotations q
    LEFT JOIN customers c ON q.customer_id = c.id
    WHERE q.user_id = $1
    ORDER BY q.created_at DESC
  `, [userId])

  return result.rows
}
```

**方案 2: DataLoader 模式（批次載入）**

```typescript
// lib/loaders/customer-loader.ts
import DataLoader from 'dataloader'

export function createCustomerLoader(userId: string) {
  return new DataLoader<string, Customer | null>(async (ids) => {
    const uniqueIds = [...new Set(ids)]

    const result = await query(
      `SELECT * FROM customers
       WHERE id = ANY($1) AND user_id = $2`,
      [uniqueIds, userId]
    )

    const customerMap = new Map(
      result.rows.map(c => [c.id, c])
    )

    return ids.map(id => customerMap.get(id) || null)
  })
}

// 使用範例
export async function GET(request: NextRequest) {
  const quotations = await getQuotations(userId)
  const customerLoader = createCustomerLoader(userId)

  // 批次載入所有客戶（只執行一次查詢）
  const quotationsWithCustomers = await Promise.all(
    quotations.map(async (q) => ({
      ...q,
      customer: await customerLoader.load(q.customer_id)
    }))
  )

  return NextResponse.json(quotationsWithCustomers)
}
```

**範例 2: 批次匯出 PDF**

當前實作：
```typescript
// app/api/quotations/batch/export/route.ts
for (const quotation of quotations) {
  // 對每個報價單查詢項目 (N+1)
  const { data: items } = await supabase
    .from('quotation_items')
    .select(...)
    .eq('quotation_id', quotation.id)

  // 生成 PDF
}
```

優化後：
```typescript
export async function POST(request: NextRequest) {
  const { ids } = await request.json()

  // 一次查詢所有報價單
  const quotations = await getQuotationsByIds(ids, userId)

  // 一次查詢所有項目
  const allItems = await query(`
    SELECT qi.*, p.name, p.description
    FROM quotation_items qi
    LEFT JOIN products p ON qi.product_id = p.id
    WHERE qi.quotation_id = ANY($1)
    ORDER BY qi.quotation_id, qi.id
  `, [ids])

  // 按報價單分組項目
  const itemsByQuotation = allItems.rows.reduce((acc, item) => {
    if (!acc[item.quotation_id]) {
      acc[item.quotation_id] = []
    }
    acc[item.quotation_id].push(item)
    return acc
  }, {} as Record<string, any[]>)

  // 生成 PDF
  const zip = new JSZip()
  for (const quotation of quotations) {
    const items = itemsByQuotation[quotation.id] || []
    const pdfBlob = await generateQuotationPDF({ quotation, items })
    zip.file(`${quotation.quotation_number}.pdf`, pdfBlob)
  }

  return new NextResponse(await zip.generateAsync({ type: 'blob' }))
}
```

### 4.2 缺少快取機制

#### 🔴 問題：頻繁查詢的資料沒有快取

常見的高頻查詢：
- 使用者資訊
- 公司設定
- 匯率資料
- 產品列表

#### ✅ 建議：實作多層快取策略

```typescript
// lib/cache/redis-cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

interface CacheOptions {
  ttl?: number  // 秒
  prefix?: string
}

export class RedisCache {
  constructor(private prefix: string = 'api') {}

  private getKey(key: string): string {
    return `${this.prefix}:${key}`
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(this.getKey(key))
    return data ? JSON.parse(data) : null
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const data = JSON.stringify(value)
    if (ttl) {
      await redis.setex(this.getKey(key), ttl, data)
    } else {
      await redis.set(this.getKey(key), data)
    }
  }

  async del(key: string): Promise<void> {
    await redis.del(this.getKey(key))
  }

  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    // 嘗試從快取讀取
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // 快取未命中，執行回調並快取結果
    const value = await callback()
    await this.set(key, value, ttl)
    return value
  }
}

// 使用範例
const cache = new RedisCache('quotation-system')

export async function getCompanySettings(userId: string) {
  return cache.remember(
    `company-settings:${userId}`,
    3600,  // 1 小時
    async () => {
      const result = await query(
        'SELECT * FROM company_settings WHERE user_id = $1',
        [userId]
      )
      return result.rows[0]
    }
  )
}

export async function getExchangeRates(date: string) {
  return cache.remember(
    `exchange-rates:${date}`,
    86400,  // 24 小時
    async () => {
      const result = await query(
        'SELECT * FROM exchange_rates WHERE date = $1',
        [date]
      )
      return result.rows
    }
  )
}
```

**快取失效策略**：

```typescript
// lib/cache/cache-invalidation.ts
export async function invalidateUserCache(userId: string) {
  const cache = new RedisCache('quotation-system')

  // 刪除使用者相關的所有快取
  await cache.del(`company-settings:${userId}`)
  await cache.del(`user-permissions:${userId}`)
  // ... 其他相關快取
}

// 在更新操作後呼叫
export async function updateCompanySettings(userId: string, data: any) {
  const result = await query(
    'UPDATE company_settings SET ... WHERE user_id = $1',
    [userId, ...]
  )

  // 使快取失效
  await invalidateUserCache(userId)

  return result.rows[0]
}
```

**HTTP 快取標頭**：

```typescript
// 對於不常變動的資料，使用 HTTP 快取
export async function GET(request: NextRequest) {
  const exchangeRates = await getExchangeRates(today)

  return NextResponse.json(exchangeRates, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'ETag': generateETag(exchangeRates),
      'Last-Modified': new Date(exchangeRates.updated_at).toUTCString()
    }
  })
}
```

### 4.3 資料庫連接池優化

#### ✅ 當前實作

```typescript
// lib/db/zeabur.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // 最大連接數
})
```

#### 🟡 建議：動態調整連接池配置

```typescript
// lib/db/zeabur.ts
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

const poolConfig = {
  connectionString: process.env.DATABASE_URL,

  // 連接池大小
  max: isProduction ? 50 : 10,
  min: isProduction ? 10 : 2,

  // 連接超時
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,

  // 語句超時
  statement_timeout: 30000,

  // 查詢超時
  query_timeout: 10000,

  // SSL 配置
  ssl: isProduction ? {
    rejectUnauthorized: false
  } : undefined
}

export const pool = new Pool(poolConfig)

// 監控連接池狀態
pool.on('connect', () => {
  console.log('Database connection established')
})

pool.on('error', (err) => {
  console.error('Unexpected database error:', err)
})

// 優雅關閉
process.on('SIGTERM', async () => {
  await pool.end()
  console.log('Database pool closed')
})
```

### 4.4 批次操作優化

#### 🔴 問題：批次刪除效率低

當前實作：
```typescript
// app/api/quotations/batch/delete/route.ts
// 首先刪除相關的報價單項目
const { error: itemsError } = await supabase
  .from('quotation_items')
  .delete()
  .in('quotation_id', ids)  // ✅ 這個是批次操作

// 然後刪除報價單
const { error: deleteError } = await supabase
  .from('quotations')
  .delete()
  .eq('user_id', user.id)
  .in('id', ids)  // ✅ 這個也是批次操作
```

實際上當前實作已經很好了！但可以加上事務：

```typescript
export async function POST(request: NextRequest) {
  return batchRateLimiter(request, async () => {
    const { ids } = await request.json()

    // 使用事務確保資料一致性
    const pool = getZeaburPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // 刪除項目
      await client.query(
        'DELETE FROM quotation_items WHERE quotation_id = ANY($1)',
        [ids]
      )

      // 刪除報價單並檢查所有權
      const result = await client.query(
        'DELETE FROM quotations WHERE id = ANY($1) AND user_id = $2 RETURNING id',
        [ids, userId]
      )

      if (result.rowCount !== ids.length) {
        throw new Error('Some quotations not found or unauthorized')
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${ids.length} quotations`,
        deletedCount: ids.length
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  })
}
```

### 4.5 索引優化建議

#### 建議添加的資料庫索引

```sql
-- 客戶表
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- 產品表
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- 報價單表
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_issue_date ON quotations(issue_date DESC);

-- 複合索引（常見查詢組合）
CREATE INDEX IF NOT EXISTS idx_quotations_user_status ON quotations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quotations_user_customer ON quotations(user_id, customer_id);

-- 報價單項目表
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product_id ON quotation_items(product_id);

-- 付款表
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_quotation_id ON payments(quotation_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_is_overdue ON payments(is_overdue) WHERE is_overdue = true;

-- 合約表
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON customer_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON customer_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON customer_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON customer_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_next_collection_date ON customer_contracts(next_collection_date);

-- 付款排程表
CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract_id ON payment_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_overdue ON payment_schedules(status, due_date)
  WHERE status = 'overdue';
```

---

## 5. API 文檔和版本控制

### 5.1 OpenAPI 規範

#### 🔴 問題：完全缺少 API 文檔

當前系統沒有：
- OpenAPI/Swagger 規範文件
- API 文檔網站
- 請求/回應範例
- 錯誤碼說明

#### ✅ 建議：創建 OpenAPI 3.1 規範

我將在下一個檔案中提供完整的 `openapi.yaml`。

### 5.2 API 版本控制

#### 🔴 問題：沒有版本控制策略

當前所有端點都沒有版本號：
```
/api/customers
/api/products
/api/quotations
```

**未來問題**：
- 無法進行破壞性變更
- 無法同時支援舊客戶端
- 升級困難

#### ✅ 建議：實作 API 版本控制

**方案 1: URI 版本控制（推薦）**

```
/api/v1/customers
/api/v1/products
/api/v1/quotations
```

優點：
- 清晰明確
- 易於路由
- 易於快取

實作：
```typescript
// app/api/v1/customers/route.ts
export async function GET(request: NextRequest) {
  // v1 實作
}

// app/api/v2/customers/route.ts
export async function GET(request: NextRequest) {
  // v2 實作（可能有不同的回應格式）
}

// 預設路由指向最新版本
// app/api/customers/route.ts
import { GET as V2GET } from './v2/customers/route'
export { V2GET as GET }
```

**方案 2: Header 版本控制**

```typescript
// app/api/customers/route.ts
export async function GET(request: NextRequest) {
  const apiVersion = request.headers.get('API-Version') || '1'

  switch (apiVersion) {
    case '2':
      return handleV2(request)
    case '1':
    default:
      return handleV1(request)
  }
}
```

**方案 3: Content Negotiation（媒體類型版本控制）**

```
Accept: application/vnd.quotation-system.v1+json
Accept: application/vnd.quotation-system.v2+json
```

### 5.3 API 棄用策略

#### 建議的棄用流程

```typescript
// lib/middleware/withDeprecation.ts
export function withDeprecation(
  message: string,
  sunsetDate: Date,
  newEndpoint?: string
) {
  return function(
    handler: (request: NextRequest, context: any) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, context: any) => {
      const response = await handler(request, context)

      // 添加棄用標頭
      response.headers.set('Deprecation', 'true')
      response.headers.set('Sunset', sunsetDate.toUTCString())

      if (newEndpoint) {
        response.headers.set('Link', `<${newEndpoint}>; rel="alternate"`)
      }

      // 在響應中添加警告
      const body = await response.json()
      return NextResponse.json({
        ...body,
        _meta: {
          ...body._meta,
          deprecated: true,
          deprecationMessage: message,
          sunsetDate: sunsetDate.toISOString(),
          newEndpoint
        }
      }, {
        status: response.status,
        headers: response.headers
      })
    }
  }
}

// 使用範例
export const GET = withDeprecation(
  'This endpoint is deprecated. Please use /api/v2/customers instead.',
  new Date('2026-01-01'),
  '/api/v2/customers'
)(async (request, { userId }) => {
  // 舊版實作
})
```

---

## 6. 具體改進建議總結

### 6.1 立即執行（高優先級）

1. **統一錯誤處理格式**
   - 實作 `ApiError` 類別
   - 使用 RFC 9457 標準
   - 所有端點統一使用

2. **實作分頁機制**
   - 為所有列表端點添加分頁
   - 實作 offset 和 cursor 兩種模式
   - 統一回應格式

3. **修正 N+1 查詢問題**
   - 使用 SQL JOIN
   - 實作 DataLoader
   - 批次操作優化

4. **統一使用 withAuth 中間件**
   - 移除手動認證邏輯
   - 所有需要認證的端點使用 HOC
   - 簡化程式碼

### 6.2 短期執行（1-2 週）

5. **實作輸入驗證**
   - 引入 Zod
   - 創建所有資源的 schema
   - 實作 `withValidation` 中間件

6. **統一 Rate Limiting**
   - 為所有端點添加限流
   - 考慮使用 Redis
   - 根據操作類型設定不同限制

7. **創建 OpenAPI 文檔**
   - 編寫 `openapi.yaml`
   - 設定 Swagger UI
   - 生成 TypeScript client

8. **實作 CSRF 保護**
   - Token 生成和驗證
   - 中間件實作
   - 客戶端整合

### 6.3 中期執行（1-2 個月）

9. **實作快取策略**
   - 引入 Redis
   - 快取高頻查詢資料
   - 實作快取失效策略

10. **API 版本控制**
    - 重構為 `/api/v1/*`
    - 制定版本政策
    - 實作棄用機制

11. **修正 RESTful 不規範端點**
    - 重構批次操作端點
    - 統一資源路徑
    - 向後相容處理

12. **資料庫優化**
    - 添加必要索引
    - 優化複雜查詢
    - 監控慢查詢

### 6.4 長期執行（3-6 個月）

13. **實作 GraphQL（可選）**
    - 解決 over-fetching 問題
    - 靈活的資料查詢
    - 與 REST 並存

14. **實作 WebSocket（即時功能）**
    - 即時通知
    - 協作編輯
    - 狀態同步

15. **效能監控**
    - APM 工具整合
    - 慢查詢追蹤
    - 錯誤追蹤

---

## 7. 評分卡總結

| 評估項目 | 當前狀態 | 目標狀態 | 改進優先級 |
|----------|----------|----------|-----------|
| RESTful 設計 | 8/10 | 9/10 | 🟡 中 |
| HTTP 方法使用 | 8/10 | 10/10 | 🟢 低 |
| 狀態碼使用 | 7/10 | 10/10 | 🟡 中 |
| 請求格式一致性 | 5/10 | 10/10 | 🔴 高 |
| 回應格式一致性 | 4/10 | 10/10 | 🔴 高 |
| 錯誤處理 | 4/10 | 10/10 | 🔴 高 |
| 分頁機制 | 0/10 | 10/10 | 🔴 高 |
| 過濾和排序 | 3/10 | 9/10 | 🟡 中 |
| 身份驗證 | 9/10 | 10/10 | 🟢 低 |
| 授權檢查 | 7/10 | 10/10 | 🟡 中 |
| 輸入驗證 | 5/10 | 10/10 | 🔴 高 |
| CSRF 保護 | 0/10 | 10/10 | 🔴 高 |
| Rate Limiting | 6/10 | 10/10 | 🟡 中 |
| N+1 查詢 | 4/10 | 10/10 | 🔴 高 |
| 快取策略 | 2/10 | 9/10 | 🟡 中 |
| 資料庫索引 | 5/10 | 9/10 | 🟡 中 |
| API 文檔 | 1/10 | 10/10 | 🔴 高 |
| 版本控制 | 0/10 | 9/10 | 🟡 中 |
| 監控和日誌 | 3/10 | 9/10 | 🟡 中 |

**整體評分**: **5.3 / 10** → 目標: **9.5 / 10**

---

## 8. 下一步行動

### Phase 1: 基礎改進（第 1-2 週）
- [ ] 實作統一錯誤處理
- [ ] 實作分頁機制
- [ ] 修正 N+1 查詢
- [ ] 統一認證中間件

### Phase 2: 安全性加強（第 3-4 週）
- [ ] 實作輸入驗證（Zod）
- [ ] 添加 CSRF 保護
- [ ] 統一 Rate Limiting
- [ ] 資料庫索引優化

### Phase 3: 文檔和標準化（第 5-6 週）
- [ ] 創建 OpenAPI 規範
- [ ] 設定 Swagger UI
- [ ] 統一回應格式
- [ ] 修正 RESTful 不規範端點

### Phase 4: 性能優化（第 7-8 週）
- [ ] 實作 Redis 快取
- [ ] 優化資料庫查詢
- [ ] 實作連接池監控
- [ ] 批次操作優化

### Phase 5: 進階功能（第 9-12 週）
- [ ] API 版本控制
- [ ] 實作棄用機制
- [ ] APM 監控整合
- [ ] 性能測試和優化

---

## 附錄

### A. 參考資料

- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [REST API Design Best Practices](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

### B. 工具推薦

- **API 設計**: Postman, Insomnia, Swagger Editor
- **驗證**: Zod, Joi, Yup
- **快取**: Redis, Memcached
- **監控**: DataDog, New Relic, Sentry
- **測試**: Vitest, Jest, Supertest
- **文檔**: Swagger UI, Redoc, Stoplight

### C. 團隊培訓建議

1. **RESTful API 設計原則**（2 小時）
2. **TypeScript 與 Zod 驗證**（3 小時）
3. **Next.js API Routes 最佳實踐**（3 小時）
4. **資料庫查詢優化**（2 小時）
5. **API 安全性實務**（3 小時）

---

**報告結束**

如有任何問題或需要進一步說明，請聯繫開發團隊。
