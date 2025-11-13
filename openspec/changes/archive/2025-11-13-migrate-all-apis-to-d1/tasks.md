# Tasks: 遷移所有業務資料 API 至 D1

## Phase 1: Analytics APIs 遷移（最高優先）

### 1.1 建立 Analytics DAL 模組
- [ ] 建立 `lib/dal/analytics.ts` 檔案
- [ ] 實作 `getRevenueTrend(db, userId, months)` 函式
  - [ ] SQL 查詢：按月份分組統計營收
  - [ ] 處理空月份填充
  - [ ] 回傳格式化的月份名稱
- [ ] 實作 `getCurrencyDistribution(db, userId)` 函式
  - [ ] SQL 查詢：按貨幣統計簽約報價單
  - [ ] 回傳貨幣、總金額、數量
- [ ] 實作 `getStatusStatistics(db, userId)` 函式
  - [ ] SQL 查詢：按狀態統計報價單
  - [ ] 回傳狀態、數量、總金額
- [ ] 實作 `getDashboardSummary(db, userId)` 函式
  - [ ] 查詢本月報價單數據
  - [ ] 查詢上月報價單數據
  - [ ] 計算營收成長率
  - [ ] 計算數量成長率
  - [ ] 計算轉換率
- [ ] 實作 `getDashboardStats(db, userId)` 函式
  - [ ] 查詢報價單統計（按狀態）
  - [ ] 查詢合約統計（活躍、逾期等）
  - [ ] 查詢客戶統計
  - [ ] 查詢產品統計
  - [ ] 整合付款統計（使用 getPaymentStatistics）

### 1.2 改寫 Analytics API Routes
- [ ] 改寫 `app/api/analytics/revenue-trend/route.ts`
  - [ ] 移除 Supabase 查詢
  - [ ] 使用 `getRevenueTrend` DAL 函式
  - [ ] 測試 API 回應格式一致
- [ ] 改寫 `app/api/analytics/currency-distribution/route.ts`
  - [ ] 移除 Supabase 查詢
  - [ ] 使用 `getCurrencyDistribution` DAL 函式
  - [ ] 測試 API 回應格式一致
- [ ] 改寫 `app/api/analytics/status-statistics/route.ts`
  - [ ] 移除 Supabase 查詢
  - [ ] 使用 `getStatusStatistics` DAL 函式
  - [ ] 測試 API 回應格式一致
- [ ] 改寫 `app/api/analytics/dashboard-summary/route.ts`
  - [ ] 移除 Supabase 查詢
  - [ ] 使用 `getDashboardSummary` DAL 函式
  - [ ] 測試 API 回應格式一致
- [ ] 改寫 `app/api/analytics/dashboard-stats/route.ts`
  - [ ] 移除 Supabase 查詢
  - [ ] 使用 `getDashboardStats` DAL 函式
  - [ ] 測試 API 回應格式一致

### 1.3 驗證 Analytics 功能
- [ ] 測試儀表板頁面顯示正確數據
- [ ] 確認營收趨勢圖表正確
- [ ] 確認貨幣分布圖表正確
- [ ] 確認狀態統計圖表正確
- [ ] 比對數據與報價單列表一致性

## Phase 2: Payments Statistics 遷移

### 2.1 擴充 Payments DAL
- [ ] 在 `lib/dal/payments.ts` 新增 `getPaymentStatistics(db, userId)` 函式
  - [ ] 查詢本月付款統計
  - [ ] 查詢本年付款統計
  - [ ] 計算逾期款項統計
  - [ ] 回傳與 Supabase RPC 相同的格式

### 2.2 改寫 Payments Statistics API
- [ ] 改寫 `app/api/payments/statistics/route.ts`
  - [ ] 移除 Supabase RPC 呼叫
  - [ ] 使用 `getPaymentStatistics` DAL 函式
  - [ ] 測試 API 回應格式一致

### 2.3 驗證 Payments 功能
- [ ] 測試付款統計顯示正確
- [ ] 確認本月收款數據準確
- [ ] 確認逾期款項計算正確

## Phase 3: Batch Operations 遷移

