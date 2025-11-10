# API 遷移模式參考

## 已完成遷移的 API

- ✅ `/api/customers` - GET, POST
- ✅ `/api/customers/[id]` - GET, PUT, DELETE
- ✅ `/api/products` - GET, POST
- ✅ `/api/products/[id]` - GET, PUT, DELETE

## 遷移模式速查

### 1. 檔案頂部導入

```typescript
import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'

// 導入對應的 DAL 函式
import { getXXX, getXXXById, createXXX, updateXXX, deleteXXX } from '@/lib/dal/xxx'

export const runtime = 'edge'
```

### 2. GET 端點（列表）

```typescript
export async function GET(
  request: NextRequest,
  { env }: { env: { DB: D1Database; KV: KVNamespace } }
) {
  try {
    // 1. 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)
    const hasPermission = await checkPermission(kv, db, user.id, 'resource:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. 取得資料（使用 DAL）
    const items = await getXXX(db, user.id)

    return NextResponse.json(items)
  } catch (error: unknown) {
    console.error('Error fetching items:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
```

### 3. POST 端點（建立）

```typescript
export async function POST(
  request: NextRequest,
  { env }: { env: { DB: D1Database; KV: KVNamespace } }
) {
  try {
    // 1. 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)
    const hasPermission = await checkPermission(kv, db, user.id, 'resource:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. 取得請求資料
    const body = await request.json()

    // 4. 驗證必填欄位
    if (!body.required_field) {
      return NextResponse.json({ error: 'Required field is missing' }, { status: 400 })
    }

    // 5. 建立資源（DAL 會自動處理 JSON 序列化）
    const item = await createXXX(db, user.id, {
      field1: body.field1,
      field2: body.field2 || null,
      // ...
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating item:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
```

### 4. 動態路由 - GET（單個）

```typescript
export async function GET(
  request: NextRequest,
  { params, env }: { params: Promise<{ id: string }>; env: { DB: D1Database; KV: KVNamespace } }
) {
  try {
    const { id } = await params

    // 1. 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)
    const hasPermission = await checkPermission(kv, db, user.id, 'resource:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. 取得單個資源
    const item = await getXXXById(db, user.id, id)
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error: unknown) {
    console.error('Error fetching item:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
```

### 5. 動態路由 - PUT（更新）

```typescript
export async function PUT(
  request: NextRequest,
  { params, env }: { params: Promise<{ id: string }>; env: { DB: D1Database; KV: KVNamespace } }
) {
  try {
    const { id } = await params

    // 1. 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)
    const hasPermission = await checkPermission(kv, db, user.id, 'resource:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. 取得請求資料
    const body = await request.json()

    // 4. 更新資源（DAL 會自動處理 JSON 序列化和過濾 undefined）
    const item = await updateXXX(db, user.id, id, body)
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error: unknown) {
    console.error('Error updating item:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
```

### 6. 動態路由 - DELETE（刪除）

```typescript
export async function DELETE(
  request: NextRequest,
  { params, env }: { params: Promise<{ id: string }>; env: { DB: D1Database; KV: KVNamespace } }
) {
  try {
    const { id } = await params

    // 1. 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)
    const hasPermission = await checkPermission(kv, db, user.id, 'resource:delete')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. 刪除資源
    await deleteXXX(db, user.id, id)

    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
```

## 關鍵改變總結

### 移除
- ❌ `export const dynamic = 'force-dynamic'`
- ❌ `import { query } from '@/lib/db/zeabur'`
- ❌ `import { toJsonbField } from '@/lib/utils/jsonb-converter'`
- ❌ `import { parseJsonbArray, parseJsonbFields } from '@/lib/utils/jsonb-parser'`
- ❌ 直接呼叫 `supabase.from().select()` 等業務資料查詢

### 新增
- ✅ `export const runtime = 'edge'`
- ✅ `{ env }: { env: { DB: D1Database; KV: KVNamespace } }` 參數
- ✅ `import { getD1Client } from '@/lib/db/d1-client'`
- ✅ `import { getKVCache } from '@/lib/cache/kv-cache'`
- ✅ `import { checkPermission } from '@/lib/cache/services'`
- ✅ 使用對應的 DAL 函式
- ✅ KV 快取權限檢查

### 保留不變
- ✅ Supabase Auth 認證流程
- ✅ 錯誤處理邏輯
- ✅ HTTP 狀態碼
- ✅ 回傳格式

## 權限名稱對應

| 資源 | 讀取 | 寫入 | 刪除 |
|------|------|------|------|
| Customers | `customers:read` | `customers:write` | `customers:delete` |
| Products | `products:read` | `products:write` | `products:delete` |
| Quotations | `quotations:read` | `quotations:write` | `quotations:delete` |
| Companies | `companies:read` | `companies:write` | `companies:delete` |
| Contracts | `contracts:read` | `contracts:write` | `contracts:delete` |
| Payments | `payments:read` | `payments:write` | `payments:delete` |
| Exchange Rates | `exchange_rates:read` | `exchange_rates:write` | N/A |

## 常見模式

### 1. JSON 欄位處理
DAL 層會自動處理 JSON 序列化/反序列化，API 層直接使用 TypeScript 物件即可：

```typescript
// 舊方式
const customer = {
  name: toJsonbField({ zh: '公司名稱', en: 'Company Name' })
}

// 新方式（DAL 自動處理）
const customer = {
  name: { zh: '公司名稱', en: 'Company Name' }
}
```

### 2. 數值欄位驗證
需要手動驗證和轉換數值：

```typescript
if (body.price !== undefined) {
  const price = parseFloat(body.price)
  if (isNaN(price) || price < 0) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }
  body.price = price
}
```

### 3. 向後相容欄位映射
如果前端仍使用舊欄位名稱，可以在回傳時映射：

```typescript
const mappedProducts = products.map(product => ({
  ...product,
  unit_price: product.base_price,  // 映射舊欄位名
  currency: product.base_currency
}))
```

## 下一步

遷移順序（按優先級）：
1. ✅ Customers API
2. ✅ Products API
3. ⏳ Quotations API
4. ⏳ Companies API
5. ⏳ Exchange Rates API
6. ⏳ Contracts API
7. ⏳ Payments API
8. ⏳ Admin API
