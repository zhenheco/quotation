# Design: 完整遷移至 Cloudflare D1 架構設計

## 架構概覽

### 目標架構

```
┌─────────────────────────────────────────────────────────────────┐
│                         使用者請求                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Cloudflare Workers (Edge Runtime)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           Next.js App (OpenNext)                           │ │
│  │  - API Routes (56 個)                                       │ │
│  │  - Middleware (Session 刷新)                                │ │
│  │  - SSR Pages                                                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Supabase     │ │ Cloudflare   │ │ Cloudflare   │ │ Cloudflare   │
│ Auth         │ │ D1           │ │ KV           │ │ Analytics    │
│              │ │              │ │              │ │ Engine       │
├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤
│ 🔐 認證       │ │ 📊 資料庫     │ │ ⚡ 快取       │ │ 📈 監控       │
│              │ │              │ │              │ │              │
│ - OAuth      │ │ 17 張表:     │ │ 熱資料:      │ │ API 統計     │
│ - Email/PWD  │ │ • customers  │ │ • permissions│ │ 錯誤追蹤     │
│ - Session    │ │ • products   │ │ • exchange   │ │ 效能監控     │
│ - 密碼重設    │ │ • quotations │ │   rates      │ │              │
│              │ │ • companies  │ │ • companies  │ │              │
│ 免費:        │ │ • contracts  │ │ TTL: 1-24hr  │ │ 免費:        │
│ 50K MAU      │ │ • payments   │ │              │ │ 10M events   │
│              │ │ • roles      │ │ 免費:        │ │              │
│              │ │ • permissions│ │ 100K reads   │ │              │
│              │ │ • audit_logs │ │              │ │              │
│              │ │ • ...        │ │              │ │              │
│              │ │              │ │              │ │              │
│              │ │ 免費:        │ │              │ │              │
│              │ │ 100K reads   │ │              │ │              │
│              │ │ 1K writes    │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### 資料流向

#### 1. 認證流程 (保持不變)
```
使用者 → Supabase Auth → JWT Token → Workers 驗證 → 允許存取
```

#### 2. 資料查詢流程 (新)
```
API 請求
    ↓
認證檢查 (Supabase Auth)
    ↓
權限檢查 (KV cached)
    ├─ 命中 → 返回權限 (1-2ms)
    └─ 未命中 → 查詢 D1 (30ms)
                 ↓
                寫入 KV (TTL: 1小時)
    ↓
業務資料查詢 (DAL → D1)
    ↓
返回 JSON
```

#### 3. Analytics 查詢流程 (複雜聚合)
```
/api/analytics/dashboard-stats
    ↓
並行查詢 D1:
    ├─ 報價單統計 (quotations)
    ├─ 合約統計 (customer_contracts)
    ├─ 付款統計 (payments) - 應用層聚合
    ├─ 客戶統計 (customers)
    └─ 產品統計 (products)
    ↓
應用層合併 + 計算
    ↓
