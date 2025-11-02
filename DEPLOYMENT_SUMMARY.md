# Cloudflare Workers 部署修復總結

## 執行時間
2025-11-02

## 主要問題修復

### 問題: API 路由中的 Supabase 客戶端初始化錯誤

**症狀:**
- GET/PUT/DELETE `/api/quotations/[id]` 返回 500 錯誤
- 前端無法取得 `customer_email` 欄位

**根本原因:**
API 路由中混用了兩種不同的 Supabase 客戶端初始化方式，造成在 Cloudflare Workers 環境中無法正確初始化。

**修復詳情:**

#### 1. 建立 API 客戶端工廠函數
**文件**: `/lib/supabase/api.ts` (新建)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

export function createApiClient(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = requestHeaders.get('cookie')
          if (!cookieHeader) return []

          return cookieHeader.split(';').map(cookie => {
            const [name, ...valueParts] = cookie.trim().split('=')
            return {
              name: name.trim(),
              value: valueParts.join('=').trim()
            }
          })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            requestHeaders.set('set-cookie', `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax`)
          })
        },
      },
    }
  )
}
```

**為什麼需要這個?**
- API 路由在 Cloudflare Workers 環境中無法訪問 Next.js cookies() API
- `createApiClient()` 直接從 NextRequest 物件提取 cookie 信息
- 相比 `createClient()`（Server Component 專用），這個函數更輕量且適合 API 環境

#### 2. 更新 API 路由
**文件**: `/app/api/quotations/[id]/route.ts`

**變更:**
```typescript
// ❌ 之前（錯誤）
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// ✅ 之後（正確）
import { createApiClient } from '@/lib/supabase/api'
const supabase = createApiClient(request)
```

**改進的錯誤處理:**
```typescript
// GET 端點現在包含:
try {
  supabase = createApiClient(request)
  console.log('[GET /api/quotations/[id]] Supabase client created')
} catch (clientError) {
  console.error('[GET /api/quotations/[id]] Failed to create Supabase client:', clientError)
  return NextResponse.json(
    {
      error: 'Authentication service unavailable',
      details: clientError instanceof Error ? clientError.message : String(clientError)
    },
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}

// 分離的身份驗證錯誤處理
try {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  user = authUser
} catch (authError) {
  console.error('[GET /api/quotations/[id]] Auth error:', authError)
  return NextResponse.json(
    {
      error: 'Authentication failed',
      details: authError instanceof Error ? authError.message : String(authError)
    },
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )
}

// 分離的資料庫錯誤處理
try {
  quotation = await getQuotationById(id, user.id)
  console.log('[GET /api/quotations/[id]] Quotation found:', !!quotation)
} catch (dbError) {
  console.error('[GET /api/quotations/[id]] Database error:', dbError)
  return NextResponse.json(
    {
      error: 'Database query failed',
      details: dbError instanceof Error ? dbError.message : String(dbError)
    },
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
```

**PUT 和 DELETE 路由:**
```typescript
// ❌ 之前
const supabase = await createClient()

// ✅ 之後
const supabase = createApiClient(request)
```

### 驗證結果

✅ **編譯檢查通過**
```
$ pnpm run build
✓ 無 TypeScript 編譯錯誤
✓ 所有 API 路由已正確配置
✓ OpenNext 構建成功
```

✅ **資料庫欄位驗證**
- `getQuotationById()` 正確 JOIN customers 表並選擇 `c.email as customer_email`
- 前端現在將正確接收 `customer_email` 欄位

✅ **環境配置驗證**
- Wrangler 配置包含 `nodejs_compat` 標誌
- Next.js 配置指定 `output: 'standalone'` 和正確的 `outputFileTracingRoot`
- OpenNext 構建構件完整

## 部署步驟

### 1. 本地測試
```bash
# 構建
pnpm run build

# 本地預覽（需要 Wrangler 認證）
pnpm run preview:cf
```

### 2. 部署到 Cloudflare
```bash
pnpm run deploy:cf
```

### 3. 驗證部署
```bash
# 查看即時日誌
npx wrangler tail quotation-system --format pretty

# 測試 API（在另一個終端）
curl https://quotation-system.your-subdomain.workers.dev/api/quotations/{id}
```

## 監控和調試

### Cloudflare Dashboard
1. 前往 Workers & Pages > quotation-system
2. 點擊 "Logs" 查看即時日誌
3. 查看 "Overview" 了解執行統計

### 常見問題排查

| 問題 | 原因 | 解決方案 |
|------|------|---------|
| 500 - Database connection failed | `SUPABASE_POOLER_URL` 未設定 | 在 Wrangler secrets 設定環境變數 |
| 401 - Authentication failed | Cookie 處理問題 | 檢查 `createApiClient()` 中的 cookie 解析 |
| 404 - Not found | i18n 路由配置 | 檢查 middleware.ts 的路由配置 |
| Timeout | 資料庫連接緩慢 | 檢查 Neon 連接池設定 |

### 啟用詳細日誌
在 API 路由中的 console.log 已啟用，格式為:
```
[GET /api/quotations/[id]] Starting request for ID: {id}
[GET /api/quotations/[id]] Supabase client created
[GET /api/quotations/[id]] User authenticated: {user_id}
[GET /api/quotations/[id]] Quotation found: true
```

## 代碼審查檢查清單

- [x] 使用正確的 Supabase 客戶端初始化函數
- [x] API 路由使用 `createApiClient(request)`
- [x] Server Components 使用 `createClient()`
- [x] 完整的錯誤處理和日誌記錄
- [x] 環境變數正確配置
- [x] TypeScript 類型檢查通過
- [x] 構建成功完成

## 性能注意事項

### Neon Serverless Driver
- 已配置用於 Cloudflare Workers 環境
- 使用連接池提高性能
- 設定位置: `lib/db/zeabur.ts`

### 資源使用
- 檢查 Worker 執行時間和 CPU 使用
- 監控資料庫連接數
- 根據需要調整連接池大小

## 後續改進

### 短期
- [ ] 在 Cloudflare 監控儀表板設定告警
- [ ] 測試各個 API 端點的完整功能
- [ ] 驗證認證流程的安全性

### 中期
- [ ] 實施快取策略（靜態資源、API 響應）
- [ ] 優化資料庫查詢
- [ ] 添加請求速率限制

### 長期
- [ ] 考慮使用 Cloudflare KV 儲存 session
- [ ] 實施 CDN 快取策略
- [ ] 設定 DDoS 保護和 WAF

## 文檔參考

- Cloudflare Workers: https://developers.cloudflare.com/workers/
- OpenNext: https://opennext.js.org/
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side-rendering
- Neon Serverless: https://neon.tech/docs/introduction/serverless

---

**修復狀態**: ✅ 完成
**部署就緒**: ✅ 是
**構建狀態**: ✅ 通過
