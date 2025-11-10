# API 路由遷移範例

## 概述

本文檔展示如何將現有的 Supabase/Zeabur API 路由遷移到 Cloudflare D1 + KV 架構。

## 基本範例：取得客戶列表

### 遷移前（使用 Zeabur PostgreSQL）

```typescript
// app/api/customers/route.ts
import { query } from '@/lib/db/zeabur'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await query(
    'SELECT * FROM customers WHERE user_id = $1 ORDER BY created_at DESC',
    [session.user.id]
  )

  return Response.json(result.rows)
}
```

### 遷移後（使用 Cloudflare D1 + KV）

```typescript
// app/api/customers/route.ts
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getCustomers } from '@/lib/dal/customers'
import { checkPermission } from '@/lib/cache/services'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge' // 必須：Edge Runtime

export async function GET(
  request: Request,
  { env }: { env: { DB: D1Database; KV: KVNamespace } }
) {
  // 1. 驗證使用者（保留 Supabase Auth）
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. 檢查權限（使用 KV 快取）
  const kv = getKVCache(env)
  const db = getD1Client(env)

  const hasPermission = await checkPermission(
    kv,
    db,
    session.user.id,
    'customers:read'
  )

  if (!hasPermission) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. 取得資料（使用 DAL）
  const customers = await getCustomers(db, session.user.id)

  return Response.json(customers)
}
```

## 進階範例：建立客戶（含快取失效）

```typescript
// app/api/customers/route.ts (POST)
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { createCustomer } from '@/lib/dal/customers'
import { checkPermission } from '@/lib/cache/services'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function POST(
  request: Request,
  { env }: { env: { DB: D1Database; KV: KVNamespace } }
) {
  // 1. 驗證使用者
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. 檢查權限
  const kv = getKVCache(env)
  const db = getD1Client(env)

  const hasPermission = await checkPermission(
    kv,
    db,
    session.user.id,
    'customers:write'
  )

  if (!hasPermission) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. 解析請求
  const data = await request.json()

  // 4. 建立客戶
  const customer = await createCustomer(db, session.user.id, {
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    tax_id: data.tax_id,
    contact_person: data.contact_person,
    company_id: data.company_id
  })

  // 5. 失效相關快取（如有需要）
  // await kv.delete(`customers:list:${session.user.id}`)

  return Response.json(customer, { status: 201 })
}
```

## 快取策略範例：匯率 API

```typescript
// app/api/exchange-rates/route.ts
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getCachedExchangeRates } from '@/lib/cache/services'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(
  request: Request,
  { env }: { env: { DB: D1Database; KV: KVNamespace } }
) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 使用快取（24小時 TTL）
  const kv = getKVCache(env)
  const db = getD1Client(env)

  const rates = await getCachedExchangeRates(kv, db)

  return Response.json(rates)
}
```

## 環境變數型別定義

在 Next.js 專案中，需要擴充環境型別：

```typescript
// env.d.ts
interface CloudflareEnv {
  DB: D1Database
  KV: KVNamespace
  ANALYTICS: AnalyticsEngineDataset
}

declare module 'next/server' {
  interface NextRequest {
    env?: CloudflareEnv
  }
}
```

## 遷移檢查清單

每個 API 路由遷移時需要確認：

- [ ] 加上 `export const runtime = 'edge'`
- [ ] 從 `{ env }` 取得 D1 和 KV
- [ ] 使用 DAL 函式而非直接 SQL 查詢
- [ ] 保留 Supabase Auth（不變）
- [ ] 使用 KV 快取權限檢查
- [ ] 寫入操作後失效相關快取
- [ ] 錯誤處理
- [ ] TypeScript 型別正確

## 常見問題

### Q: 為何還需要 Supabase？

A: 只保留 Supabase Auth 用於認證，所有業務資料都遷移到 D1。

### Q: 如何處理 JSONB 欄位？

A: DAL 層會自動處理 JSON 序列化/反序列化，直接使用 TypeScript 物件即可。

### Q: 如何處理交易？

A: 使用 `db.batch()` 或 `db.transaction()`。

### Q: 如何測試？

A: 使用 `wrangler d1 execute --local` 進行本地測試。

## 下一步

完成範例 API 後：
1. 逐一遷移其餘 35+ API 路由
2. 更新前端呼叫（如需要）
3. 執行整合測試
4. 資料遷移
5. 部署到生產環境