返回完整統計數據
```

## 核心設計決策

### 決策 1: 保留 Supabase Auth

**理由**:
- 成熟穩定的 OAuth 整合
- 免費額度 (50K MAU) 足夠
- 遷移認證風險高,無明顯收益
- Email 驗證和密碼重設功能完善

**不包含**: Supabase 資料庫查詢

### 決策 2: D1 作為唯一資料來源

**優勢**:
- 在 Cloudflare Workers 環境原生支援
- 低延遲 (與 Workers 同機房)
- 免費額度充足 (100K reads/day)
- SQLite 效能優異

**挑戰**:
- PostgreSQL → SQLite 語法差異
- 需重寫複雜的 RPC functions
- 並發寫入限制 (樂觀鎖定)

**解決方案**:
- DAL 層抽象化資料庫操作
- RPC function → 多查詢 + 應用層聚合
- 使用 D1 batch API

### 決策 3: KV 快取熱資料

**快取策略**:
1. **權限資料** (TTL: 1小時)
   - 每次 API 請求都需要
   - 查詢成本高 (3-5 次 JOIN)

2. **匯率資料** (TTL: 24小時)
   - 讀取極頻繁
   - 每日更新一次

3. **公司設定** (TTL: 2小時)
   - PDF 生成需要
   - 更新不頻繁

**不快取**:
- 報價單、合約、付款等交易資料
- 需要強一致性的資料

### 決策 4: DAL 模式

**設計原則**:
- 所有資料庫操作透過 DAL 函式
- 強制 `userId` 參數 (多租戶隔離)
- 自動處理 JSON 欄位序列化
- 統一錯誤處理

**範例**:
```typescript
// lib/dal/customers.ts
export async function getCustomers(
  db: D1Client,
  userId: string
): Promise<Customer[]> {
  const rows = await db.query<RawCustomer>(
    'SELECT * FROM customers WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  )

  return rows.map(row => ({
    ...row,
    name: JSON.parse(row.name), // 自動解析 JSON
    address: JSON.parse(row.address)
  }))
}
```

## 技術挑戰與解決方案

### 挑戰 1: Supabase RPC Functions 遷移

**問題**: PostgreSQL RPC function `get_payment_statistics` 包含複雜 SQL

**原 SQL** (Supabase):
```sql
CREATE OR REPLACE FUNCTION get_payment_statistics()
RETURNS TABLE (
  total_collected DECIMAL(15,2),
  pending_amount DECIMAL(15,2),
  overdue_amount DECIMAL(15,2),
  ...
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END),
    SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END),
    SUM(CASE WHEN status = 'pending' AND due_date < NOW() THEN amount ELSE 0 END)
  FROM payments
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**新實作** (D1 + 應用層):
```typescript
// lib/dal/payments.ts
export async function getPaymentStatistics(
  db: D1Client,
  userId: string
): Promise<PaymentStatistics> {
  // 查詢所有付款記錄
  const payments = await db.query<Payment>(
    `SELECT amount, status, due_date, currency
     FROM payments
     WHERE user_id = ?`,
    [userId]
  )

  const now = new Date()

  // 應用層聚合
  const stats = payments.reduce((acc, p) => {
    const amount = p.amount

    if (p.status === 'confirmed') {
      acc.totalCollected += amount
    } else if (p.status === 'pending') {
      acc.pendingAmount += amount

      if (new Date(p.due_date) < now) {
        acc.overdueAmount += amount
      }
    }

    return acc
  }, {
    totalCollected: 0,
    pendingAmount: 0,
    overdueAmount: 0
  })

  return stats
}
```

**優勢**:
- 更容易測試
- 更容易理解和維護
- 可擴展 (如幣別轉換)

**劣勢**:
- 需要傳輸所有記錄 (但資料量不大)
- 應用層計算 (但邏輯簡單)

### 挑戰 2: 並發寫入處理

**問題**: SQLite 寫入鎖定

**解決方案**:
1. **樂觀鎖定** (版本號)
```typescript
// lib/dal/quotations.ts
export async function updateQuotation(
  db: D1Client,
  id: string,
  data: UpdateQuotationData,
  userId: string
): Promise<Quotation> {
  // 1. 讀取當前版本
  const current = await db.queryOne<{ version: number }>(
    'SELECT version FROM quotations WHERE id = ? AND user_id = ?',
    [id, userId]
  )

  if (!current) {
    throw new Error('Quotation not found')
  }

  // 2. 更新 (帶版本檢查)
  const result = await db.execute(
    `UPDATE quotations
     SET ..., version = version + 1, updated_at = datetime('now')
     WHERE id = ? AND user_id = ? AND version = ?`,
    [..., id, userId, current.version]
  )

  if (result.rowsAffected === 0) {
    throw new Error('Concurrent modification detected')
  }

  // 3. 返回更新後的資料
  return getQuotationById(db, id, userId)
}
```

2. **重試機制** (指數退避)
```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error

      const delay = Math.pow(2, i) * 100
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error('Max retries exceeded')
}
```

3. **D1 Batch API** (批次操作)
```typescript
export async function batchDeleteQuotations(
  db: D1Client,
  quotationIds: string[],
  userId: string
): Promise<number> {
  // 使用 D1 batch API
  const statements = quotationIds.flatMap(id => [
    db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').bind(id),
    db.prepare('DELETE FROM quotations WHERE id = ? AND user_id = ?').bind(id, userId)
  ])

  const results = await db.batch(statements)

  return results.reduce((sum, r) => sum + r.rowsAffected, 0)
}
```

### 挑戰 3: 複雜 Analytics 查詢

**問題**: Dashboard 需要多表 JOIN 和聚合

**解決方案**: 並行查詢 + 應用層合併

