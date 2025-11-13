# Proposal: 完整遷移至 Cloudflare D1 - 消除所有 Supabase 資料庫依賴

## 問題陳述 (Problem Statement)

系統目前處於**部分遷移狀態**,同時使用兩個資料庫來源:

1. **Cloudflare D1** - 22/56 個 API 端點 (39%)
   - Customers, Products, Quotations, Companies, Exchange Rates

2. **Supabase PostgreSQL** - 34/56 個 API 端點 (61%)
   - Analytics APIs (5個)
   - Contracts APIs (5個)
   - Payments APIs (6個)
   - Admin APIs (6個)
   - Batch Operations (3個)
   - 其他輔助 APIs (9個)

### 嚴重問題

1. **資料不一致**: 儀表板顯示 Supabase 測試資料,但報價單列表查詢 D1 (空的)
2. **架構複雜**: 雙資料庫維護成本高
3. **效能損耗**: 無法充分利用 D1 + KV 快取優勢
4. **技術債**: 126 個檔案仍在使用 `@supabase/supabase-js`
5. **不一致的程式碼**: 新舊兩種 API 寫法混雜

## 目標 (Goals)

### 主要目標
1. **100% D1 資料存取**: 所有業務資料統一使用 Cloudflare D1
2. **保留 Supabase Auth**: 僅用於 OAuth 認證,不存取資料庫表
3. **無遺漏遷移**: 系統性檢查所有檔案,確保無殘留

### 次要目標
4. **統一程式碼風格**: 所有 API 使用相同的 DAL + KV 模式
5. **清理技術債**: 移除未使用的 Supabase import 和程式碼
6. **文檔更新**: 更新所有開發指南和 README

## 範圍 (Scope)

### 包含 (In Scope)

#### 1. Analytics APIs (5 個端點) - **最高優先級**
- `/api/analytics/dashboard-summary`
- `/api/analytics/dashboard-stats`
- `/api/analytics/revenue-trend`
- `/api/analytics/currency-distribution`
- `/api/analytics/status-statistics`

**問題**: 導致資料不一致,使用者困惑

#### 2. Contracts APIs (5+ 個端點)
- `/api/contracts` (GET, POST)
- `/api/contracts/[id]` (GET, PUT, DELETE)
- `/api/contracts/from-quotation`
- `/api/contracts/overdue`
- `/api/contracts/[id]/next-collection`
- `/api/contracts/[id]/payment-progress`

#### 3. Payments APIs (6+ 個端點)
- `/api/payments` (GET, POST)
- `/api/payments/[id]` (GET, PUT, DELETE)
- `/api/payments/statistics` - **使用 Supabase RPC**
- `/api/payments/unpaid`
- `/api/payments/collected`
- `/api/payments/reminders`
- `/api/payments/[id]/mark-overdue`

#### 4. Batch Operations (3 個端點)
- `/api/quotations/batch/status`
- `/api/quotations/batch/delete`
- `/api/quotations/batch/send`

#### 5. Admin APIs (6+ 個端點)
- `/api/admin/users` (GET, POST)
- `/api/admin/users/[id]/role` (PUT)
- `/api/admin/companies` (GET, POST)
- `/api/admin/companies/[id]` (GET, PUT, DELETE)
- `/api/admin/companies/[id]/members` (GET, POST, DELETE)
- `/api/admin/stats`

#### 6. RBAC 與權限 APIs
- `/api/rbac/check-permission`
- `/api/rbac/user-profile`
- `/api/user/permissions`
- `/api/user/companies`

#### 7. 輔助 APIs
- `/api/company-settings`
- `/api/company/manageable`
- `/api/company/[id]/members`
- `/api/seed-test-data` (測試用)

#### 8. 程式碼清理
- **移除**:
  - 126 個檔案中未使用的 `import { createClient } from '@supabase/supabase-js'`
  - 所有 `supabase.from()` 和 `supabase.rpc()` 查詢
  - Supabase RPC functions 程式碼參考

