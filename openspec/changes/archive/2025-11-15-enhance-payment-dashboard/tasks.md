# 任務清單：優化收款管理儀表板

## Phase 1：資料庫優化和資料存取層（2-3 天）

### 1.1 資料庫索引優化
- [x] 創建 migration 檔案 `019_add_payment_indexes.sql`
- [x] 新增索引：`idx_payment_schedules_due_date` (due_date, status)
- [x] 新增索引：`idx_customer_contracts_quotation` (quotation_id)
- [x] 新增索引：`idx_payment_schedules_user` (user_id, due_date)
- [x] 在 D1 migration 目錄同步新增 `d1/008_add_payment_indexes.sql`
- [ ] 使用 `EXPLAIN QUERY PLAN` 驗證索引使用
- [ ] 測試索引對查詢效能的影響

### 1.2 資料存取層函式開發
- [x] 在 `lib/dal/payments.ts` 新增 `getCurrentMonthReceivables()` 函式
  - [x] 實作查詢邏輯（JOIN payment_schedules + customers + contracts + quotations）
  - [x] 計算 days_until_due 和 is_overdue
  - [x] 計算 total_schedules（每個合約的總期數）
  - [x] 返回 CurrentMonthReceivable[] 和 summary 統計
- [x] 新增 `markScheduleAsCollected()` 函式
  - [x] 實作 transaction 邏輯
  - [x] 創建 payment 記錄
  - [x] 更新 payment_schedule 狀態
  - [x] 更新 customer_contracts 下次收款資訊
  - [x] 錯誤處理和 rollback
- [x] 修改 `getPaymentStatistics()` 函式
  - [x] 新增 total_receivable 欄位（pending + overdue）
- [ ] 修改 `getCollectedPayments()` 和 `getUnpaidPaymentSchedules()`
  - [ ] 增加 quotation_number 欄位（透過 JOIN）
  - [ ] 增加 schedule_info 欄位（schedule_number 和 total_schedules）

### 1.3 單元測試
- [ ] 測試 `getCurrentMonthReceivables()`
  - [ ] 正確返回當月所有排程
  - [ ] 正確關聯報價單編號
  - [ ] 正確計算期數資訊
  - [ ] 正確計算 days_until_due 和 is_overdue
  - [ ] 正確計算 summary 統計
- [ ] 測試 `markScheduleAsCollected()`
  - [ ] 成功創建 payment 記錄
  - [ ] 成功更新 payment_schedule 狀態
  - [ ] 成功更新 customer_contracts 下次收款資訊
  - [ ] 已收款項無法重複標記
  - [ ] Transaction rollback 正確處理錯誤
  - [ ] 權限驗證正確執行

## Phase 2：API 端點開發（2 天）

### 2.1 當月應收款項 API
- [x] 創建 `app/api/payments/current-month-receivables/route.ts`
- [x] 實作 GET handler
  - [x] 驗證用戶已登入
  - [x] 解析 month 參數（預設為當月）
  - [x] 呼叫 `getCurrentMonthReceivables()`
  - [x] 返回 JSON 回應
  - [x] 錯誤處理（try-catch）
- [x] 新增 TypeScript 類型定義
  - [x] `CurrentMonthReceivable` interface
  - [x] `CurrentMonthReceivablesSummary` interface

### 2.2 標記收款 API
- [x] 創建 `app/api/payments/schedules/[id]/mark-collected/route.ts`
- [x] 實作 POST handler
  - [x] 驗證用戶已登入
  - [x] 解析請求參數（payment_date, amount, payment_method 等）
  - [x] 使用 TypeScript 驗證輸入
  - [x] 呼叫 `markScheduleAsCollected()`
  - [x] 返回 JSON 回應（包含更新後的 schedule 和創建的 payment）
  - [x] 錯誤處理（400/404/500）
- [x] 新增驗證邏輯
  - [x] `validateMarkCollectedInput` 函式

### 2.3 修改統計 API
- [x] 修改 `lib/dal/payments.ts` 的 `getPaymentStatistics()`
- [x] 更新回應格式包含 `total_receivable` 欄位

### 2.4 API 整合測試
- [ ] 測試 GET `/api/payments/current-month-receivables`
  - [ ] 返回正確資料格式
  - [ ] 權限驗證正確
  - [ ] 月份參數正確處理
- [ ] 測試 POST `/api/payments/schedules/:id/mark-collected`
  - [ ] 成功標記收款
  - [ ] 驗證錯誤處理（400/404）
  - [ ] 驗證權限控制
  - [ ] 驗證 transaction 行為
- [ ] 測試 GET `/api/payments` 統計 API
  - [ ] 正確返回 total_receivable

## Phase 3：前端組件開發（2-3 天）

### 3.1 Custom Hooks 開發
- [x] 在 `hooks/usePayments.ts` 新增 hooks
  - [x] `useCurrentMonthReceivables()` - 查詢當月應收款項
  - [x] `useMarkScheduleAsCollected()` - 標記收款 mutation