```typescript
// lib/dal/analytics.ts
export async function getDashboardStats(
  db: D1Client,
  userId: string
): Promise<DashboardStats> {
  // 並行查詢各表統計
  const [
    quotationsStats,
    contractsStats,
    paymentsStats,
    customersCount,
    productsCount
  ] = await Promise.all([
    db.query(`
      SELECT status, COUNT(*) as count, SUM(total_amount) as total
      FROM quotations
      WHERE user_id = ?
      GROUP BY status
    `, [userId]),

    db.query(`
      SELECT status, COUNT(*) as count
      FROM customer_contracts
      WHERE user_id = ?
      GROUP BY status
    `, [userId]),

    getPaymentStatistics(db, userId),

    db.queryOne(`SELECT COUNT(*) as count FROM customers WHERE user_id = ?`, [userId]),

    db.queryOne(`SELECT COUNT(*) as count FROM products WHERE user_id = ?`, [userId])
  ])

  // 應用層合併
  return {
    quotations: {
      total: quotationsStats.reduce((sum, s) => sum + s.count, 0),
      byStatus: Object.fromEntries(quotationsStats.map(s => [s.status, s.count])),
      totalValue: quotationsStats.reduce((sum, s) => sum + (s.total || 0), 0)
    },
    contracts: {
      total: contractsStats.reduce((sum, s) => sum + s.count, 0),
      byStatus: Object.fromEntries(contractsStats.map(s => [s.status, s.count]))
    },
    payments: paymentsStats,
    customers: customersCount.count,
    products: productsCount.count
  }
}
```

**優勢**:
- 並行查詢 (減少總延遲)
- 可利用 KV 快取部分結果
- 易於擴展新指標

## 資料庫 Schema 轉換

### PostgreSQL → SQLite 類型映射

| PostgreSQL | SQLite | 轉換邏輯 |
|-----------|--------|---------|
| `UUID` | `TEXT` | `crypto.randomUUID()` |
| `JSONB` | `TEXT` | `JSON.stringify()` / `JSON.parse()` |
| `DECIMAL(12,2)` | `REAL` | 直接轉換 |
| `TIMESTAMP` | `TEXT` | ISO-8601 格式 |
| `BOOLEAN` | `INTEGER` | 0/1 |
| `INET` | `TEXT` | IP 字串 |

### 特殊處理

#### JSONB 欄位
```sql
-- PostgreSQL
name JSONB NOT NULL

-- SQLite
name TEXT NOT NULL

-- DAL 層自動處理
const row = await db.queryOne<{ name: string }>('SELECT name FROM customers WHERE id = ?', [id])
const customer = {
  ...row,
  name: JSON.parse(row.name) // { zh: '客戶名稱', en: 'Customer Name' }
}
```

#### 時間戳
```sql
-- PostgreSQL
created_at TIMESTAMP DEFAULT NOW()

-- SQLite
created_at TEXT DEFAULT (datetime('now'))

-- 應用層
const now = new Date().toISOString()
await db.execute('INSERT INTO customers (..., created_at) VALUES (?, ?)', [..., now])
```

#### 外鍵約束
```sql
-- PostgreSQL
customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE

-- SQLite
customer_id TEXT NOT NULL,
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
```

## 效能優化策略

### 1. KV 快取分層

**L1: 極熱資料** (1 小時 TTL)
- 使用者權限
- 當前公司設定

**L2: 熱資料** (24 小時 TTL)
- 匯率
- 角色權限映射

**不快取**:
- 交易資料 (報價單、合約、付款)
- 需要即時性的資料

### 2. D1 查詢優化

**建立索引**:
```sql
-- 高頻查詢的欄位
CREATE INDEX idx_quotations_user_status ON quotations(user_id, status);
CREATE INDEX idx_payments_user_status ON payments(user_id, status);
CREATE INDEX idx_contracts_user_status ON customer_contracts(user_id, status);

-- 日期範圍查詢
CREATE INDEX idx_quotations_date ON quotations(user_id, created_at);
CREATE INDEX idx_payments_date ON payments(user_id, payment_date);

-- JOIN 優化
CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX idx_company_members_company ON company_members(company_id);
```

**查詢優化**:
```typescript
// ❌ 不好: N+1 查詢
for (const quotation of quotations) {
  quotation.items = await getQuotationItems(db, quotation.id)
}

// ✅ 好: 批次查詢
const quotationIds = quotations.map(q => q.id)
const allItems = await db.query(
  `SELECT * FROM quotation_items WHERE quotation_id IN (${quotationIds.map(() => '?').join(',')})`,
  quotationIds
)
const itemsMap = groupBy(allItems, 'quotation_id')
quotations.forEach(q => q.items = itemsMap[q.id] || [])
```

### 3. 並行處理