- **保留**:
  - ✅ `lib/auth.ts` - Supabase Auth
  - ✅ `lib/supabase/server.ts` - 認證用
  - ✅ `lib/supabase/api.ts` - 認證用
  - ✅ `middleware.ts` - Session 刷新
  - ✅ `app/auth/callback/route.ts` - OAuth callback

### 不包含 (Out of Scope)

- ❌ **Supabase Auth 系統** - 完全保留
- ❌ **OAuth 登入流程** - 不更動
- ❌ **Session 管理** - 繼續使用 Supabase
- ❌ **Storage/R2 遷移** - 另外規劃

## 受影響的檔案清單

### 需要完全重寫的 API Routes (34 個)

```
app/api/analytics/dashboard-summary/route.ts
app/api/analytics/dashboard-stats/route.ts
app/api/analytics/revenue-trend/route.ts
app/api/analytics/currency-distribution/route.ts
app/api/analytics/status-statistics/route.ts

app/api/contracts/route.ts
app/api/contracts/from-quotation/route.ts
app/api/contracts/overdue/route.ts
app/api/contracts/[id]/next-collection/route.ts
app/api/contracts/[id]/payment-progress/route.ts

app/api/payments/route.ts
app/api/payments/statistics/route.ts
app/api/payments/unpaid/route.ts
app/api/payments/collected/route.ts
app/api/payments/reminders/route.ts
app/api/payments/[id]/mark-overdue/route.ts

app/api/quotations/batch/status/route.ts
app/api/quotations/batch/delete/route.ts
app/api/quotations/batch/send/route.ts

app/api/admin/users/route.ts
app/api/admin/users/[id]/role/route.ts
app/api/admin/companies/route.ts
app/api/admin/companies/[id]/route.ts
app/api/admin/companies/[id]/members/route.ts
app/api/admin/stats/route.ts

app/api/rbac/check-permission/route.ts
app/api/rbac/user-profile/route.ts
app/api/user/permissions/route.ts
app/api/user/companies/route.ts

app/api/company-settings/route.ts
app/api/company/manageable/route.ts
app/api/company/[id]/members/route.ts

app/api/seed-test-data/route.ts
```

### 需要新建的 DAL 模組

```
lib/dal/analytics.ts - Analytics 查詢函式 (NEW)
lib/dal/admin.ts - Admin 統計和管理 (NEW)
lib/dal/batch.ts - 批次操作 (NEW)
```

### 需要擴充的 DAL 模組

```
lib/dal/contracts.ts - 新增 overdue, next-collection, payment-progress
lib/dal/payments.ts - 新增 statistics, unpaid, collected, reminders, mark-overdue
lib/dal/quotations.ts - 新增 batch operations
lib/dal/rbac.ts - 新增 user-profile, check-permission
lib/dal/companies.ts - 新增 manageable, admin 功能
```

## 技術方案 (Technical Approach)

### Phase 1: 新增 DAL 模組 (4 小時)

#### 1. Analytics DAL (`lib/dal/analytics.ts`)

```typescript
export async function getDashboardSummary(
  db: D1Client,
  userId: string
): Promise<DashboardSummary>

export async function getDashboardStats(
  db: D1Client,
  userId: string
): Promise<DashboardStats>

export async function getRevenueTrend(
  db: D1Client,
  userId: string,
  months: number
): Promise<RevenueTrendData[]>

export async function getCurrencyDistribution(
  db: D1Client,
  userId: string
): Promise<CurrencyDistribution[]>

export async function getStatusStatistics(
  db: D1Client,
  userId: string
): Promise<StatusStatistics>
```

#### 2. Payments DAL 擴充 (`lib/dal/payments.ts`)

```typescript
export async function getPaymentStatistics(
  db: D1Client,
  userId: string
): Promise<PaymentStatistics>

export async function getUnpaidPayments(
  db: D1Client,
  userId: string
): Promise<Payment[]>

export async function getCollectedPayments(
  db: D1Client,
  userId: string,
  startDate: string,
  endDate: string
): Promise<Payment[]>

export async function getPaymentReminders(
  db: D1Client,
  userId: string
): Promise<PaymentReminder[]>

export async function markPaymentOverdue(
  db: D1Client,
  paymentId: string,
  userId: string
): Promise<void>
```

