# Tasks: 完整遷移至 Cloudflare D1

## Phase 1: Analytics APIs (最高優先 - 3 小時) 🔥

### Task 1.1: 建立 Analytics DAL (1.5 小時)
- [ ] 建立 `lib/dal/analytics.ts`
- [ ] 實作 `getDashboardSummary(db, userId)`
- [ ] 實作 `getDashboardStats(db, userId)`
- [ ] 實作 `getRevenueTrend(db, userId, months)`
- [ ] 實作 `getCurrencyDistribution(db, userId)`
- [ ] 實作 `getStatusStatistics(db, userId)`
- [ ] 為每個函式撰寫 JSDoc
- [ ] 新增 TypeScript 類型定義

**驗證**: `pnpm run typecheck` 通過

### Task 1.2: 遷移 Analytics API Routes (1 小時)
- [ ] 遷移 `/api/analytics/dashboard-summary/route.ts`
- [ ] 遷移 `/api/analytics/dashboard-stats/route.ts`
- [ ] 遷移 `/api/analytics/revenue-trend/route.ts`
- [ ] 遷移 `/api/analytics/currency-distribution/route.ts`
- [ ] 遷移 `/api/analytics/status-statistics/route.ts`

**模式**:
```typescript
const { env } = await getCloudflareContext()
const db = getD1Client(env)
const kv = getKVCache(env)
const hasPermission = await checkPermission(kv, db, user.id, 'analytics:read')
const data = await getDashboardSummary(db, user.id)
```

### Task 1.3: 驗證 Analytics 資料 (0.5 小時)
- [ ] 測試儀表板載入
- [ ] 驗證數據與報價單列表一致
- [ ] 檢查所有圖表顯示正確
- [ ] 確認無 console 錯誤

**成功標準**: 儀表板數據與報價單列表完全一致

---

## Phase 2: Contracts APIs (2.5 小時)

### Task 2.1: 擴充 Contracts DAL (1 小時)
- [ ] 在 `lib/dal/contracts.ts` 新增 `getOverdueContracts(db, userId)`
- [ ] 新增 `getNextCollectionDate(db, contractId, userId)`
- [ ] 新增 `getPaymentProgress(db, contractId, userId)`
- [ ] 新增 `createContractFromQuotation(db, quotationId, userId)`
- [ ] 更新類型定義

### Task 2.2: 遷移 Contracts API Routes (1.5 小時)
- [ ] 遷移 `/api/contracts/route.ts` (GET, POST)
- [ ] 遷移 `/api/contracts/from-quotation/route.ts`
- [ ] 遷移 `/api/contracts/overdue/route.ts`
- [ ] 遷移 `/api/contracts/[id]/next-collection/route.ts`
- [ ] 遷移 `/api/contracts/[id]/payment-progress/route.ts`

**依賴**: 現有的 `lib/dal/contracts.ts` 已有基本 CRUD

---

## Phase 3: Payments APIs (3 小時)

### Task 3.1: 擴充 Payments DAL (1.5 小時)
- [ ] 在 `lib/dal/payments.ts` 新增 `getPaymentStatistics(db, userId)`
  - **重要**: 需研究原 Supabase RPC `get_payment_statistics` 邏輯
  - 用多個 D1 查詢 + 應用層聚合重寫
- [ ] 新增 `getUnpaidPayments(db, userId)`
- [ ] 新增 `getCollectedPayments(db, userId, startDate, endDate)`
- [ ] 新增 `getPaymentReminders(db, userId)`
- [ ] 新增 `markPaymentOverdue(db, paymentId, userId)`

### Task 3.2: 遷移 Payments API Routes (1.5 小時)
- [ ] 遷移 `/api/payments/route.ts` (GET, POST)
- [ ] 遷移 `/api/payments/statistics/route.ts` ⚠️ (使用新的 DAL function)
- [ ] 遷移 `/api/payments/unpaid/route.ts`
- [ ] 遷移 `/api/payments/collected/route.ts`
- [ ] 遷移 `/api/payments/reminders/route.ts`
- [ ] 遷移 `/api/payments/[id]/mark-overdue/route.ts`

---

## Phase 4: Batch Operations (2 小時)

### Task 4.1: 建立 Batch DAL (1 小時)
- [ ] 建立 `lib/dal/batch.ts`
- [ ] 實作 `batchUpdateQuotationStatus(db, quotationIds, status, userId)`
  - 使用 D1 batch API 或 transaction
- [ ] 實作 `batchDeleteQuotations(db, quotationIds, userId)`
  - 同時刪除 quotation_items
- [ ] 實作 `batchSendQuotations(db, quotationIds, userId)`
  - 更新狀態 + 記錄發送時間

### Task 4.2: 遷移 Batch API Routes (1 小時)
- [ ] 遷移 `/api/quotations/batch/status/route.ts`
- [ ] 遷移 `/api/quotations/batch/delete/route.ts`
- [ ] 遷移 `/api/quotations/batch/send/route.ts`

---

## Phase 5: Admin APIs (2.5 小時)

