# 性能優化實施檢查清單

## 📋 總覽

本檢查清單提供逐步實施性能優化的指南。

---

## 階段 1: 資料庫優化 (預計 1-2 天)

### ✅ 步驟 1.1: 執行索引遷移

```bash
# 連接到資料庫
psql $ZEABUR_POSTGRES_URL

# 執行索引遷移
\i migrations/006_performance_indexes.sql

# 驗證索引已建立
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY indexname;
```

**預期結果**: 應該看到 12 個新索引

- [ ] idx_quotations_dates
- [ ] idx_quotations_status_date
- [ ] idx_products_category
- [ ] idx_quotation_items_quotation_product
- [ ] idx_customers_email_unique
- [ ] idx_quotation_shares_active
- [ ] idx_quotations_active
- [ ] idx_quotations_number_user
- [ ] idx_company_members_lookup
- [ ] idx_user_roles_lookup
- [ ] idx_quotations_amount_stats
- [ ] idx_customers_created

**驗證**:
```sql
-- 檢查索引大小
SELECT 
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%';
```

---

### ✅ 步驟 1.2: 優化連接池配置

**檔案**: `lib/db/zeabur.ts` (第 34-40 行)

**修改前**:
```typescript
pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})
```

**修改後**:
```typescript
pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 50,                           // ✅ 增加
  min: 10,                           // ✅ 新增
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,     // ✅ 增加
  maxUses: 7500,                     // ✅ 新增
})
```

- [ ] 已更新配置
- [ ] 已重啟開發伺服器
- [ ] 已驗證無連接錯誤

---

### ✅ 步驟 1.3: 修復 N+1 查詢問題

#### 1.3.1 更新 database.ts

**檔案**: `lib/services/database.ts`

在檔案末尾添加:

```typescript
/**
 * 優化: 使用 JOIN 查詢避免 N+1
 */
export async function getQuotationsWithCustomers(
  userId: string
): Promise<QuotationWithCustomer[]> {
  const result = await query(
    `SELECT 
      q.*,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'email', c.email
      ) as customers
    FROM quotations q
    LEFT JOIN customers c ON q.customer_id = c.id
    WHERE q.user_id = $1
    ORDER BY q.created_at DESC`,
    [userId]
  )
  
  return result.rows
}

export interface QuotationWithCustomer extends Quotation {
  customers: {
    id: string
    name: { zh: string; en: string }
    email: string
  } | null
}
```

- [ ] 已添加函數
- [ ] 已添加類型定義

#### 1.3.2 更新頁面組件

**檔案**: `app/[locale]/quotations/page.tsx`

**修改前** (第 28-45 行):
```typescript
const quotations = await getQuotations(user.id)

const quotationsWithCustomers = await Promise.all(
  quotations.map(async (quotation) => {
    const customer = await getCustomerById(quotation.customer_id, user.id)
    return {
      ...quotation,
      customers: customer ? { /* ... */ } : null,
    }
  })
)
```

**修改後**:
```typescript
import { getQuotationsWithCustomers } from '@/lib/services/database'

const quotations = await getQuotationsWithCustomers(user.id)
```

- [ ] 已更新 import
- [ ] 已替換查詢邏輯
- [ ] 已測試頁面載入
- [ ] 已驗證資料正確顯示

**測試**:
```bash
# 開啟頁面並檢查 Network tab
# 應該只看到 1 次資料庫往返
```

---

### ✅ 步驟 1.4: 實施分頁機制

#### 1.4.1 添加分頁函數

**檔案**: `lib/services/database.ts`

```typescript
export interface PaginationParams {
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: 'ASC' | 'DESC'
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export async function getQuotationsPaginated(
  userId: string,
  options: PaginationParams = {}
): Promise<PaginatedResult<QuotationWithCustomer>> {
  const page = Math.max(1, options.page || 1)
  const limit = Math.min(100, Math.max(1, options.limit || 20))
  const offset = (page - 1) * limit

  const [countResult, dataResult] = await Promise.all([
    query('SELECT COUNT(*) as total FROM quotations WHERE user_id = $1', [userId]),
    query(
      `SELECT q.*, jsonb_build_object('id', c.id, 'name', c.name, 'email', c.email) as customers
       FROM quotations q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.user_id = $1
       ORDER BY q.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
  ])

  const total = parseInt(countResult.rows[0].total)
  
  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  }
}
```

- [ ] 已添加類型定義
- [ ] 已添加分頁函數

#### 1.4.2 更新頁面以使用分頁

**檔案**: `app/[locale]/quotations/page.tsx`

```typescript
// 從 URL 查詢參數獲取頁碼
const searchParams = await request.nextUrl.searchParams
const page = parseInt(searchParams.get('page') || '1')

