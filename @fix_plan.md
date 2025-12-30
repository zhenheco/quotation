# Ralph Fix Plan - 會計系統功能擴充

> **優先順序說明**：按 High → Medium → Low 順序實作，同一優先級內按列表順序執行

---

## 🔴 High Priority（11 項）

### 發票 Excel 上傳功能（5 項）✅

- [x] **建立 Excel 發票匯入範本**
  - 路徑：`lib/services/accounting/invoice-template.service.ts` + API 動態產生
  - Done Criteria: 範本包含所有必填欄位（發票號碼、類型、日期、未稅金額、稅額、含稅金額），附帶範例資料

- [x] **建立 InvoiceUpload.tsx 元件**
  - 路徑：`app/[locale]/accounting/invoices/InvoiceUpload.tsx`
  - Done Criteria: 支援拖曳上傳、檔案預覽、錯誤提示、進度顯示

- [x] **建立 invoice-import.service.ts**
  - 路徑：`lib/services/accounting/invoice-import.service.ts`
  - Done Criteria: 使用 exceljs 解析 Excel、驗證資料格式、回傳解析結果與錯誤清單

- [x] **建立批次匯入 API**
  - 路徑：`app/api/accounting/invoices/import/route.ts`
  - Done Criteria: 接收解析後的發票陣列、批次寫入資料庫、回傳成功/失敗筆數

- [x] **新增下載範本的 API 端點**
  - 路徑：`app/api/accounting/invoices/template/route.ts`
  - Done Criteria: 回傳 Excel 檔案、設定正確的 Content-Type 和 Content-Disposition

### 發票 AI 掃描功能（4 項）✅

- [x] **建立 InvoiceScan.tsx 元件**
  - 路徑：`app/[locale]/accounting/invoices/components/InvoiceScan.tsx`
  - Done Criteria: 支援圖片上傳（JPG/PNG/PDF）、即時預覽、載入狀態顯示

- [x] **建立 invoice-ocr.service.ts**
  - 路徑：`lib/services/accounting/invoice-ocr.service.ts`
  - Done Criteria: 呼叫 Qwen VL2.5 API、解析回傳的 JSON、回傳結構化發票資料與信心度

- [x] **建立掃描 API**
  - 路徑：`app/api/accounting/invoices/scan/route.ts`
  - Done Criteria: 接收圖片 base64、呼叫 OCR 服務、回傳辨識結果

- [x] **實作辨識結果確認/修正介面**
  - 路徑：修改 `InvoiceScan.tsx`
  - Done Criteria: 顯示辨識結果表單、低信心度欄位以黃色標示、支援手動修正後儲存

### 發票輸入整合（2 項）✅

- [x] **修改 InvoiceForm.tsx 為 Tab 介面**
  - 路徑：`app/[locale]/accounting/invoices/components/InvoiceFormTabs.tsx`
  - Done Criteria: 三個 Tab（手動輸入/Excel 上傳/AI 掃描）、Tab 切換不丟失資料

- [x] **更新 new/page.tsx 以支援新的表單元件**
  - 路徑：`app/[locale]/accounting/invoices/new/page.tsx`
  - Done Criteria: 頁面正確載入 Tab 表單、i18n 完整

---

## 🟡 Medium Priority（8 項）

### 傳票自動分錄（4 項）✅

- [x] **修改 invoice.service.ts 加入過帳時自動建立傳票邏輯**
  - 路徑：`lib/services/accounting/invoice.service.ts` + `migrations/049_rewrite_accounting_rpc.sql`
  - Done Criteria: 發票過帳時自動建立對應傳票、借貸平衡
  - ✅ 已透過 `postInvoiceWithJournalRpc` 實作

- [x] **建立發票-傳票關聯記錄**
  - 路徑：`acc_invoices.journal_entry_id` + `journal_entries.invoice_id`
  - Done Criteria: 可從發票追溯到傳票、可從傳票追溯到發票
  - ✅ 已在 migration 048 新增 `journal_entry_id` 欄位

- [ ] **新增科目對應設定介面**
  - 路徑：`app/[locale]/accounting/settings/accounts-mapping/page.tsx`
  - Done Criteria: 可設定銷項/進項發票對應的會計科目
  - ⏳ 目前使用硬編碼科目代碼，未來可擴充為可設定

