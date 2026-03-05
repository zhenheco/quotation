# Phase 2: 發票匯入（CSV + 手動輸入 + 歷史匯入）

> 日期：2026-03-06
> 狀態：待審查 R2
> 前置：Phase 1 已完成（tax_declarations + declared_period_id + 留抵結轉 + 鎖定機制）
> CC + Gemini 交叉審查：R1 (4🔴 3🟡) → R2 pending

---

## 規劃摘要

擴展現有 batch import 基礎設施（PapaParse + BatchImportModal），支援會計發票匯入：
1. 電子發票平台 CSV 匯入（財政部標準格式，整合既有 `mof-excel-parser.ts`）
2. 手動新增發票（手開發票用表單，不需 OCR）
3. 歷史資料批次匯入（標記 `is_historical_import`，指定 `declared_period_id`）
4. 匯入後自動分配到對應申報期別

### R1 🔴 修正項目
- [x] 整合 `mof-excel-parser.ts` 的民國年轉換邏輯（`parseRocDate`、`rocToWesternYear`）
- [x] 進項 vs 銷項自動識別：依 CSV 標題偵測（`detectImportMode`），或在 UI 提供明確選擇
- [x] 往來對象自動建立：匯入時依統編搜尋，不存在則自動建立
- [x] 課稅別自動推論：依 `untaxed_amount * 0.05 ≈ tax_amount` 判斷應稅/零稅率/免稅

---

## 驗收標準

### CSV 匯入
- [ ] Case 1: 上傳財政部標準 CSV，正確解析所有欄位（發票號碼、日期、金額、稅額、對象）
- [ ] Case 2: 重複發票號碼偵測（同 company_id + number → skip/update）
- [ ] Case 3: 欄位驗證（必填、金額格式、日期格式、統一編號 8 碼）
- [ ] Case 4: Big5 編碼 CSV 正確解析（台灣 Excel 匯出常見）
- [ ] Case 5: 進項/銷項自動偵測（CSV 含「賣方統編」→ 進項；「買方統編」→ 銷項）
- [ ] Case 6: 民國年日期正確轉換（113/03/06 → 2024-03-06）
- [ ] Case 7: 課稅別自動推論（稅額=未稅*5% → 應稅；稅額=0+未稅>0 → 零稅率/免稅）

### 往來對象
- [ ] Case 8: 匯入時統編已存在 → 自動關聯 counterparty_id
- [ ] Case 9: 匯入時統編不存在 → 自動建立 supplier/customer 並關聯

### 歷史匯入
- [ ] Case 10: 匯入時指定 declared_period_id，標記 is_historical_import = true
- [ ] Case 11: 跨期發票正確分配（invoice_date 與 declared_period_id 可不同期）
- [ ] Case 12: 匯入到已 submitted 期別被拒絕（鎖定機制）

### 資料完整性
- [ ] Case 13: 匯入的發票能在 401 報表正確顯示
- [ ] Case 14: 進項扣抵代號正確（預設：可扣抵=Y → 1(費用)，不可扣抵 → 2；UI 可批量改為 3(固定資產)）
- [ ] Case 15: 退出/折讓發票匯入（return_type = RETURN/ALLOWANCE）
- [ ] Case 16: 總稅額計算含匯入發票後仍正確

---

## 技術選型

| 項目 | 選擇 | 理由 |
|------|------|------|
| CSV 解析 | PapaParse（既有 `csv-parser.ts`） | 支援 UTF-8/Big5 自動偵測 |
| 財政部格式 | `mof-excel-parser.ts`（既有） | 已有民國年解析、進銷項偵測、欄位映射 |
| 匯入框架 | BatchImportModal（既有） | 擴展 ImportResourceType + 新增 `extraPayload` prop |
| 驗證 | 新增 `invoice-validator.ts` | 整合 `parseRocDate` + 課稅別推論 |
| API | `/api/batch-import/invoices` | 遵循既有 `/api/batch-import/[resource]` 模式 |
| 往來對象 | DAL 層 `findOrCreateCounterparty` | 依統編搜尋 → 不存在則建立 |

---

## 測試計劃