### 3.1 擴充 Quotations DAL
- [ ] 在 `lib/dal/quotations.ts` 新增 `batchUpdateQuotationStatus(db, userId, ids, status)` 函式
  - [ ] 驗證所有報價單屬於使用者
  - [ ] 批次更新狀態
  - [ ] 更新 updated_at 時間戳
  - [ ] 回傳更新數量
- [ ] 在 `lib/dal/quotations.ts` 新增 `batchDeleteQuotations(db, userId, ids)` 函式
  - [ ] 驗證所有報價單屬於使用者
  - [ ] 先刪除相關的 quotation_items
  - [ ] 批次刪除報價單
  - [ ] 回傳刪除數量

### 3.2 改寫 Batch API Routes
- [ ] 改寫 `app/api/quotations/batch/status/route.ts`
  - [ ] 移除 Supabase 查詢
  - [ ] 使用 `batchUpdateQuotationStatus` DAL 函式
  - [ ] 測試批次更新功能
- [ ] 改寫 `app/api/quotations/batch/delete/route.ts`
  - [ ] 移除 Supabase 查詢
  - [ ] 使用 `batchDeleteQuotations` DAL 函式
  - [ ] 測試批次刪除功能

### 3.3 驗證 Batch 功能
- [ ] 測試批次更新狀態
- [ ] 測試批次刪除
- [ ] 確認權限檢查正常運作

## Phase 4: Contracts API 遷移

### 4.1 改寫 Contracts API
- [ ] 改寫 `app/api/contracts/route.ts` GET
  - [ ] 移除 Supabase 查詢
  - [ ] 使用 `getContracts` DAL 函式（已存在）
  - [ ] 測試過濾功能（status）
- [ ] 改寫 `app/api/contracts/route.ts` POST
  - [ ] 移除 Supabase 查詢
  - [ ] 使用 `createContract` DAL 函式（已存在）
  - [ ] 測試建立合約功能

### 4.2 驗證 Contracts 功能
- [ ] 測試合約列表顯示正確
- [ ] 測試新增合約功能
- [ ] 測試狀態過濾功能

## Phase 5: 驗證和清理

### 5.1 整合測試
- [ ] 執行所有 Analytics 測試
- [ ] 執行所有 Payments 測試
- [ ] 執行所有 Quotations 測試
- [ ] 執行所有 Contracts 測試
- [ ] 執行端到端測試（E2E）

### 5.2 資料一致性驗證
- [ ] 比對儀表板數據與報價單列表
- [ ] 確認所有統計數字正確
- [ ] 檢查邊界情況（空資料、大量資料）

### 5.3 程式碼清理
- [ ] 移除未使用的 Supabase 查詢程式碼（保留註解作為參考）
- [ ] 更新 API 文件
- [ ] 更新 README
- [ ] 新增 migration notes

### 5.4 效能驗證
- [ ] 測試 API 回應時間
- [ ] 比較遷移前後效能
- [ ] 檢查 D1 查詢效率

### 5.5 部署準備
- [ ] 執行 lint 檢查
- [ ] 執行 typecheck
- [ ] 確保 D1 資料庫有必要的索引
- [ ] 準備部署說明文件

## 相依性注意事項

- ⚠️ Phase 1 必須先完成才能進行 Phase 5 驗證
- ⚠️ `getPaymentStatistics` 在 Phase 2 實作，但 Phase 1 的 `getDashboardStats` 會使用它
- ✅ Phase 2、3、4 可以並行開發
- ✅ 所有 Phase 完成後才執行 Phase 5

## 測試檢查清單

- [ ] 儀表板顯示正確數據
- [ ] 報價單列表顯示正確數據
- [ ] 營收趨勢圖表正確
- [ ] 貨幣分布圖表正確
- [ ] 狀態統計圖表正確
- [ ] 批次更新功能正常
- [ ] 批次刪除功能正常
- [ ] 付款統計正確
- [ ] 合約列表和建立功能正常
- [ ] 所有單元測試通過
- [ ] 所有整合測試通過
- [ ] 無 TypeScript 錯誤
- [ ] 無 ESLint 錯誤

## 預計工時

- Phase 1: 2-3 小時
- Phase 2: 1 小時
- Phase 3: 1-2 小時
- Phase 4: 0.5 小時
- Phase 5: 1-2 小時

**總計**: 5.5-8.5 小時
