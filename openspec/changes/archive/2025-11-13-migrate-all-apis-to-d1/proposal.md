# Proposal: 將所有業務資料 API 遷移至 Cloudflare D1

## 問題陳述 (Problem Statement)

系統目前同時使用兩個資料庫來源：
1. **Cloudflare D1** - 報價單列表、客戶、產品等業務 APIs
2. **Supabase PostgreSQL** - 儀表板 Analytics APIs、批次操作等

這導致嚴重的資料不一致問題：
- **儀表板顯示有營收數據**（來自 Supabase 測試資料）
- **報價單列表為空**（查詢 D1 資料庫）
- 使用者困惑：明明看到有數據，為何列表是空的？

## 目標 (Goals)

1. **資料一致性**：所有業務資料查詢統一使用 Cloudflare D1
2. **簡化架構**：移除雙資料庫依賴，降低維護成本
3. **效能優化**：利用 D1 在 Cloudflare Workers 環境的原生優勢
4. **保留 Supabase Auth**：認證系統繼續使用 Supabase

## 範圍 (Scope)

### 包含 (In Scope)
- 遷移 5 個 Analytics API routes 至 D1
- 遷移 Quotations Batch 操作至 D1
- 遷移 Payments Statistics API 至 D1
- 遷移 Contracts API 至 D1
- 建立新的 DAL 函式支援 Analytics 查詢
- 建立新的 DAL 函式支援 Batch 操作
- 建立新的 DAL 函式支援 Payments 統計

### 不包含 (Out of Scope)
- Supabase Auth 系統（保留）
- 使用者管理相關的 Admin APIs（評估後決定）
- Storage 和檔案上傳功能

## 受影響的 API

### 高優先級（導致資料不一致）
1. `/api/analytics/dashboard-summary` - 儀表板摘要
2. `/api/analytics/dashboard-stats` - 儀表板統計
3. `/api/analytics/revenue-trend` - 營收趨勢
4. `/api/analytics/currency-distribution` - 貨幣分布
5. `/api/analytics/status-statistics` - 狀態統計

### 中優先級
6. `/api/quotations/batch/status` - 批次更新狀態
7. `/api/quotations/batch/delete` - 批次刪除
8. `/api/payments/statistics` - 付款統計
9. `/api/contracts` (GET/POST) - 合約列表和建立

## 技術方案 (Technical Approach)

### 新增 DAL 模組
1. **`lib/dal/analytics.ts`** - Analytics 查詢函式
   - `getRevenueTrend(db, userId, months)`
   - `getCurrencyDistribution(db, userId)`
   - `getStatusStatistics(db, userId)`
   - `getDashboardSummary(db, userId)`
   - `getDashboardStats(db, userId)`

2. **`lib/dal/payments.ts`** 擴充
   - `getPaymentStatistics(db, userId)` - 替代 Supabase RPC

3. **`lib/dal/quotations.ts`** 擴充
   - `batchUpdateQuotationStatus(db, userId, ids, status)`
   - `batchDeleteQuotations(db, userId, ids)`

### API Routes 改寫模式

**Before (Supabase)**:
```typescript
const { data: quotations } = await supabase
  .from('quotations')
  .select('total_amount, status')
  .eq('user_id', user.id)
```

**After (D1)**:
```typescript
import { getD1Client } from '@/lib/db/d1-client'
import { getQuotations } from '@/lib/dal/quotations'

const { env } = await getCloudflareContext()
const db = getD1Client(env)
const quotations = await getQuotations(db, user.id)
```

## 實作階段 (Implementation Phases)

### Phase 1: Analytics APIs（最高優先）
建立 Analytics DAL 並遷移所有 5 個 Analytics API routes

### Phase 2: Payments Statistics
擴充 Payments DAL 並遷移 Payments Statistics API

### Phase 3: Batch Operations
擴充 Quotations DAL 並遷移 2 個 Batch API routes

### Phase 4: Contracts API
遷移 Contracts API 至使用現有的 Contracts DAL

### Phase 5: 驗證和清理
- 全面測試所有改動
- 移除未使用的 Supabase 查詢程式碼
- 更新文件

## 風險與緩解 (Risks & Mitigation)

### 風險
1. **資料遷移**：D1 資料庫可能為空或不完整
2. **SQL 語法差異**：PostgreSQL vs SQLite
3. **效能差異**：查詢效能可能不同

### 緩解措施
1. 先在測試環境驗證 D1 資料
2. 逐步遷移，每個 Phase 獨立測試
3. 保留 Supabase 程式碼作為參考（註解）
4. 新增完整的單元測試和整合測試

## 成功標準 (Success Criteria)

- [ ] 儀表板數據與報價單列表一致
- [ ] 所有 Analytics 圖表顯示正確數據
- [ ] Batch 操作功能正常
- [ ] Payments 統計準確
- [ ] 所有測試通過
- [ ] 文件更新完成

## 相依性 (Dependencies)

- Cloudflare D1 資料庫已部署且包含業務資料
- 現有 DAL 層（quotations, customers, products, contracts, payments）運作正常
- Cloudflare Workers 環境配置正確

## 時程估計 (Timeline)

- Phase 1: 2-3 小時（Analytics）
- Phase 2: 1 小時（Payments Statistics）
- Phase 3: 1-2 小時（Batch Operations）
- Phase 4: 0.5 小時（Contracts）
- Phase 5: 1-2 小時（測試和清理）

**總計**: 5.5-8.5 小時