### 單元測試
- `tests/unit/services/batch-import/invoice-validator.test.ts`
  - 必填欄位驗證（number, date, untaxed_amount）
  - 統一編號格式驗證（8 碼數字）
  - 金額格式驗證（正數、千分位、負數折讓）
  - 民國年日期正確轉換（113/03/06、1130306、113-03-06）
  - 西元年日期正確轉換（2024/03/06、2024-03-06）
  - 課稅別自動推論（應稅、零稅率、免稅）
  - 扣抵代號推論（可扣抵=Y → 1，N → 2）
  - 退出折讓 return_type 驗證
  - 進項/銷項模式偵測（依標題欄位）
  - 驗證錯誤含原始值回饋

### 整合測試
- `tests/integration/api/batch-import/invoices.test.ts`
  - 正常匯入 5 筆進項發票
  - 正常匯入銷項發票
  - 重複發票處理（skip/update）
  - 歷史匯入 + declared_period_id 分配
  - 鎖定期別拒絕匯入
  - 往來對象自動建立
  - 民國年 CSV 匯入

---

## TDD 實作步驟

### Step 1: 發票匯入範本 + 欄位定義 🔴🟢🔵
1. 🔴 測試 `getColumnsForResource('invoices')` 返回正確欄位
2. 🟢 在 `template-columns.ts` 新增 invoices 欄位（整合 MOF_PURCHASE_COLUMNS/MOF_SALES_COLUMNS）
3. 🟢 新增 `public/templates/invoice-import-template.csv`
4. 🟢 擴展 `ImportResourceType` 加入 `'invoices'`
5. 🔵 重構

### Step 2: 發票驗證器 + 民國年轉換 🔴🟢🔵
1. 🔴 撰寫 `invoice-validator.test.ts`
   - 必填驗證、民國年轉換、課稅別推論、扣抵代號推論
   - 驗證錯誤含原始值
2. 🟢 實作 `lib/services/batch-import/validators/invoice-validator.ts`
   - 整合 `mof-excel-parser.ts` 的 `parseRocDate`、`detectImportMode`
   - 課稅別推論：`tax_amount / untaxed_amount ≈ 0.05` → 應稅
   - 扣抵代號：可扣抵=Y → 1(費用)，N → 2(不可扣抵)
3. 🔵 重構：從 `mof-excel-parser.ts` 抽出共用日期函數到 `lib/utils/tw-date.ts`

### Step 3: DAL — 批量新增發票 + 往來對象自動建立 🔴🟢🔵
1. 🔴 測試 `bulkCreateInvoices` DAL 函數
2. 🔴 測試 `findOrCreateCounterparty` DAL 函數
3. 🟢 實作 `bulkCreateInvoices`（含重複檢查）
4. 🟢 實作 `findOrCreateCounterparty`（依統編搜尋 → 不存在則建立）
5. 🔵 重構

### Step 4: 發票匯入 API 🔴🟢🔵
1. 🔴 撰寫整合測試（匯入、重複、鎖定、往來對象建立）
2. 🟢 實作 `app/api/batch-import/invoices/route.ts`
   - POST: 批量匯入發票到 acc_invoices
   - 支援 declared_period_id 指定
   - 歷史匯入標記
   - 鎖定期別檢查（submitted/closed → 拒絕）
   - 往來對象自動建立
3. 🔵 重構

### Step 5: UI — 匯入入口 + 歷史匯入選項 🔴🟢🔵
1. 🟢 擴展 BatchImportModal 支援 'invoices' 資源類型
   - 新增 `extraPayload` prop 傳遞 `declared_period_id`
   - 財政部格式一鍵映射按鈕
   - 預覽畫面支援批量修改扣抵代號（費用→固定資產）
2. 🟢 在 TaxReportDashboard 加入「匯入發票」按鈕
   - 自動帶入當前期別的 declared_period_id
   - 歷史匯入 toggle
3. 🟢 擴展 RESOURCE_LABELS 和 VALIDATORS 映射
4. 🔵 重構

---

## 預期測試覆蓋

| 層級 | 測試數量 | 覆蓋目標 |
|------|---------|---------|
| 單元（validator） | ~18 | 驗證規則 + 民國年 + 課稅別推論 |
| 單元（DAL） | ~6 | bulkCreate + findOrCreateCounterparty |
| 整合（API） | ~10 | 匯入 + 重複 + 鎖定 + 往來對象 |
| 合計 | ~34 | |