### Task 5.1: 建立 Admin DAL (1 小時)
- [ ] 建立 `lib/dal/admin.ts`
- [ ] 實作 `getAdminStats(db)` - 系統統計
- [ ] 實作 `getAllUsers(db, page, limit)`
- [ ] 實作 `updateUserRole(db, userId, roleId)`
- [ ] 實作 `getAllCompanies(db)`
- [ ] 實作 `getCompanyMembers(db, companyId)`
- [ ] 實作 `addCompanyMember(db, companyId, userId, roleId)`
- [ ] 實作 `removeCompanyMember(db, companyId, userId)`

### Task 5.2: 遷移 Admin API Routes (1.5 小時)
- [ ] 遷移 `/api/admin/users/route.ts` (GET, POST)
- [ ] 遷移 `/api/admin/users/[id]/role/route.ts` (PUT)
- [ ] 遷移 `/api/admin/companies/route.ts` (GET, POST)
- [ ] 遷移 `/api/admin/companies/[id]/route.ts` (GET, PUT, DELETE)
- [ ] 遷移 `/api/admin/companies/[id]/members/route.ts` (GET, POST, DELETE)
- [ ] 遷移 `/api/admin/stats/route.ts`

**權限檢查**: 確保所有 Admin API 檢查 `super_admin` 或 `company_owner` 角色

---

## Phase 6: RBAC 與輔助 APIs (2 小時)

### Task 6.1: 擴充 RBAC 和 Companies DAL (1 小時)
- [ ] 在 `lib/dal/rbac.ts` 新增 `getUserProfile(db, userId)`
- [ ] 在 `lib/dal/companies.ts` 新增 `getManageableCompanies(db, userId)`
- [ ] 新增 `getCompanyMembers(db, companyId, userId)`

### Task 6.2: 遷移 RBAC 與輔助 API Routes (1 小時)
- [ ] 遷移 `/api/rbac/check-permission/route.ts`
- [ ] 遷移 `/api/rbac/user-profile/route.ts`
- [ ] 遷移 `/api/user/permissions/route.ts`
- [ ] 遷移 `/api/user/companies/route.ts`
- [ ] 遷移 `/api/company-settings/route.ts`
- [ ] 遷移 `/api/company/manageable/route.ts`
- [ ] 遷移 `/api/company/[id]/members/route.ts`

---

## Phase 7: 程式碼清理 (3 小時)

### Task 7.1: 自動化搜尋與分析 (0.5 小時)
- [ ] 執行: `grep -r "supabase\.from\(" --include="*.ts" app/ > supabase-from-usage.txt`
- [ ] 執行: `grep -r "supabase\.rpc\(" --include="*.ts" app/ > supabase-rpc-usage.txt`
- [ ] 執行: `grep -r "from('.*')" --include="*.ts" app/api/ > direct-table-usage.txt`
- [ ] 分析結果,確保所有都已遷移

### Task 7.2: 移除未使用的 Imports (1 小時)
- [ ] 檢查所有 API routes 的 import statements
- [ ] 移除 `import { createClient } from '@supabase/supabase-js'` (如未使用)
- [ ] 確保保留 `import { createApiClient } from '@/lib/supabase/api'` (Auth 用)
- [ ] 執行 `pnpm run lint:fix` 自動清理

### Task 7.3: 清理 Services 和 Utilities (0.5 小時)
- [ ] 檢查 `lib/services/` 目錄
- [ ] 移除任何舊的 Supabase 查詢邏輯
- [ ] 保留 `lib/services/rbac.ts` (如果還在用)
- [ ] 更新註解和文檔

### Task 7.4: 驗證清理完整性 (1 小時)
- [ ] `grep -r "supabase\.from\(" app/` 應無結果 (除了測試檔案)
- [ ] `grep -r "\.rpc\(" app/api/` 應無結果
- [ ] 所有 API routes 使用 `getD1Client` 和 `getKVCache`
- [ ] 執行 `pnpm run typecheck` 無錯誤
- [ ] 執行 `pnpm run lint` 無警告

---

## Phase 8: 測試與驗證 (4 小時)

### Task 8.1: 單元測試 (1.5 小時)
- [ ] 為所有新 DAL 函式撰寫測試
  - `__tests__/dal/analytics.test.ts`
  - `__tests__/dal/batch.test.ts`
  - `__tests__/dal/admin.test.ts`
- [ ] 測試 Payments DAL 的 `getPaymentStatistics` 邏輯正確
- [ ] 執行 `pnpm test` 確保所有測試通過

### Task 8.2: API 整合測試 (1.5 小時)
- [ ] 測試所有 Analytics APIs
- [ ] 測試所有 Contracts APIs
- [ ] 測試所有 Payments APIs
- [ ] 測試 Batch Operations
- [ ] 測試 Admin APIs
- [ ] 使用 Postman/Insomnia 或自動化腳本

### Task 8.3: E2E 功能驗證 (1 小時)
- [ ] 登入系統
- [ ] 檢查儀表板數據正確
- [ ] 建立報價單,查看列表
- [ ] 執行 Batch 操作
- [ ] 檢查合約管理
- [ ] 檢查付款統計
- [ ] 驗證 Admin 功能 (如有權限)

