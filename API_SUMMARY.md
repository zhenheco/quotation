# API 設計優化摘要

> 快速參考：報價系統 API 優化建議

## 📊 整體評估

**當前評分**: 5.3/10
**目標評分**: 9.5/10

| 項目 | 現況 | 目標 | 優先級 |
|------|------|------|--------|
| 錯誤處理 | 4/10 | 10/10 | 🔴 高 |
| 分頁機制 | 0/10 | 10/10 | 🔴 高 |
| 輸入驗證 | 5/10 | 10/10 | 🔴 高 |
| API 一致性 | 4/10 | 10/10 | 🔴 高 |
| CSRF 保護 | 0/10 | 10/10 | 🔴 高 |
| N+1 查詢 | 4/10 | 10/10 | 🔴 高 |
| API 文檔 | 1/10 | 10/10 | 🔴 高 |

---

## 🎯 核心問題

### 1. 回應格式不一致 🔴

**問題**：
```typescript
// 格式 1
[{ id: "1" }, { id: "2" }]

// 格式 2
{ success: true, data: [...] }

// 格式 3
{ message: "Success" }
```

**解決方案**：統一為
```typescript
{
  success: true,
  data: T,
  meta?: { total, page, ... },
  message?: string
}
```

### 2. 缺少分頁 🔴

**問題**：所有列表端點返回完整資料，性能差

**解決方案**：
```typescript
// Offset-based
GET /api/customers?page=1&pageSize=20

// Cursor-based
GET /api/quotations?cursor=abc&limit=20
```

### 3. 錯誤格式混亂 🔴

**問題**：
```typescript
{ error: "Unauthorized" }  // 格式 1
{ error: "...", message: "..." }  // 格式 2
```

**解決方案**：遵循 RFC 9457
```typescript
{
  success: false,
  error: {
    type: "validation_error",
    title: "Validation Failed",
    status: 422,
    detail: "...",
    errors: [...]
  },
  timestamp: "..."
}
```

### 4. 缺少輸入驗證 🔴

**問題**：驗證邏輯分散，錯誤訊息不一致

**解決方案**：使用 Zod
```typescript
const CreateCustomerSchema = z.object({
  name: z.object({
    zh: z.string().min(1),
    en: z.string().min(1)
  }),
  email: z.string().email()
})
```

### 5. N+1 查詢問題 🔴

**問題**：
```typescript
// 查詢 100 個報價單
const quotations = await getQuotations(userId)

// 對每個報價單查詢客戶（100 次查詢）
for (const q of quotations) {
  q.customer = await getCustomer(q.customer_id)
}
```

**解決方案**：使用 JOIN 或 DataLoader
```sql
SELECT q.*, c.*
FROM quotations q
LEFT JOIN customers c ON q.customer_id = c.id
WHERE q.user_id = $1
```

### 6. 缺少 CSRF 保護 🔴

**問題**：沒有 CSRF token 機制

**解決方案**：
```http
X-CSRF-Token: <token>
```

---

## ⚡ 快速修復清單

### 第 1 週：基礎改進

- [ ] 創建統一的錯誤處理類別 (`ApiError`)
- [ ] 實作標準回應格式
- [ ] 為列表端點添加分頁
- [ ] 統一使用 `withAuth` 中間件

### 第 2 週：安全性

- [ ] 引入 Zod 進行輸入驗證
- [ ] 實作 CSRF 保護
- [ ] 統一 Rate Limiting
- [ ] 修正 N+1 查詢

### 第 3 週：文檔

- [ ] 設定 Swagger UI
- [ ] 完善 OpenAPI 規範
- [ ] 統一回應格式
- [ ] 創建客戶端 SDK

### 第 4 週：性能

- [ ] 實作 Redis 快取
- [ ] 優化資料庫查詢
- [ ] 添加資料庫索引
- [ ] 批次操作優化

---

## 📝 標準化範本

### API Route 範本

```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withValidation } from '@/lib/middleware/withValidation'
import { withRateLimit } from '@/lib/middleware/withRateLimit'
import { CreateResourceSchema } from '@/lib/validations'
import { ApiErrors } from '@/lib/errors/api-error'

// GET - 列表
export const GET = withRateLimit.default(
  withAuth(async (request, { userId }) => {
    const { page, pageSize, ...filters } = parseQueryParams(request)

    const { data, total } = await getResourcesPaginated(userId, {
      page,
      pageSize,
      filters
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
  })
)

// POST - 創建
export const POST = withRateLimit.default(
  withValidation(CreateResourceSchema)(
    async (request, { userId, body }) => {
      const resource = await createResource({
        ...body,
        user_id: userId
      })

      return NextResponse.json({
        success: true,
        data: resource,
        message: 'Resource created successfully'
      }, { status: 201 })
    }
  )
)
```

### 錯誤處理範本

```typescript
// lib/errors/api-error.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public type: string,
    public title: string,
    message: string,
    public errors?: ValidationError[]
  ) {
    super(message)
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

export const ApiErrors = {
  Unauthorized: () => new ApiError(
    401, 'unauthorized', 'Authentication Required',
    'You must be authenticated'
  ),

  NotFound: (resource: string) => new ApiError(
    404, 'not_found', 'Resource Not Found',
    `The requested ${resource} was not found`
  ),

  ValidationError: (errors: ValidationError[]) => new ApiError(
    422, 'validation_error', 'Validation Failed',
    'The request contains invalid data',
    errors
  )
}
```