```typescript
// ✅ 並行查詢
const [quotations, customers, products] = await Promise.all([
  getQuotations(db, userId),
  getCustomers(db, userId),
  getProducts(db, userId)
])

// ❌ 串行查詢
const quotations = await getQuotations(db, userId)
const customers = await getCustomers(db, userId)
const products = await getProducts(db, userId)
```

## 錯誤處理策略

### 分層錯誤處理

**DAL 層**:
- 拋出明確的 Error
- 不處理認證/權限

```typescript
export async function getQuotationById(
  db: D1Client,
  id: string,
  userId: string
): Promise<Quotation | null> {
  try {
    const quotation = await db.queryOne<Quotation>(
      'SELECT * FROM quotations WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    if (!quotation) {
      return null // 不拋錯,返回 null
    }

    return parseQuotation(quotation)
  } catch (error) {
    // 重新拋出明確錯誤
    throw new Error(`Failed to get quotation: ${error.message}`)
  }
}
```

**API 層**:
- 處理認證/權限
- 轉換錯誤為 HTTP 回應

```typescript
export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getD1Client(env)
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const quotations = await getQuotations(db, user.id)

    return NextResponse.json({ quotations })
  } catch (error) {
    console.error('Error in GET /api/quotations:', error)
    return NextResponse.json({
      error: getErrorMessage(error)
    }, { status: 500 })
  }
}
```

## 測試策略

### 單元測試 (DAL 層)

使用 Mock D1:
```typescript
// __tests__/dal/customers.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createD1Mock } from '../mocks/d1'
import * as customersDal from '@/lib/dal/customers'

describe('Customers DAL', () => {
  let db: ReturnType<typeof createD1Mock>

  beforeEach(() => {
    db = createD1Mock()
  })

  it('should get customers by user ID', async () => {
    const mockCustomers = [
      { id: '1', userId: 'user1', name: '{"zh":"客戶A"}', email: 'a@example.com' }
    ]
    db.setMockData('customers', mockCustomers)

    const result = await customersDal.getCustomers(db as any, 'user1')

    expect(result).toHaveLength(1)
    expect(result[0].name).toEqual({ zh: '客戶A' })
  })
})
```

### 整合測試 (API 端點)

使用真實 D1 Local:
```typescript
// __tests__/api/quotations.test.ts
describe('Quotations API', () => {
  beforeAll(async () => {
    // 設定本地 D1
    await setupLocalD1()
  })

  it('should return quotations for authenticated user', async () => {
    const response = await fetch('http://localhost:3000/api/quotations', {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data.quotations)).toBe(true)
  })
})
```

## 監控與可觀測性

### Cloudflare Analytics

自動收集:
- 請求量
- 錯誤率
- CPU 時間
- 回應時間

### 自定義指標

```typescript
// lib/observability/metrics.ts
export async function trackCacheHit(
  env: Env,
  key: string,
  hit: boolean
) {
  await env.ANALYTICS.writeDataPoint({
    blobs: [key, hit ? 'HIT' : 'MISS'],
    doubles: [hit ? 1 : 0],
    indexes: ['cache_performance']
  })
}

// 使用
const cached = await kv.get(key)
await trackCacheHit(env, key, cached !== null)
```

### 日誌監控

```bash
# 即時日誌
wrangler tail quotation-system --format pretty

# 過濾錯誤
wrangler tail quotation-system | grep ERROR

# 查看特定時間
wrangler tail quotation-system --since 2025-01-15T10:00:00Z
```

## 安全考量

### 1. 多租戶隔離

強制 `userId` 參數:
```typescript
// ✅ 好
export async function getQuotations(db: D1Client, userId: string)

// ❌ 壞
export async function getAllQuotations(db: D1Client)
```

### 2. SQL Injection 防護

使用參數化查詢:
```typescript
// ✅ 好
await db.query('SELECT * FROM quotations WHERE user_id = ?', [userId])

// ❌ 壞
await db.query(`SELECT * FROM quotations WHERE user_id = '${userId}'`)
```

### 3. 權限檢查

每個 API 必須檢查:
```typescript
const hasPermission = await checkPermission(kv, db, user.id, 'resource:action')
if (!hasPermission) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

## 總結

本設計提供:
1. ✅ 清晰的架構分層
2. ✅ 可擴展的 DAL 模式
3. ✅ 完整的錯誤處理
4. ✅ 效能優化策略
5. ✅ 安全性保障
6. ✅ 可測試性

遵循本設計文檔,可以系統性、無遺漏地完成資料庫遷移。