const result = await getQuotationsPaginated(user.id, { page, limit: 20 })
```

- [ ] 已更新查詢邏輯
- [ ] 已添加分頁 UI 組件
- [ ] 已測試分頁功能

---

### ✅ 步驟 1.5: 批次操作優化

**檔案**: `lib/services/database.ts`

```typescript
export async function createQuotationItemsBatch(
  quotationId: string,
  items: Array<{ product_id?: string; quantity: number; unit_price: number; discount: number; subtotal: number }>
): Promise<QuotationItem[]> {
  if (items.length === 0) return []

  const values: any[] = []
  const placeholders: string[] = []
  
  items.forEach((item, index) => {
    const i = index * 6
    placeholders.push(`($${i+1}, $${i+2}, $${i+3}, $${i+4}, $${i+5}, $${i+6})`)
    values.push(quotationId, item.product_id || null, item.quantity, item.unit_price, item.discount, item.subtotal)
  })

  const result = await query(
    `INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount, subtotal)
     VALUES ${placeholders.join(', ')}
     RETURNING *`,
    values
  )

  return result.rows
}
```

**更新 API 路由**: `app/api/quotations/route.ts`

```typescript
// 替換循環插入 (第 78-88 行)
if (items && items.length > 0) {
  await createQuotationItemsBatch(quotation.id, items)
}
```

- [ ] 已添加批次函數
- [ ] 已更新 API 路由
- [ ] 已測試建立報價單功能

---

## 階段 2: API 快取 (預計 1 天)

### ✅ 步驟 2.1: 配置 HTTP 快取標頭

**檔案**: `app/api/customers/route.ts`, `app/api/products/route.ts`, `app/api/quotations/[id]/route.ts`

在所有 GET 端點添加:

```typescript
export async function GET(request: NextRequest) {
  // ... 現有邏輯 ...
  
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'Vary': 'Authorization',
    }
  })
}
```

**需要更新的檔案**:
- [ ] app/api/customers/route.ts
- [ ] app/api/products/route.ts
- [ ] app/api/quotations/[id]/route.ts
- [ ] app/api/companies/route.ts

---

### ✅ 步驟 2.2: 靜態資源快取

**檔案**: `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}
```

- [ ] 已更新配置
- [ ] 已重新 build
- [ ] 已驗證快取標頭

---

## 階段 3: 前端優化 (預計 1 天)

### ✅ 步驟 3.1: 移除 Console 語句

**自動化方式**: 更新 `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error', 'warn'] }
      : false
  },
}
```

- [ ] 已更新配置
- [ ] 已測試生產 build
- [ ] 已驗證 console 已移除

**手動清理** (可選):
```bash
# 找出所有 console.log
grep -r "console.log" app/ lib/ --include="*.tsx" --include="*.ts" > console-report.txt

# 審查並移除不必要的
```

---

### ✅ 步驟 3.2: Code Splitting

**檔案**: `app/[locale]/quotations/page.tsx`

```typescript
import dynamic from 'next/dynamic'

const QuotationList = dynamic(() => import('./QuotationList'), {
  loading: () => <div>載入中...</div>,
  ssr: true
})
```

**需要動態導入的組件**:
- [ ] QuotationList
- [ ] CustomerList
- [ ] ProductList
- [ ] PDFDownloadButton

---

### ✅ 步驟 3.3: 圖片優化

如果有使用圖片,替換為 Next.js Image:

```typescript
import Image from 'next/image'

<Image 
  src="/logo.png" 
  alt="Logo" 
  width={100} 
  height={100}
  priority
/>
```

- [ ] 已更新所有圖片
- [ ] 已配置 image domains

---

## 階段 4: 監控設置 (預計 0.5 天)

### ✅ 步驟 4.1: 安裝 Vercel Analytics

```bash
pnpm add @vercel/analytics @vercel/speed-insights
```

**檔案**: `app/layout.tsx`

```typescript
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

- [ ] 已安裝套件
- [ ] 已添加組件
- [ ] 已驗證追蹤正常

---

### ✅ 步驟 4.2: 資料庫查詢監控

**檔案**: `lib/db/zeabur.ts`

```typescript
export async function query(text: string, params?: any[]) {
  const pool = getZeaburPool()
  const start = Date.now()
  
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    
    if (duration > 100) {
      console.warn(`🐌 Slow query (${duration}ms):`, text.substring(0, 50))
    }
    
    return result
  } catch (error) {
    console.error('❌ Query error:', error)
    throw error
  }
}
```

- [ ] 已添加監控邏輯
- [ ] 已測試慢查詢警告

---

## 效能驗證

### ✅ 測試清單

#### 資料庫效能
```bash
# 執行查詢分析
psql $ZEABUR_POSTGRES_URL << SQL
EXPLAIN ANALYZE
SELECT q.*, jsonb_build_object('id', c.id, 'name', c.name) as customers
FROM quotations q
LEFT JOIN customers c ON q.customer_id = c.id
WHERE q.user_id = 'test-id'
LIMIT 20;
SQL
```

- [ ] 查詢使用索引
- [ ] 執行時間 < 50ms
- [ ] 無 Sequential Scan

#### API 效能
```bash
# 安裝測試工具
pnpm add -D autocannon

# 測試報價單 API
autocannon -c 10 -d 10 http://localhost:3333/api/quotations
```

**期望結果**:
- [ ] Latency P50 < 200ms
- [ ] Latency P95 < 500ms
- [ ] Requests/sec > 50
- [ ] 錯誤率 = 0%

#### 前端效能

使用 Lighthouse 測試:
```bash
# Chrome DevTools > Lighthouse > Run audit
```

**目標**:
- [ ] Performance Score > 90
- [ ] FCP < 1.8s
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] TTI < 3.8s

---

## 🎯 優化效果總結

完成後填寫:

### 資料庫優化
- 查詢時間改善: ____%
- N+1 問題: ☐ 已解決
- 索引數量: 新增 _____ 個

### API 優化
- 響應時間改善: ____%
- 快取命中率: ____%
- 批次操作: ☐ 已優化

### 前端優化
- Bundle 大小減少: ____%
- FCP 改善: ____%
- Console 語句: ☐ 已清除

### 整體效果
- 頁面載入時間: 改善 ____%
- 資料庫負載: 降低 ____%
- 預估成本節省: ____%

---

## 📅 實施時間表

- **第 1 天**: 階段 1 (資料庫優化)
- **第 2 天**: 階段 2 (API 快取) + 階段 3 (前端優化)
- **第 3 天**: 階段 4 (監控) + 驗證測試

**預計完成日期**: _____________

---

**檢查清單結束** | 建立於 2025-10-21 📋