#### 3. Contracts DAL 擴充 (`lib/dal/contracts.ts`)

```typescript
export async function getOverdueContracts(
  db: D1Client,
  userId: string
): Promise<Contract[]>

export async function getNextCollectionDate(
  db: D1Client,
  contractId: string,
  userId: string
): Promise<string | null>

export async function getPaymentProgress(
  db: D1Client,
  contractId: string,
  userId: string
): Promise<PaymentProgress>

export async function createContractFromQuotation(
  db: D1Client,
  quotationId: string,
  userId: string
): Promise<Contract>
```

#### 4. Batch Operations DAL (`lib/dal/batch.ts`)

```typescript
export async function batchUpdateQuotationStatus(
  db: D1Client,
  quotationIds: string[],
  status: QuotationStatus,
  userId: string
): Promise<number>

export async function batchDeleteQuotations(
  db: D1Client,
  quotationIds: string[],
  userId: string
): Promise<number>

export async function batchSendQuotations(
  db: D1Client,
  quotationIds: string[],
  userId: string
): Promise<BatchSendResult>
```

#### 5. Admin DAL (`lib/dal/admin.ts`)

```typescript
export async function getAdminStats(
  db: D1Client
): Promise<AdminStats>

export async function getAllUsers(
  db: D1Client,
  page: number,
  limit: number
): Promise<{ users: User[], total: number }>

export async function updateUserRole(
  db: D1Client,
  userId: string,
  roleId: string
): Promise<void>

export async function getAllCompanies(
  db: D1Client
): Promise<Company[]>

export async function getCompanyMembers(
  db: D1Client,
  companyId: string
): Promise<CompanyMember[]>
```

### Phase 2: 遷移 API Routes (12 小時)

每個 API 遵循統一模式:

**Before (Supabase)**:
```typescript
const supabase = createApiClient(request)
const { data: { user } } = await supabase.auth.getUser()

const { data: contracts } = await supabase
  .from('customer_contracts')
  .select('*')
  .eq('user_id', user.id)
  .eq('status', 'active')
```

**After (D1 + KV)**:
```typescript
const { env } = await getCloudflareContext()
const supabase = createApiClient(request)
const { data: { user } } = await supabase.auth.getUser()

// 權限檢查 (KV cached)
const kv = getKVCache(env)
const db = getD1Client(env)
const hasPermission = await checkPermission(kv, db, user.id, 'contracts:read')

// 資料查詢 (DAL)
const contracts = await getActiveContracts(db, user.id)
```

### Phase 3: 程式碼清理 (3 小時)

#### 自動化清理腳本

```bash
# 找出所有使用 supabase.from() 的檔案
grep -r "supabase\.from\(" --include="*.ts" --include="*.tsx" app/

# 找出所有使用 supabase.rpc() 的檔案
grep -r "supabase\.rpc\(" --include="*.ts" --include="*.tsx" app/

# 找出所有 import Supabase 但未使用 Auth 的檔案
grep -r "createClient.*supabase" --include="*.ts" app/api/
```

#### 手動檢查清單

- [ ] 所有 API routes 不再有 `supabase.from()` 或 `supabase.rpc()`
- [ ] 所有 import 只包含 `createApiClient` (Auth 用)
- [ ] 移除 `lib/services/` 中舊的 Supabase 查詢邏輯
- [ ] 移除 RPC function 定義 (在文檔中保留參考)

### Phase 4: 測試與驗證 (4 小時)

#### 單元測試

- DAL 函式測試 (使用 Mock D1)
- KV Cache 測試
- 權限檢查測試

#### 整合測試

- 每個 API 端點測試
- 資料一致性驗證
- 效能測試 (回應時間 < 100ms)

#### E2E 測試

