# 性能優化 - 快速勝利指南

**快速實施高影響力的性能優化措施**

---

## 🚀 立即可實施的優化 (< 1 小時)

### 1. 資料庫連接池優化 (5 分鐘)

**檔案**: `lib/db/zeabur.ts`

```typescript
// 將第 37 行的連接池配置更新為:
pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 50,                           // ✅ 增加至 50
  min: 10,                           // ✅ 新增最小連接
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,     // ✅ 增加至 5 秒
  maxUses: 7500,                     // ✅ 連接回收
})
```

**預期效果**: 減少連接超時錯誤 80%

---

### 2. 移除生產環境 Console (10 分鐘)

**檔案**: `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error', 'warn'] }
      : false
  },
}
```

**預期效果**: 減少 Bundle 大小 5-10%, 提升執行速度 3-5%

---

### 3. 啟用 HTTP 快取 (15 分鐘)

**檔案**: `app/api/customers/route.ts`, `app/api/products/route.ts`

在所有 GET 端點的回應中添加:

```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
  }
})
```

**預期效果**: API 響應時間減少 40-60%

---

### 4. 新增關鍵資料庫索引 (20 分鐘)

**建立檔案**: `migrations/006_quick_indexes.sql`

```sql
-- 報價單日期查詢索引
CREATE INDEX CONCURRENTLY idx_quotations_dates 
ON quotations(user_id, created_at DESC);

-- 報價單狀態查詢索引
CREATE INDEX CONCURRENTLY idx_quotations_status_user 
ON quotations(user_id, status);

-- 客戶郵件查詢索引 (如果尚未存在)
CREATE INDEX CONCURRENTLY idx_customers_email_user 
ON customers(user_id, email);
```

**執行**:
```bash
psql $ZEABUR_POSTGRES_URL -f migrations/006_quick_indexes.sql
```

**預期效果**: 查詢速度提升 60-80%

---

## 🎯 中等努力優化 (2-4 小時)

### 5. 修復 N+1 查詢問題

**步驟 1**: 更新 `lib/services/database.ts`

在檔案末尾添加:

```typescript
export async function getQuotationsWithCustomers(userId: string) {
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
```

**步驟 2**: 更新 `app/[locale]/quotations/page.tsx`

```typescript
// 將第 28-45 行替換為:
const quotations = await getQuotationsWithCustomers(user.id)
```

**預期效果**: 載入時間從 1s 降至 100ms

---

### 6. 實作基本分頁

**步驟 1**: 更新 `lib/services/database.ts`

```typescript
export async function getQuotationsPaginated(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const offset = (page - 1) * limit
  
  const [countResult, dataResult] = await Promise.all([
    query('SELECT COUNT(*) FROM quotations WHERE user_id = $1', [userId]),
    query(
      `SELECT 
        q.*,
        jsonb_build_object('id', c.id, 'name', c.name, 'email', c.email) as customers
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.user_id = $1
      ORDER BY q.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
  ])
  
  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
  }
}
```

**步驟 2**: 更新前端組件以支援分頁

**預期效果**: 減少初始載入時間 70-90%

---

### 7. 批次插入優化

**更新**: `lib/services/database.ts`

```typescript
export async function createQuotationItemsBatch(
  quotationId: string,
  items: Array<{
    product_id?: string
    quantity: number
    unit_price: number
    discount: number
    subtotal: number
  }>
) {
  if (items.length === 0) return []

  const values: any[] = []
  const placeholders: string[] = []
  
  items.forEach((item, index) => {
    const i = index * 6
    placeholders.push(
      `($${i+1}, $${i+2}, $${i+3}, $${i+4}, $${i+5}, $${i+6})`
    )
    values.push(
      quotationId,
      item.product_id || null,
      item.quantity,
      item.unit_price,
      item.discount,
      item.subtotal
    )
  })

  const result = await query(
    `INSERT INTO quotation_items 
      (quotation_id, product_id, quantity, unit_price, discount, subtotal)
    VALUES ${placeholders.join(', ')}
    RETURNING *`,
    values
  )

  return result.rows
}
```

**更新**: `app/api/quotations/route.ts` (第 78-88 行)

```typescript
// 替換 for 循環為:
if (items && items.length > 0) {
  await createQuotationItemsBatch(quotation.id, items)
}
```

**預期效果**: 報價單建立速度提升 80-90%

---

## 📊 效能測試腳本

### 快速負載測試

**安裝工具**:
```bash
pnpm add -D autocannon
```

**測試報價單列表**:
```bash
autocannon -c 10 -d 10 http://localhost:3333/api/quotations \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**測試結果解讀**:
- **Latency P50**: 應 < 200ms
- **Latency P95**: 應 < 500ms
- **Requests/sec**: 應 > 50
- **Errors**: 應 = 0