### 驗證 Schema 範本

```typescript
// lib/validations/[resource].schema.ts
import { z } from 'zod'

export const CreateResourceSchema = z.object({
  name: z.object({
    zh: z.string().min(1, '中文名稱為必填'),
    en: z.string().min(1, '英文名稱為必填')
  }),
  email: z.string().email('Email 格式不正確'),
  amount: z.number().positive('金額必須大於 0')
})

export type CreateResourceInput = z.infer<typeof CreateResourceSchema>
```

---

## 🚀 實作範例

### 1. 統一錯誤處理

```typescript
// 之前
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// 之後
if (!user) {
  throw ApiErrors.Unauthorized()
}
```

### 2. 統一回應格式

```typescript
// 之前
return NextResponse.json(customers)

// 之後
return NextResponse.json({
  success: true,
  data: customers,
  meta: { total, page, pageSize }
})
```

### 3. 添加分頁

```typescript
// 之前
const customers = await getCustomers(userId)
return NextResponse.json(customers)

// 之後
const page = parseInt(searchParams.get('page') || '1')
const pageSize = parseInt(searchParams.get('pageSize') || '20')

const { data, total } = await getCustomersPaginated(userId, {
  page,
  pageSize
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
```

### 4. 使用驗證中間件

```typescript
// 之前
const body = await request.json()
if (!body.name || !body.email) {
  return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
}

// 之後
export const POST = withValidation(CreateCustomerSchema)(
  async (request, { userId, body }) => {
    // body 已經過驗證
    const customer = await createCustomer({ ...body, user_id: userId })
    return NextResponse.json({ success: true, data: customer })
  }
)
```

### 5. 修正 N+1 查詢

```typescript
// 之前
const quotations = await query('SELECT * FROM quotations WHERE user_id = $1', [userId])
for (const q of quotations) {
  q.customer = await query('SELECT * FROM customers WHERE id = $1', [q.customer_id])
}

// 之後
const quotations = await query(`
  SELECT
    q.*,
    jsonb_build_object('id', c.id, 'name', c.name) as customer
  FROM quotations q
  LEFT JOIN customers c ON q.customer_id = c.id
  WHERE q.user_id = $1
`, [userId])
```

---

## 📚 相關文件

1. **[API_DESIGN_REPORT.md](./API_DESIGN_REPORT.md)** - 完整的分析報告（80+ 頁）
2. **[openapi.yaml](./openapi.yaml)** - OpenAPI 3.1 規範文件
3. **[API_GUIDELINES.md](./API_GUIDELINES.md)** - API 設計指南

---

## 🛠️ 下一步行動

### 立即執行（本週）
```bash
# 1. 創建錯誤處理工具
touch lib/errors/api-error.ts

# 2. 創建驗證 Schema
mkdir -p lib/validations
touch lib/validations/customer.schema.ts

# 3. 創建統一的分頁工具
touch lib/utils/pagination.ts

# 4. 安裝 Zod
npm install zod
```

### 程式碼範例位置
```
lib/
├── errors/
│   └── api-error.ts          # 統一錯誤處理
├── middleware/
│   ├── withAuth.ts           # 已存在，需統一使用
│   ├── withValidation.ts     # 新增：驗證中間件
│   └── withRateLimit.ts      # 改進：統一應用
├── validations/
│   ├── customer.schema.ts    # 新增
│   ├── product.schema.ts     # 新增
│   └── quotation.schema.ts   # 新增
└── utils/
    ├── pagination.ts         # 新增：分頁工具
    └── response.ts           # 新增：回應格式工具
```

---

## 🎓 團隊培訓建議

1. **API 設計原則**（2 小時）
   - RESTful 規範
   - HTTP 方法和狀態碼
   - 資源命名

2. **TypeScript 與 Zod**（3 小時）
   - Zod 基礎
   - Schema 定義
   - 型別推斷

3. **錯誤處理最佳實踐**（2 小時）
   - RFC 9457 標準
   - 統一錯誤格式
   - 錯誤分類

4. **性能優化**（3 小時）
   - N+1 查詢問題
   - 資料庫索引
   - 快取策略

---

## ✅ 檢查清單

### Phase 1: 基礎（第 1-2 週）
- [ ] 統一錯誤處理
- [ ] 統一回應格式
- [ ] 實作分頁機制
- [ ] 統一認證中間件
- [ ] 實作輸入驗證

### Phase 2: 安全性（第 3-4 週）
- [ ] CSRF 保護
- [ ] 統一 Rate Limiting
- [ ] 資料庫索引優化
- [ ] 修正 N+1 查詢

### Phase 3: 文檔（第 5-6 週）
- [ ] OpenAPI 規範完善
- [ ] Swagger UI 設定
- [ ] 客戶端 SDK 生成
- [ ] API 使用範例

### Phase 4: 性能（第 7-8 週）
- [ ] Redis 快取實作
- [ ] 資料庫查詢優化
- [ ] 批次操作改進
- [ ] 監控和日誌

---

**預估完成時間**: 8 週
**預估工作量**: 2-3 人月
**建議團隊**: 2 位後端工程師 + 1 位前端工程師（SDK 整合）

---

需要更多資訊？請參考完整的 [API_DESIGN_REPORT.md](./API_DESIGN_REPORT.md)