- 完整業務流程測試
- 儀表板資料驗證
- Batch 操作測試

## 實作階段 (Implementation Phases)

### ✅ Phase 0: 基礎架構 (已完成)
- D1 Client, DAL, KV Cache
- 22/56 API 已遷移

### 🔥 Phase 1: Analytics APIs (最高優先 - 3 小時)
**解決資料不一致問題**

1. 建立 `lib/dal/analytics.ts`
2. 遷移 5 個 Analytics API routes
3. 驗證儀表板數據正確

### Phase 2: Contracts APIs (2.5 小時)
1. 擴充 `lib/dal/contracts.ts`
2. 遷移 6 個 Contracts API routes
3. 測試合約相關功能

### Phase 3: Payments APIs (3 小時)
1. 擴充 `lib/dal/payments.ts`
2. 遷移 7 個 Payments API routes
3. 特別處理 `get_payment_statistics` RPC → DAL 函式
4. 測試付款統計和提醒

### Phase 4: Batch Operations (2 小時)
1. 建立 `lib/dal/batch.ts`
2. 遷移 3 個 Batch API routes
3. 測試批次更新和刪除

### Phase 5: Admin APIs (2.5 小時)
1. 建立 `lib/dal/admin.ts`
2. 遷移 6 個 Admin API routes
3. 測試管理功能

### Phase 6: RBAC 與輔助 APIs (2 小時)
1. 擴充 `lib/dal/rbac.ts` 和 `lib/dal/companies.ts`
2. 遷移 9 個輔助 API routes
3. 測試權限和公司管理

### Phase 7: 程式碼清理 (3 小時)
1. 執行自動化清理腳本
2. 手動檢查和移除殘留程式碼
3. 更新 import statements
4. 移除未使用的檔案

### Phase 8: 測試與驗證 (4 小時)
1. 執行完整測試套件
2. 效能測試和優化
3. 資料一致性驗證
4. 文檔更新

### Phase 9: 部署 (1 小時)
1. 部署到測試環境
2. 冒煙測試
3. 生產環境部署
4. 監控 48 小時

## 風險與緩解 (Risks & Mitigation)

### 技術風險

#### 風險 1: Supabase RPC Functions 遷移複雜 ⚠️ 高
**問題**: `get_payment_statistics` 是複雜的 SQL function

**緩解**:
1. 先理解 RPC function 邏輯
2. 用多個 D1 查詢 + 應用層聚合重寫
3. 充分測試結果一致性
4. 保留原 SQL 作為參考

#### 風險 2: 資料查詢效能差異 ⚠️ 中等
**問題**: SQLite vs PostgreSQL 效能特性不同

**緩解**:
1. 充分利用 KV 快取
2. 建立適當的索引
3. 效能測試和優化
4. 監控查詢時間

#### 風險 3: 遺漏未發現的 Supabase 依賴 ⚠️ 中等
**問題**: 126 個檔案可能有隱藏依賴

**緩解**:
1. 系統性 grep 搜尋
2. 完整的測試覆蓋
3. Code review 檢查
4. 逐步部署驗證

### 業務風險

#### 風險 4: 資料不一致期間的使用者體驗 ⚠️ 高
**問題**: 遷移期間可能有短暫不一致

**緩解**:
1. Phase 1 優先解決 Analytics (最大痛點)
2. 快速迭代,減少不一致時間
3. 使用 feature flag 控制切換
4. 充分的測試環境驗證

## 成功標準 (Success Criteria)

### 功能標準
- [ ] 所有 56 個 API 端點使用 D1
- [ ] 儀表板數據與報價單列表一致
- [ ] 所有業務功能正常運作
- [ ] 無 Supabase 資料庫查詢殘留

### 效能標準
- [ ] API p95 回應時間 < 100ms
- [ ] KV 快取命中率 > 80%
- [ ] D1 查詢時間 < 50ms

### 程式碼品質標準
- [ ] 所有測試通過
- [ ] 無 TypeScript 錯誤
- [ ] 無 ESLint 警告
- [ ] 程式碼 review 完成

