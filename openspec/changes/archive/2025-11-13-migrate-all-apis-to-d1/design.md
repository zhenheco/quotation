# Design: 資料庫統一架構設計

## 架構決策 (Architectural Decisions)

### AD-1: 選擇 Cloudflare D1 作為主要業務資料庫

**決策**: 所有業務資料（quotations, customers, products, contracts, payments）統一使用 Cloudflare D1

**理由**:
1. **部署環境一致性**: 應用部署在 Cloudflare Workers，D1 為原生資料庫
2. **低延遲**: D1 與 Workers 在同一資料中心，無需外部網路請求
3. **成本效益**: D1 免費額度充足，Supabase 需要額外費用
4. **簡化架構**: 單一資料來源，減少同步問題

**取捨**:
- ✅ 優勢: 效能、成本、一致性
- ❌ 劣勢: D1 功能較 PostgreSQL 受限（無 JOIN、無 RPC）
- ⚖️ 緩解: 使用 DAL 層抽象化複雜查詢

### AD-2: 保留 Supabase 用於認證

**決策**: Supabase Auth 繼續使用，不遷移至其他方案

**理由**:
1. **穩定性**: Auth 系統已運作良好，風險低
2. **功能完整**: Supabase Auth 提供 OAuth、Email、Magic Link 等
3. **獨立性**: Auth 不依賴業務資料，可獨立運作

**未來考量**: 可評估遷移至 Cloudflare Access 或自建 Auth

### AD-3: DAL 層設計模式

**決策**: 使用 Data Access Layer (DAL) 封裝所有資料庫操作

**模式**:
```typescript
// lib/dal/[resource].ts
export async function getResource(db: D1Client, userId: string): Promise<Resource[]> {
  return await db.query<Resource>(
    'SELECT * FROM resources WHERE user_id = ?',
    [userId]
  )
}
```

**優勢**:
- 統一介面，易於測試
- 資料庫邏輯集中管理
- 未來可輕鬆切換資料庫

## 資料模型設計 (Data Model)

### Analytics 查詢模式

#### 營收趨勢 (Revenue Trend)
```sql
-- 按月份分組統計
SELECT
  strftime('%Y-%m', issue_date) as month,
  SUM(CASE WHEN status = 'signed' THEN total_amount ELSE 0 END) as revenue,
  COUNT(*) as count
FROM quotations
WHERE user_id = ?
  AND issue_date >= ?
GROUP BY month
ORDER BY month
```

#### 貨幣分布 (Currency Distribution)
```sql
-- 按貨幣統計
SELECT
  currency,
  SUM(total_amount) as value,
  COUNT(*) as count
FROM quotations
WHERE user_id = ?
  AND status = 'signed'
GROUP BY currency
```

#### 狀態統計 (Status Statistics)
```sql
-- 按狀態統計
SELECT
  status,
  COUNT(*) as count,
  SUM(total_amount) as value
FROM quotations
WHERE user_id = ?
GROUP BY status
```

### Payments 統計查詢

```sql
-- 本月收款統計
SELECT
  SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as total_collected,
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
  SUM(CASE WHEN status = 'pending' AND payment_date < date('now') THEN amount ELSE 0 END) as total_overdue,
  currency
FROM payments
WHERE user_id = ?
  AND strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')
GROUP BY currency
```

## API 設計模式 (API Design Pattern)

### 標準 API Route 結構

```typescript
import { createApiClient } from '@/lib/supabase/api'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { [dalFunction] } from '@/lib/dal/[resource]'

export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext()

  try {
    // 1. 認證（使用 Supabase）
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 授權檢查（使用 KV + D1）
    const kv = getKVCache(env)
    const db = getD1Client(env)
    const hasPermission = await checkPermission(kv, db, user.id, 'resource:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. 資料查詢（使用 D1）
    const data = await [dalFunction](db, user.id)

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
```

## 錯誤處理 (Error Handling)

### DAL 層錯誤
```typescript
export async function getResource(db: D1Client, userId: string): Promise<Resource[]> {
  try {
    return await db.query<Resource>('SELECT ...', [userId])
  } catch (error) {
    console.error('DAL error:', error)
    throw new Error(`Failed to fetch resources: ${(error as Error).message}`)
  }
}
```

### API 層錯誤
- 400 Bad Request: 缺少必填參數
- 401 Unauthorized: 未登入
- 403 Forbidden: 權限不足
- 404 Not Found: 資源不存在
- 500 Internal Server Error: 資料庫錯誤

## 效能考量 (Performance Considerations)

### 查詢優化
1. **索引**: 確保 D1 表格有適當索引（user_id, issue_date, status 等）
2. **批次查詢**: 盡量減少資料庫往返次數
3. **快取**: 使用 KV 快取常用查詢結果（權限、統計等）

### 監控指標
- API 回應時間
- D1 查詢執行時間
- 錯誤率

## 測試策略 (Testing Strategy)

### 單元測試
- DAL 函式測試（使用 mock D1Client）
- 商業邏輯測試

### 整合測試
- API routes 端到端測試
- 資料一致性驗證

### 效能測試
- 大量資料查詢測試
- 並發請求測試

## 遷移清單 (Migration Checklist)

### Analytics APIs
- [x] 分析現有 Supabase 查詢
- [ ] 建立 D1 等效 SQL
- [ ] 實作 DAL 函式
- [ ] 改寫 API routes
- [ ] 測試資料一致性

### Batch Operations
- [x] 分析批次操作邏輯
- [ ] 實作 DAL 函式
- [ ] 改寫 API routes
- [ ] 測試批次功能

### Payments Statistics
- [x] 分析 Supabase RPC 邏輯
- [ ] 轉換為 D1 SQL
- [ ] 實作 DAL 函式
- [ ] 改寫 API route
- [ ] 測試統計準確性

## 回滾計畫 (Rollback Plan)

如果遷移出現問題：
1. 恢復原始 Supabase 程式碼（從 git history）
2. 部署前一個穩定版本
3. 記錄問題並調整方案

## 未來改進 (Future Improvements)

1. **查詢快取**: 使用 Cloudflare KV 快取常用統計資料
2. **即時更新**: 使用 WebSocket 推送資料更新
3. **分析儀表板**: 新增更多分析維度和圖表
4. **資料導出**: 支援 CSV/Excel 導出