---

## 🔍 性能檢查指令

### 1. 檢查資料庫索引

```sql
-- 列出所有索引
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 檢查未使用的索引
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public';
```

### 2. 檢查慢查詢

```sql
-- 啟用 pg_stat_statements (一次性)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 查看最慢的查詢
SELECT 
  substring(query, 1, 100) as query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 3. 檢查連接池狀態

```typescript
// 添加到任何 API 路由進行測試
console.log({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount
})
```

### 4. 檢查 Bundle 大小

```bash
# 分析 Bundle
pnpm build

# 查看 .next/static/chunks 目錄
ls -lh .next/static/chunks/*.js | sort -k5 -h -r | head -10
```

---

## 📈 優化效果追蹤

### 優化前基準測試 (建議記錄)

```bash
# 1. 記錄當前 API 響應時間
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3333/api/quotations

# curl-format.txt 內容:
# time_total: %{time_total}s
# time_namelookup: %{time_namelookup}s
# time_connect: %{time_connect}s

# 2. 記錄頁面載入時間
# 使用 Chrome DevTools > Network > Disable cache

# 3. 記錄資料庫查詢數
# 在 lib/db/zeabur.ts 中添加計數器
```

### 優化後驗證

建立檢查清單:

- [ ] API 響應時間減少 > 40%
- [ ] 頁面載入時間減少 > 50%
- [ ] 資料庫查詢次數減少 > 60%
- [ ] Bundle 大小減少 > 20%
- [ ] 無新增錯誤或警告

---

## 🎯 優先順序建議

### 第 1 天 (最高優先級)

1. ✅ 資料庫連接池優化
2. ✅ 新增關鍵索引
3. ✅ 修復 N+1 查詢

**預期總效果**: 70-80% 性能提升

### 第 2 天 (高優先級)

4. ✅ 實作分頁
5. ✅ 批次插入優化
6. ✅ HTTP 快取

**預期總效果**: 額外 20-30% 性能提升

### 第 3 天 (中優先級)

7. ✅ 移除 Console
8. ✅ Code Splitting
9. ✅ 效能監控

**預期總效果**: 額外 10-15% 性能提升

---

## 🚨 常見陷阱

### 1. 過早優化
❌ 不要優化尚未測量的部分  
✅ 先測量,再優化,然後驗證

### 2. 快取過度
❌ 不要快取所有東西  
✅ 只快取讀多寫少的資料

### 3. 索引過多
❌ 不要為所有欄位建立索引  
✅ 只為經常查詢的欄位建立索引

### 4. 忽略監控
❌ 不要只優化一次就停止  
✅ 持續監控和調整

---

## 📞 遇到問題?

1. **資料庫連接錯誤**: 檢查 `ZEABUR_POSTGRES_URL` 環境變數
2. **查詢變慢**: 使用 `EXPLAIN ANALYZE` 分析查詢計畫
3. **快取不生效**: 檢查 Redis 連接和 TTL 配置
4. **Bundle 過大**: 使用 `next build --debug` 分析

---

**快速勝利指南結束** | 預計實施時間: 1-3 天 🚀