### 文檔標準
- [ ] API 文檔更新
- [ ] 開發指南更新
- [ ] README 更新
- [ ] CHANGELOG 記錄

## 相依性 (Dependencies)

### 前置條件
- ✅ Cloudflare D1 資料庫已建立
- ✅ KV Namespace 已建立
- ✅ 基礎 DAL 層完成
- ✅ 22/56 API 已成功遷移

### 外部相依
- Cloudflare Workers 環境
- Supabase Auth (保留)
- OpenNext 建置工具

## 時程估計 (Timeline)

| Phase | 時間 | 優先級 |
|-------|------|--------|
| Phase 1: Analytics APIs | 3 小時 | P0 🔥 |
| Phase 2: Contracts APIs | 2.5 小時 | P1 |
| Phase 3: Payments APIs | 3 小時 | P1 |
| Phase 4: Batch Operations | 2 小時 | P1 |
| Phase 5: Admin APIs | 2.5 小時 | P2 |
| Phase 6: RBAC & 輔助 APIs | 2 小時 | P2 |
| Phase 7: 程式碼清理 | 3 小時 | P1 |
| Phase 8: 測試與驗證 | 4 小時 | P0 |
| Phase 9: 部署 | 1 小時 | P0 |
| **總計** | **23 小時** | |

**建議執行**: 2 週內完成 (每天 3-4 小時)

## 驗證清單 (Verification Checklist)

### 資料存取驗證
- [ ] `grep -r "supabase\.from\(" app/` 無結果
- [ ] `grep -r "supabase\.rpc\(" app/` 無結果
- [ ] `grep -r "from('.*')" app/api/` 無結果

### API 端點驗證
- [ ] 所有 `/api/analytics/*` 使用 D1
- [ ] 所有 `/api/contracts/*` 使用 D1
- [ ] 所有 `/api/payments/*` 使用 D1
- [ ] 所有 `/api/quotations/batch/*` 使用 D1
- [ ] 所有 `/api/admin/*` 使用 D1

### 功能驗證
- [ ] 儀表板顯示正確數據
- [ ] 報價單列表與儀表板一致
- [ ] Batch 操作功能正常
- [ ] 合約管理功能正常
- [ ] 付款統計準確
- [ ] Admin 功能正常

### 保留驗證 (確保未破壞)
- [ ] Supabase Auth 登入正常
- [ ] OAuth (Google) 登入正常
- [ ] Session 管理正常
- [ ] 密碼重設功能正常

## 回滾計畫 (Rollback Plan)

### 快速回滾 (< 5 分鐘)
```bash
# 切回 main 分支 (遷移前的版本)
git checkout main
pnpm run deploy:cf
```

### 分階段回滾
- 如果 Phase 1 失敗 → 只回滾 Analytics APIs
- 如果 Phase 2-3 失敗 → 回滾到 Phase 1 完成狀態
- 保留 30 天 Supabase 備份

## 後續工作 (Follow-up)

### 30 天後 (確認穩定)
- [ ] 刪除 Zeabur 資料庫
- [ ] 移除 Zeabur 相關環境變數
- [ ] 清理 Supabase 業務表 (保留 Auth tables)
- [ ] 更新團隊文檔

### 長期優化
- [ ] 監控 D1 查詢效能
- [ ] 優化 KV 快取策略
- [ ] 考慮 Storage → R2 遷移
- [ ] 考慮 Email → Cloudflare Email Workers

## 總結

本 proposal 提供**系統性、無遺漏**的遷移方案,將專案從 Supabase+D1 混合架構完全遷移至 D1 單一資料來源,僅保留 Supabase 作為 OAuth 認證用途。

**關鍵優勢**:
1. ✅ 解決資料不一致問題
2. ✅ 簡化架構,降低維護成本
3. ✅ 統一程式碼風格
4. ✅ 完整的驗證清單,確保無遺漏
5. ✅ 分階段執行,風險可控