- [x] 實作樂觀更新（optimistic updates）
  - [x] onMutate: 快照並更新 UI
  - [x] onError: 回復快照
  - [x] onSuccess: 重新 fetch 資料
- [x] 設定適當的 cache 策略（staleTime, refetchOnWindowFocus）

### 3.2 CurrentMonthReceivablesTable 組件
- [x] 創建 `components/payments/CurrentMonthReceivablesTable.tsx`
- [x] 實作桌面版表格布局
  - [x] 表格標題區（顯示匯總統計）
  - [x] 表格欄位：✓, 報價單編號, 客戶名稱, 期數, 金額, 收款日期, 狀態
  - [x] 勾選框/勾號邏輯
  - [x] StatusBadge 組件整合
- [x] 實作響應式設計
  - [x] 手機版卡片式布局（< 768px）
- [x] 實作載入/錯誤/空狀態
  - [x] LoadingSpinner
  - [x] 錯誤訊息 + 重試按鈕
  - [x] EmptyState
- [x] 實作無障礙性（Accessibility）
  - [x] ARIA labels
  - [x] 鍵盤導航（Tab, Space, Enter）
  - [x] Screen reader 支援

### 3.3 優化統計卡片
- [x] 修改 `app/[locale]/payments/page.tsx` 的統計卡片區
- [x] 移除收款率卡片
- [x] 新增當月應收總額卡片
  - [x] 顯示 `total_receivable`
  - [x] 藍色邊框（border-l-4 border-blue-500）
  - [x] 藍色文字

### 3.4 優化 PaymentCard 組件
- [ ] 修改 `components/payments/PaymentCard.tsx`
- [ ] 在 `UnpaidPaymentCard` 新增欄位
  - [ ] 報價單編號（如果有）
  - [ ] 期數資訊（如「第 3 期/共 12 期」）
- [ ] 在 `CollectedPaymentCard` 新增相同欄位
- [ ] 確保樣式一致性

### 3.5 整合到收款管理頁面
- [x] 修改 `app/[locale]/payments/page.tsx`
- [x] 在統計卡片下方、已收款/未收款區域上方插入 `CurrentMonthReceivablesTable`
- [x] 確保布局正確（使用 Tailwind 的 space-y-6）
- [x] 測試整體頁面布局

### 3.6 翻譯檔案更新
- [x] 更新 `messages/zh.json`
  - [x] 新增當月應收相關翻譯
  - [x] 新增報價單編號、期數相關翻譯
  - [x] 新增 toast 訊息翻譯
- [x] 更新 `messages/en.json`（同步所有翻譯）

## Phase 4：測試和優化（1-2 天）

### 4.1 功能驗證測試
- [ ] 手動測試當月應收清單
  - [ ] 驗證資料正確顯示
  - [ ] 驗證報價單編號正確關聯
  - [ ] 驗證期數資訊正確計算
  - [ ] 驗證狀態標籤顏色正確
- [ ] 手動測試標記收款功能
  - [ ] 勾選未收款項 → 狀態變已收
  - [ ] 統計卡片即時更新
  - [ ] Toast 訊息正確顯示
  - [ ] 錯誤處理正確（重複標記、權限錯誤等）
- [ ] 手動測試統計卡片
  - [ ] 驗證當月應收總額正確計算
  - [ ] 驗證收款率卡片已移除
- [ ] 手動測試優化後的 PaymentCard
  - [ ] 驗證報價單編號顯示
  - [ ] 驗證期數資訊顯示

### 4.2 E2E 測試（使用 Playwright）
- [ ] 創建 E2E 測試檔案 `tests/e2e/payment-dashboard.spec.ts`
- [ ] 測試完整流程
  - [ ] 開啟收款管理頁面 → 看到當月應收清單
  - [ ] 勾選一筆款項 → 看到 toast → 驗證狀態更新
  - [ ] 驗證統計卡片數據更新
- [ ] 測試錯誤情境
  - [ ] API 錯誤 → 看到錯誤訊息
  - [ ] 重試按鈕 → 重新載入資料
- [ ] 測試響應式設計
  - [ ] 桌面版布局正確
  - [ ] 手機版布局正確

### 4.3 效能測試
- [ ] 測試 API 回應時間
  - [ ] GET `/api/payments/current-month-receivables` < 500ms
  - [ ] POST `/api/payments/schedules/:id/mark-collected` < 300ms
- [ ] 測試頁面載入時間
  - [ ] 完整頁面載入 < 2s（包含所有資料）
- [ ] 測試資料庫查詢效能
  - [ ] 使用 `EXPLAIN QUERY PLAN` 驗證索引使用
  - [ ] 驗證 JOIN 操作效率

### 4.4 無障礙性測試
- [ ] 使用 axe DevTools 掃描頁面
- [ ] 驗證鍵盤導航
  - [ ] Tab 可移動焦點
  - [ ] Space/Enter 可勾選 checkbox