**所有功能必須完全正常,無任何錯誤**

---

## Phase 9: 部署 (1 小時)

### Task 9.1: 本地最終驗證 (0.25 小時)
- [ ] `pnpm run build` 成功
- [ ] `pnpm run typecheck` 無錯誤
- [ ] `pnpm run lint` 無警告
- [ ] `pnpm test` 全部通過

### Task 9.2: 部署到測試環境 (0.25 小時)
- [ ] `pnpm run deploy:cf --env preview`
- [ ] 執行冒煙測試 (登入、檢視儀表板、查看列表)
- [ ] 檢查 Cloudflare Workers 日誌無錯誤

### Task 9.3: 生產環境部署 (0.25 小時)
- [ ] 備份當前部署版本
- [ ] `pnpm run deploy:cf`
- [ ] 驗證部署成功

### Task 9.4: 部署後監控 (0.25 小時)
- [ ] 使用 `wrangler tail` 監控即時日誌
- [ ] 檢查 Cloudflare Dashboard Analytics
- [ ] 驗證 API 回應時間 < 100ms
- [ ] 檢查 KV 快取命中率
- [ ] 持續監控 48 小時

---

## Phase 10: 文檔更新 (1 小時)

### Task 10.1: 更新開發文檔 (0.5 小時)
- [ ] 更新 `docs/API_MIGRATION_PATTERN.md`
- [ ] 更新 `docs/MIGRATION_GUIDE.md`
- [ ] 更新 `docs/DATABASE_MIGRATION_PROGRESS.md` (標記為 100% 完成)
- [ ] 新增 `docs/D1_BEST_PRACTICES.md`

### Task 10.2: 更新 README 和 CHANGELOG (0.5 小時)
- [ ] 更新主 `README.md` - 移除 Zeabur 相關內容
- [ ] 更新 `.env.example` - 移除 `ZEABUR_POSTGRES_URL`
- [ ] 在 `CHANGELOG.md` 記錄遷移完成
- [ ] 更新 `CONTRIBUTING.md` - 新的開發流程

---

## 驗證清單 (Checklist)

### 資料存取檢查
```bash
# 應該無結果 (或只有測試檔案)
grep -r "supabase\.from\(" --include="*.ts" app/
grep -r "supabase\.rpc\(" --include="*.ts" app/
grep -r "from('.*')" --include="*.ts" app/api/
```

### API 端點檢查
- [ ] 56/56 API 端點使用 D1
- [ ] 所有 API 有 `const { env } = await getCloudflareContext()`
- [ ] 所有 API 使用 `getD1Client(env)` 和 `getKVCache(env)`
- [ ] 所有 API 使用 DAL 函式查詢資料

### 功能檢查
- [ ] 儀表板顯示正確數據
- [ ] 報價單列表與儀表板一致
- [ ] Batch 操作成功
- [ ] 合約管理正常
- [ ] 付款統計正確
- [ ] Admin 功能正常
- [ ] 權限檢查正常

### Auth 保留檢查
- [ ] Supabase Auth 登入正常
- [ ] OAuth Google 登入正常
- [ ] Session 管理正常
- [ ] 密碼重設正常
- [ ] `lib/auth.ts` 未被修改
- [ ] `middleware.ts` 未被修改

### 程式碼品質檢查
- [ ] `pnpm run typecheck` 通過
- [ ] `pnpm run lint` 無警告
- [ ] `pnpm test` 全部通過
- [ ] `pnpm run build` 成功

---

## 預期時程

### 全職開發 (每天 8 小時)
- **第 1-2 天**: Phase 1-3 (Analytics, Contracts, Payments)
- **第 3 天**: Phase 4-6 (Batch, Admin, RBAC)
- **第 4 天**: Phase 7-8 (清理, 測試)
- **第 5 天**: Phase 9-10 (部署, 文檔)

### 兼職開發 (每天 3-4 小時)
- **第 1-3 天**: Phase 1-3
- **第 4-5 天**: Phase 4-6
- **第 6-7 天**: Phase 7-8
- **第 8-9 天**: Phase 9-10

**總計**: 約 2 週完成

---

## 回滾準備

### 建立回滾分支
```bash
git checkout -b migration-rollback
git push origin migration-rollback
```

### 快速回滾指令
```bash
git checkout main  # 或 migration-rollback
pnpm run deploy:cf
```

### 資料備份
- [ ] 備份 Supabase 資料 (保留 30 天)
- [ ] 記錄 D1 資料庫 ID
- [ ] 保留環境變數快照

---

## 依賴與阻塞

### 無阻塞 - 可並行
- Phase 1-6 各自獨立,可並行開發
- DAL 和 API 可由不同人並行

### 有依賴
- Phase 7 需要 Phase 1-6 完成
- Phase 8 需要 Phase 7 完成
- Phase 9 需要 Phase 8 通過

### 建議順序
1. **優先**: Phase 1 (解決資料不一致)
2. **次之**: Phase 2-6 (可並行)
3. **最後**: Phase 7-9 (串行)