- [x] **實作銷項/進項發票的預設分錄規則**
  - 路徑：`migrations/049_rewrite_accounting_rpc.sql` (`post_invoice_with_journal`)
  - Done Criteria:
    - 銷項：借 應收帳款(1131)、貸 銷貨收入(4111)+銷項稅額(2171)
    - 進項：借 進貨成本(5111)+進項稅額(2171)、貸 應付帳款(2141)
  - ✅ 已在 RPC 函數中實作

### 報表分析功能（4 項）

- [ ] **試算表：加入借貸平衡檢查與異常警示**
  - 路徑：`app/[locale]/accounting/reports/trial-balance/page.tsx`
  - Done Criteria: 顯示借貸差額、不平衡時顯示警告、異常科目標紅

- [ ] **損益表：加入毛利率、淨利率計算與期間比較**
  - 路徑：`app/[locale]/accounting/reports/income-statement/page.tsx`
  - Done Criteria: 顯示毛利率、營業利益率、淨利率、支援選擇比較期間

- [ ] **資產負債表：加入流動比率、ROA/ROE 計算**
  - 路徑：`app/[locale]/accounting/reports/balance-sheet/page.tsx`
  - Done Criteria: 顯示流動比率、速動比率、負債比率、ROA、ROE

- [ ] **為三表加入趨勢圖表**
  - 路徑：各報表頁面
  - Done Criteria: 使用 recharts、顯示月份趨勢、支援切換顯示項目

---

## 🟢 Low Priority（7 項）

### 營業稅申報（401/403）

- [ ] **建立 TaxReportPage.tsx 營業稅申報頁面**
  - 路徑：`app/[locale]/accounting/reports/tax/page.tsx`
  - Done Criteria: 顯示申報期間選擇、401/403 切換、申報資料預覽

- [ ] **建立 tax-report.service.ts 申報資料計算服務**
  - 路徑：`lib/services/accounting/tax-report.service.ts`
  - Done Criteria: 彙總發票資料、計算各項申報欄位值

- [ ] **建立 401 申報書 API**
  - 路徑：`app/api/accounting/reports/tax-401/route.ts`
  - Done Criteria: 回傳 401 申報書所需資料結構

- [ ] **建立 403 申報書 API**
  - 路徑：`app/api/accounting/reports/tax-403/route.ts`
  - Done Criteria: 回傳 403 申報書所需資料結構（零稅率銷售）

- [ ] **實作 PDF 匯出功能**
  - 路徑：`lib/services/accounting/tax-report-pdf.service.ts`
  - Done Criteria: 產出符合官方格式的 PDF 申報書

- [ ] **實作 XML 匯出功能（電子申報格式）**
  - 路徑：`lib/services/accounting/tax-report-xml.service.ts`
  - Done Criteria: 產出符合國稅局電子申報規範的 XML

- [ ] **建立發票明細核對表**
  - 路徑：`app/[locale]/accounting/reports/tax/invoice-summary/page.tsx`
  - Done Criteria: 顯示申報期間內所有發票明細、可篩選類型、可匯出

---

## ✅ Completed

- [x] 專案初始化
- [x] 會計系統基礎架構（發票、傳票、報表頁面建立）
- [x] i18n 翻譯補充（accounting namespace）
- [x] 資料庫 schema 建立（invoices, journal_entries, accounts）

---

## 📝 Notes

- 詳細需求規格請參考 `SPEC.md`
- Qwen VL2.5 API Key 需存放在 `.env`（`QWEN_API_KEY`）
- 使用 `exceljs` 套件處理 Excel 檔案（已安裝）
- 使用 `recharts` 套件繪製圖表（已安裝）
- 稅率預設 5%，需支援零稅率與免稅
- 401/403 XML 格式需符合國稅局電子申報規範

---

## ✅ 總體完成條件（Done Criteria）

當滿足以下條件時，此任務視為 **Completed**：

- [ ] 所有 High Priority 項目已完成並通過測試
- [ ] 所有 Medium Priority 項目已完成並通過測試
- [ ] 所有 Low Priority 項目已完成並通過測試
- [ ] `pnpm run lint` 無錯誤
- [ ] `pnpm run typecheck` 無錯誤
- [ ] i18n 翻譯完整（en.json, zh.json）
- [ ] 功能可在 Cloudflare Workers 環境正常運作