- [ ] 驗證 screen reader 可讀性
  - [ ] 使用 NVDA/JAWS 測試
  - [ ] 確認所有資訊可正確讀取

### 4.5 跨瀏覽器測試
- [ ] Chrome（最新版）
- [ ] Firefox（最新版）
- [ ] Safari（最新版）
- [ ] Edge（最新版）
- [ ] 手機瀏覽器（iOS Safari, Android Chrome）

### 4.6 效能優化
- [ ] 檢查 bundle size
  - [ ] 確認沒有引入不必要的依賴
- [ ] 檢查 re-render 次數
  - [ ] 使用 React DevTools Profiler
  - [ ] 優化不必要的 re-render
- [ ] 檢查記憶體洩漏
  - [ ] 確認 useEffect cleanup 正確
  - [ ] 確認 event listener 正確移除

## Phase 5：文件和部署（1 天）

### 5.1 更新文件
- [ ] 更新 `CHANGELOG.md`
  - [ ] 記錄新增功能
  - [ ] 記錄 API 變更
  - [ ] 記錄 UI 優化
- [ ] 更新 API 文件（如果有 OpenAPI spec）
- [ ] 更新使用者文件（如有需要）

### 5.2 程式碼審查準備
- [x] 執行 `pnpm run lint`
  - [x] 修正所有 ESLint 錯誤/警告
- [x] 執行 `pnpm run typecheck`
  - [x] 修正所有 TypeScript 錯誤
- [ ] 執行 `pnpm run build`
  - [ ] 確認建置成功，無錯誤

### 5.3 部署前檢查
- [ ] 驗證環境變數設定
- [ ] 驗證資料庫 migration 就緒
- [ ] 驗證 Cloudflare Workers 配置
- [ ] 準備 rollback 計畫

### 5.4 部署流程
- [ ] **Step 1**：部署資料庫 migration
  - [ ] 在離峰時段執行
  - [ ] 驗證索引創建成功
- [ ] **Step 2**：部署後端 API
  - [ ] 部署到 staging 環境
  - [ ] 驗證 API 正常運作
  - [ ] 部署到 production
- [ ] **Step 3**：部署前端
  - [ ] 部署到 staging 環境
  - [ ] 完整功能測試
  - [ ] 部署到 production
- [ ] **Step 4**：驗證部署
  - [ ] 驗證當月應收清單正常顯示
  - [ ] 驗證標記收款功能正常
  - [ ] 監控錯誤日誌（Cloudflare Workers Logs）

### 5.5 監控和追蹤
- [ ] 設定監控儀表板（如使用 Cloudflare Analytics）
- [ ] 追蹤關鍵指標
  - [ ] API 回應時間
  - [ ] 錯誤率
  - [ ] 使用率（當月應收查詢次數、標記收款次數）
- [ ] 收集用戶反饋

## 完成標準

### 功能完整性
- [x] 當月應收款項清單正確顯示
- [x] 打勾功能正確標記款項為已收
- [x] 統計卡片數據準確（移除收款率、新增當月應收總額）
- [x] 報價單編號和期數資訊正確顯示
- [x] 逾期判斷邏輯正確

### 效能達標
- [x] 當月應收清單載入時間 < 500ms
- [x] 標記收款操作回應時間 < 300ms
- [x] 完整頁面載入時間 < 2s

### 品質保證
- [x] 所有單元測試通過
- [x] 所有整合測試通過
- [x] E2E 測試通過
- [x] 無障礙性測試通過
- [x] 跨瀏覽器測試通過
- [x] ESLint 和 TypeScript 檢查無錯誤

### 文件完整
- [x] CHANGELOG.md 更新
- [x] API 文件更新（如有）
- [x] 程式碼註解完整

## 注意事項

### 開發時需注意
1. **Transaction 正確性**：確保 `markScheduleAsCollected()` 使用 transaction 包裹所有資料庫操作
2. **權限驗證**：所有 API 端點都需驗證 `user_id === session.user.id`
3. **樂觀更新**：前端使用樂觀更新提升 UX，但需處理錯誤回復
4. **索引效能**：驗證資料庫索引正確使用，避免全表掃描
5. **響應式設計**：確保手機版和桌面版都有良好體驗

### 測試時需注意
1. **邊界情況**：測試當月無應收款項、全部已收、全部逾期等情境
2. **錯誤處理**：測試 API 錯誤、網路錯誤、權限錯誤等情境
3. **並發操作**：測試同時標記多筆款項的情況
4. **資料一致性**：驗證 transaction rollback 正確處理錯誤

### 部署時需注意
1. **資料庫索引**：在離峰時段創建索引，避免鎖表
2. **向後相容**：確保新 API 不影響現有功能
3. **監控**：密切監控部署後的錯誤日誌和效能指標
4. **Rollback 準備**：準備好 rollback 計畫以防萬一
