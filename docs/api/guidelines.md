# API 設計指南
> Quotation System API Design Guidelines

**版本**: 1.0.0
**最後更新**: 2025-10-20

---

## 目錄

1. [設計原則](#設計原則)
2. [命名規範](#命名規範)
3. [請求格式](#請求格式)
4. [回應格式](#回應格式)
5. [錯誤處理](#錯誤處理)
6. [分頁機制](#分頁機制)
7. [過濾和排序](#過濾和排序)
8. [認證和授權](#認證和授權)
9. [安全性](#安全性)
10. [版本控制](#版本控制)
11. [範例程式碼](#範例程式碼)

---

## 設計原則

### 1. RESTful 規範

遵循 REST 架構風格：

- **資源導向**: URL 表示資源，不是動作
- **HTTP 方法**: 使用正確的 HTTP 方法表達操作意圖
- **無狀態**: 每個請求包含完整的資訊
- **統一介面**: 一致的 URL 結構和回應格式

### 2. 一致性優先

- 統一的命名規範
- 統一的回應格式
- 統一的錯誤處理
- 統一的分頁機制

### 3. 向後相容

- 新功能使用新端點或可選參數
- 棄用而不是刪除舊端點
- 提前通知重大變更
- 提供遷移指南

---

## 命名規範

### URL 命名

#### ✅ 推薦做法

```
/api/customers                    # 集合
/api/customers/{id}               # 單一資源
/api/customers/{id}/orders        # 子資源集合
/api/customers/{id}/orders/{orderId}  # 子資源
```

#### ❌ 避免做法

```
/api/getCustomers                 # 不使用動詞
/api/customer                     # 集合使用複數
/api/Customers                    # 使用小寫
/api/customers-list               # 不使用連字號分隔（部分資源除外）
```

### 資源命名規則

1. **使用複數名詞**: `customers`, `products`, `quotations`
2. **使用小寫**: 全部小寫，單字間用 `-` 連接
3. **使用名詞而非動詞**: URL 表示資源，不是動作
4. **巢狀資源**: 最多三層 `/resource/{id}/sub-resource/{id}/sub-sub-resource`

### HTTP 方法對應

| HTTP 方法 | 操作 | 範例 |
|-----------|------|------|
| GET | 讀取資源 | `GET /api/customers` - 列出所有客戶 |
| POST | 創建資源 | `POST /api/customers` - 創建新客戶 |
| PUT | 完整更新資源 | `PUT /api/customers/{id}` - 更新客戶所有欄位 |
| PATCH | 部分更新資源 | `PATCH /api/customers/{id}` - 更新客戶部分欄位 |
| DELETE | 刪除資源 | `DELETE /api/customers/{id}` - 刪除客戶 |

### 特殊操作

對於無法用 CRUD 表達的操作，使用子資源或動作：

```
POST /api/quotations/{id}/send         # 發送報價單
POST /api/quotations/{id}/convert      # 將報價單轉為合約
POST /api/payments/{id}/confirm        # 確認付款
PATCH /api/contracts/{id}/activate     # 啟用合約
```

---

## 請求格式

### Content-Type

所有請求都應使用 JSON 格式：

```http
Content-Type: application/json
```

### 請求標頭

#### 必需標頭

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### 可選標頭

```http
Accept-Language: zh-TW              # 語言偏好
X-CSRF-Token: <csrf_token>          # CSRF 保護（變更操作）
X-Request-ID: <unique_id>           # 請求追蹤 ID
```

### 雙語欄位格式

系統支援中英雙語，所有多語言欄位使用統一格式：

```json
{
  "name": {
    "zh": "客戶名稱",
    "en": "Customer Name"
  },
  "address": {
    "zh": "台北市信義區信義路五段7號",
    "en": "No. 7, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City"
  }
}
```

### 日期和時間格式

- **日期**: ISO 8601 格式 `YYYY-MM-DD`
- **時間**: ISO 8601 格式 `YYYY-MM-DDTHH:mm:ss.sssZ`

```json
{
  "issue_date": "2025-10-20",
  "created_at": "2025-10-20T10:30:00.000Z"
}
```

### 數值格式

- **金額**: 數字型別，保留兩位小數
- **百分比**: 數字型別（0-100）
- **數量**: 數字型別

```json
{
  "total_amount": 10500.00,
  "tax_rate": 5.0,
  "quantity": 10
}
```

---

## 回應格式

### 標準成功回應

所有成功回應遵循統一格式：

```typescript
interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: PaginationMeta
  message?: string
}
```

#### 單一資源

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": {
      "zh": "客戶名稱",
      "en": "Customer Name"
    },
    "email": "customer@example.com"
  },
  "message": "Customer created successfully"
}
```

#### 資源列表

```json
{
  "success": true,
  "data": [
    { "id": "1", "name": "..." },
    { "id": "2", "name": "..." }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "hasMore": true
  }
}
```

#### 操作確認

```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

### HTTP 狀態碼

| 狀態碼 | 說明 | 使用時機 |
|--------|------|----------|
| 200 OK | 成功 | GET, PUT, PATCH 成功 |
| 201 Created | 已創建 | POST 創建資源成功 |
| 204 No Content | 無內容 | DELETE 成功（建議） |
| 400 Bad Request | 錯誤請求 | 請求格式錯誤 |
| 401 Unauthorized | 未認證 | 缺少或無效的認證 token |
| 403 Forbidden | 無權限 | 已認證但無權限 |
| 404 Not Found | 找不到資源 | 資源不存在 |
| 422 Unprocessable Entity | 無法處理 | 驗證失敗 |
| 429 Too Many Requests | 請求過多 | 超過速率限制 |
| 500 Internal Server Error | 伺服器錯誤 | 伺服器內部錯誤 |

---

## 錯誤處理

### 標準錯誤格式 (RFC 9457)

```typescript
interface ApiErrorResponse {
  success: false
  error: {
    type: string          // 錯誤類型標識符
    title: string         // 人類可讀的標題
    status: number        // HTTP 狀態碼
    detail: string        // 詳細說明
    instance?: string     // 發生錯誤的端點
    errors?: Array<{      // 詳細驗證錯誤
      field: string
      message: string
      code: string
    }>
  }
  timestamp: string
  requestId?: string
}
```

### 錯誤類型

#### 1. 認證錯誤 (401)

```json
{
  "success": false,
  "error": {
    "type": "unauthorized",
    "title": "Authentication Required",
    "status": 401,
    "detail": "You must be authenticated to access this resource"
  },
  "timestamp": "2025-10-20T10:30:00.000Z"
}
```

#### 2. 權限錯誤 (403)

```json
{
  "success": false,
  "error": {
    "type": "forbidden",
    "title": "Access Denied",
    "status": 403,
    "detail": "You don't have permission to access customers"
  },
  "timestamp": "2025-10-20T10:30:00.000Z"
}
```

#### 3. 找不到資源 (404)

```json
{
  "success": false,
  "error": {
    "type": "not_found",
    "title": "Resource Not Found",
    "status": 404,
    "detail": "The requested customer was not found",
    "instance": "/api/customers/123"
  },
  "timestamp": "2025-10-20T10:30:00.000Z"
}
```

#### 4. 驗證錯誤 (422)

```json
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
      },
      {
        "field": "name.zh",
        "message": "Chinese name is required",
        "code": "required"
      }
    ]
  },
  "timestamp": "2025-10-20T10:30:00.000Z"
}
```

#### 5. 速率限制 (429)

```json
{
  "success": false,
  "error": {
    "type": "rate_limit_exceeded",
    "title": "Too Many Requests",
    "status": 429,
    "detail": "Rate limit exceeded. Please retry after 60 seconds"
  },
  "timestamp": "2025-10-20T10:30:00.000Z"
}
```

回應標頭：
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-10-20T10:31:00.000Z
Retry-After: 60
```

#### 6. 伺服器錯誤 (500)

```json
{
  "success": false,
  "error": {
    "type": "internal_error",
    "title": "Internal Server Error",
    "status": 500,
    "detail": "An unexpected error occurred"
  },
  "timestamp": "2025-10-20T10:30:00.000Z",
  "requestId": "req_abc123"
}
```

**注意**: 生產環境不應暴露詳細的錯誤堆疊資訊。

---

## 分頁機制

系統支援兩種分頁模式：

### 1. Offset-based Pagination（偏移分頁）

適用於：一般列表查詢、需要跳頁的場景

#### 請求參數

```
GET /api/customers?page=2&pageSize=20
```

| 參數 | 說明 | 預設值 | 範圍 |
|------|------|--------|------|
| page | 頁碼（從 1 開始） | 1 | ≥ 1 |
| pageSize | 每頁數量 | 20 | 1-100 |

#### 回應格式

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 2,
    "pageSize": 20,
    "totalPages": 5,
    "hasMore": true
  }
}
```

### 2. Cursor-based Pagination（游標分頁）

適用於：即時更新的資料、無限滾動、大資料集

#### 請求參數

```
GET /api/quotations?cursor=abc123&limit=20
```

| 參數 | 說明 | 預設值 | 範圍 |
|------|------|--------|------|
| cursor | 上次查詢的最後一筆記錄 ID | - | - |
| limit | 返回數量 | 20 | 1-100 |

#### 回應格式

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "nextCursor": "def456",
    "hasMore": true
  }
}
```

#### 使用流程

```javascript
// 第一次請求
fetch('/api/quotations?limit=20')

// 使用返回的 nextCursor 請求下一頁
fetch('/api/quotations?cursor=def456&limit=20')
```

---

## 過濾和排序

### 過濾參數

使用 `filter[field]` 格式：

```
GET /api/quotations?filter[status]=draft&filter[currency]=TWD
```

### 搜尋參數

使用 `q` 參數進行全文搜尋：

```
GET /api/customers?q=台灣科技
```

### 排序參數

使用 `sort` 參數，前綴 `-` 表示降序：

```
GET /api/customers?sort=-created_at           # 依創建時間降序
GET /api/customers?sort=name.zh               # 依中文名稱升序
GET /api/customers?sort=-created_at,name.zh   # 多欄位排序
```

### 欄位選擇

使用 `fields` 參數只返回指定欄位：

```
GET /api/customers?fields=id,name,email
```

### 關聯載入

使用 `include` 參數載入關聯資源：

```
GET /api/quotations?include=customer,items
```

### 綜合範例

```
GET /api/quotations?
  page=1&
  pageSize=20&
  filter[status]=draft&
  filter[currency]=TWD&
  sort=-created_at&
  include=customer,items&
  q=客戶名稱
```

---

## 認證和授權

### 認證機制

系統使用 Supabase Auth 進行認證：

#### 1. 取得 Token

```javascript
// 前端 - 使用 Supabase Client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Google OAuth 登入
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
})
```

#### 2. 使用 Token

在所有 API 請求中包含 token：

```http
Authorization: Bearer <jwt_token>
```

```javascript
// 範例
const response = await fetch('/api/customers', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
})
```

#### 3. Token 刷新

Token 會自動刷新，無需手動處理。

### 授權機制

系統使用 RBAC（角色基礎存取控制）：

#### 角色定義

- **super_admin**: 系統管理員
- **company_admin**: 公司管理員
- **manager**: 經理
- **employee**: 員工
- **viewer**: 檢視者

#### 權限檢查

API 會根據使用者角色檢查權限：

```typescript
// 範例：只有管理員可以刪除客戶
if (!hasPermission(userId, 'customers', 'delete')) {
  return 403 Forbidden
}
```

### 資料隔離

所有資料都按 `user_id` 隔離，使用者只能存取自己的資料：

```sql
SELECT * FROM customers WHERE user_id = $1
```

---

## 安全性

### 1. HTTPS

生產環境**必須**使用 HTTPS。

### 2. CSRF 保護

所有狀態變更操作（POST, PUT, PATCH, DELETE）需要 CSRF token：

```http
X-CSRF-Token: <csrf_token>
```

### 3. Rate Limiting

系統實作速率限制防止濫用：

| 端點類型 | 限制 |
|---------|------|
| 一般 API | 60 次/分鐘 |
| 敏感操作 | 10 次/分鐘 |
| 批次操作 | 5 次/5分鐘 |
| Email 發送 | 20 次/小時 |

超過限制會返回 429 狀態碼。

### 4. 輸入驗證

所有輸入都經過嚴格驗證：

- 型別檢查
- 格式驗證
- 長度限制
- 範圍檢查

### 5. SQL Injection 防護

使用參數化查詢：

```typescript
// ✅ 正確
query('SELECT * FROM customers WHERE id = $1', [id])

// ❌ 錯誤
query(`SELECT * FROM customers WHERE id = '${id}'`)
```

### 6. XSS 防護

- API 只返回 JSON
- 前端負責適當的輸出編碼

### 7. 敏感資料保護

- 密碼使用 bcrypt 雜湊
- 不在回應中返回敏感資料
- 使用環境變數儲存機密

---

## 版本控制

### 版本策略

系統計劃採用 URI 版本控制：

```
/api/v1/customers
/api/v2/customers
```

### 版本生命週期

1. **Alpha**: 內部測試版本
2. **Beta**: 公開測試版本
3. **Stable**: 穩定版本
4. **Deprecated**: 已棄用，但仍可用
5. **Sunset**: 計劃移除日期

### 棄用流程

1. **宣告棄用**: 在回應標頭中添加 `Deprecation: true`
2. **提供替代方案**: 文檔中說明新端點
3. **設定 Sunset 日期**: 至少提前 6 個月通知
4. **最終移除**: 在 Sunset 日期後移除

```http
Deprecation: true
Sunset: Wed, 11 Nov 2026 11:11:11 GMT
Link: </api/v2/customers>; rel="alternate"
```

---

## 範例程式碼

### 客戶端範例

#### JavaScript/TypeScript

```typescript
// api/client.ts
export class QuotationSystemClient {
  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string>
  ) {}

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken()

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new ApiError(error)
    }

    return response.json()
  }

  // 客戶 API
  async listCustomers(params?: {
    page?: number
    pageSize?: number
    q?: string
  }) {
    const query = new URLSearchParams(params as any)
    return this.request<ApiResponse<Customer[]>>(
      `/api/customers?${query}`
    )
  }

  async getCustomer(id: string) {
    return this.request<ApiResponse<Customer>>(
      `/api/customers/${id}`
    )
  }

  async createCustomer(data: CreateCustomerInput) {
    return this.request<ApiResponse<Customer>>(
      '/api/customers',
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    )
  }

  async updateCustomer(id: string, data: UpdateCustomerInput) {
    return this.request<ApiResponse<Customer>>(
      `/api/customers/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      }
    )
  }

  async deleteCustomer(id: string) {
    return this.request<ApiResponse<void>>(
      `/api/customers/${id}`,
      { method: 'DELETE' }
    )
  }
}

// 使用範例
const client = new QuotationSystemClient(
  'https://api.quotation-system.com',
  async () => {
    const session = await supabase.auth.getSession()
    return session.data.session?.access_token || ''
  }
)

// 列出客戶
const { data: customers } = await client.listCustomers({
  page: 1,
  pageSize: 20,
  q: '台灣科技'
})

// 創建客戶
const { data: newCustomer } = await client.createCustomer({
  name: {
    zh: '台灣科技股份有限公司',
    en: 'Taiwan Tech Co., Ltd.'
  },
  email: 'contact@taiwantech.com',
  phone: '+886-2-1234-5678'
})
```

### 伺服器端範例

#### Next.js API Route

```typescript
// app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withValidation } from '@/lib/middleware/withValidation'
import { withRateLimit } from '@/lib/middleware/withRateLimit'
import { CreateCustomerSchema } from '@/lib/validations/customer.schema'
import { ApiErrors } from '@/lib/errors/api-error'

// GET /api/customers
export const GET = withRateLimit(
  withAuth(async (request, { userId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const pageSize = Math.min(
        parseInt(searchParams.get('pageSize') || '20'),
        100
      )
      const q = searchParams.get('q')

      const { data, total } = await getCustomersPaginated(userId, {
        page,
        pageSize,
        search: q
      })

      return NextResponse.json({
        success: true,
        data,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          hasMore: page * pageSize < total
        }
      })
    } catch (error) {
      console.error('Error listing customers:', error)
      throw ApiErrors.InternalError()
    }
  })
)

// POST /api/customers
export const POST = withRateLimit(
  withValidation(CreateCustomerSchema)(
    async (request, { userId, body }) => {
      try {
        const customer = await createCustomer({
          ...body,
          user_id: userId
        })

        return NextResponse.json({
          success: true,
          data: customer,
          message: 'Customer created successfully'
        }, { status: 201 })
      } catch (error) {
        console.error('Error creating customer:', error)
        throw ApiErrors.InternalError()
      }
    }
  )
)
```

---

## 附錄

### 相關文件

- [API_DESIGN_REPORT.md](./API_DESIGN_REPORT.md) - 完整的 API 設計分析報告
- [openapi.yaml](./openapi.yaml) - OpenAPI 3.1 規範文件
- [README.md](./README.md) - 專案說明文件

### 工具推薦

- **API 測試**: Postman, Insomnia
- **文檔瀏覽**: Swagger UI, Redoc
- **驗證**: Zod, Yup
- **型別生成**: openapi-typescript

### 參考標準

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [REST API Design Best Practices](https://restfulapi.net/)

---

**文件結束**

如有任何問題或建議，請聯繫開發團隊。
