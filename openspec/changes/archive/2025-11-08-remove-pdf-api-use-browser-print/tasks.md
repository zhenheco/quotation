# 移除 PDF API 並實作瀏覽器列印功能

## 前置條件

**此提案僅在以下情況實施**：
- [ ] 已完成 Cloudflare 本地測試（`pnpm run preview:cf`）
- [ ] 已驗證 PDF API 在免費版有 CPU 限制問題
- [ ] 使用者同意改用瀏覽器列印方案

**如果 PDF API 在免費版正常運作，則此提案可暫緩或取消。**

---

## 1. 前端列印功能實作

### 1.1 建立列印專用 CSS
- [ ] 1.1.1 建立 `app/[locale]/quotations/[id]/print.css`
- [ ] 1.1.2 定義 `@media print` 樣式：
  - 隱藏導航列、側邊欄
  - 調整頁面邊距（A4 紙張）
  - 確保表格不被截斷（`page-break-inside: avoid`）
  - 移除背景色（節省墨水）
- [ ] 1.1.3 測試列印預覽效果（Chrome、Safari、Firefox）

### 1.2 報價單預覽頁面加入列印按鈕
- [ ] 1.2.1 編輯 `app/[locale]/quotations/[id]/page.tsx`
- [ ] 1.2.2 加入「列印/儲存為 PDF」按鈕：
  ```typescript
  <button
    onClick={() => window.print()}
    className="..."
  >
    {t('quotation.print_or_save_pdf')}
  </button>
  ```
- [ ] 1.2.3 加入說明文字：「點擊後選擇『另存為 PDF』即可儲存檔案」
- [ ] 1.2.4 新增 i18n 翻譯：
  - `zh.json`: `"quotation.print_or_save_pdf": "列印或儲存為 PDF"`
  - `en.json`: `"quotation.print_or_save_pdf": "Print or Save as PDF"`

### 1.3 批次列印功能（如需要）
- [ ] 1.3.1 檢查是否有批次匯出功能（`app/api/quotations/batch/export`）
- [ ] 1.3.2 如有，評估保留或移除：
  - 選項 A：移除（建議）
  - 選項 B：改為前端逐個開啟並列印
- [ ] 1.3.3 更新 UI 移除「批次下載 PDF」按鈕（如有）

## 2. Email 模板調整

### 2.1 移除 PDF 下載連結
- [ ] 2.1.1 編輯 `lib/templates/quotation-email.ts`
- [ ] 2.1.2 移除 `downloadUrl` 參數：
  ```typescript
  // ❌ 移除
  downloadUrl?: string
  ```
- [ ] 2.1.3 修改 Email HTML：
  ```html
  <!-- 原本 -->
  <a href="${downloadUrl}">下載 PDF</a>

  <!-- 改為 -->
  <a href="${viewUrl}">檢視報價單</a>
  ```
- [ ] 2.1.4 調整按鈕文字和說明：
  - 中文：「檢視完整報價單」
  - 英文：「View Full Quotation」

### 2.2 更新 Email 發送 API
- [ ] 2.2.1 編輯 `app/api/quotations/[id]/send/route.ts`
- [ ] 2.2.2 移除 `downloadUrl` 傳遞（line 61）：
  ```typescript
  const emailHTML = generateQuotationEmailHTML({
    // ... 其他參數
    viewUrl: `${baseUrl}/${locale}/quotations/${id}`,
    // downloadUrl: `...`  // ❌ 移除此行
  })
  ```

### 2.3 批次發送 Email 調整（如有）
- [ ] 2.3.1 檢查 `app/api/quotations/batch/send/route.ts`
- [ ] 2.3.2 同步移除 `downloadUrl` 參數

## 3. 移除後端 PDF 生成邏輯

### 3.1 移除 PDF API 路由
- [ ] 3.1.1 刪除 `app/api/quotations/[id]/pdf/route.tsx`
- [ ] 3.1.2 刪除 `app/api/quotations/batch/export/` 目錄（如有）

### 3.2 移除 PDF 生成邏輯
- [ ] 3.2.1 刪除 `lib/pdf/generator.ts`（如檔案存在）
- [ ] 3.2.2 決定 `lib/pdf/QuotationPDFTemplate.tsx` 處理方式：
  - 選項 A：完全刪除（如不再使用）
  - 選項 B：改寫為 HTML 組件用於預覽頁面
- [ ] 3.2.3 移除 `@react-pdf/renderer` 依賴：
  ```bash
  pnpm remove @react-pdf/renderer
  ```

### 3.3 更新前端 PDF 連結
- [ ] 3.3.1 搜尋所有引用 PDF API 的地方：
  ```bash
  grep -r "/api/quotations.*pdf" app/
  ```
- [ ] 3.3.2 移除或替換為列印功能
- [ ] 3.3.3 特別檢查：
  - 報價單列表頁面（下載按鈕）
  - 報價單詳情頁面（下載按鈕）
  - 任何「匯出 PDF」功能

## 4. 測試與驗證

### 4.1 列印功能測試
- [ ] 4.1.1 Chrome 瀏覽器測試：
  - 開啟報價單預覽頁面
  - 點擊「列印/儲存為 PDF」
  - 檢查列印預覽樣式正確
  - 另存為 PDF 並開啟檢查
- [ ] 4.1.2 Safari 瀏覽器測試（macOS/iOS）
- [ ] 4.1.3 Firefox 瀏覽器測試
- [ ] 4.1.4 Edge 瀏覽器測試（Windows）

### 4.2 Email 功能測試
- [ ] 4.2.1 發送測試 Email
- [ ] 4.2.2 檢查 Email 內容：
  - 無「下載 PDF」按鈕
  - 有「檢視報價單」連結
  - 連結可正常開啟預覽頁面
- [ ] 4.2.3 測試中英文 Email 樣式

### 4.3 迴歸測試
- [ ] 4.3.1 報價單建立流程正常
- [ ] 4.3.2 報價單編輯功能正常
- [ ] 4.3.3 報價單狀態更新正常（發送後變為 'sent'）
- [ ] 4.3.4 客戶管理功能正常

### 4.4 效能驗證
- [ ] 4.4.1 測試報價單預覽頁面載入速度
- [ ] 4.4.2 測試 Email 發送速度（應 < 1 秒）
- [ ] 4.4.3 Cloudflare Workers 環境測試（如已遷移）：
  - 檢查無 CPU 限制錯誤
  - 檢查回應時間 < 500ms

## 5. 文件更新

### 5.1 更新使用者文件
- [ ] 5.1.1 更新 `README.md`（如有 PDF 相關說明）
- [ ] 5.1.2 建立「如何儲存報價單為 PDF」說明：
  ```markdown
  ## 儲存報價單為 PDF
  1. 開啟報價單預覽頁面
  2. 點擊「列印或儲存為 PDF」按鈕
  3. 在列印對話框中選擇「另存為 PDF」
  4. 選擇儲存位置
  ```

### 5.2 更新開發者文件
- [ ] 5.2.1 記錄架構變更：移除 PDF 生成，改用瀏覽器列印
- [ ] 5.2.2 更新 API 文件（移除 `/api/quotations/[id]/pdf`）
- [ ] 5.2.3 更新環境變數文件（如有 PDF 相關變數需移除）

### 5.3 更新 CHANGELOG
- [ ] 5.3.1 記錄變更：
  ```markdown
  ## [版本號] - YYYY-MM-DD
  ### Changed
  - 移除後端 PDF 生成功能，改用瀏覽器列印
  - 報價單 Email 移除「下載 PDF」連結，改為「檢視報價單」

  ### Added
  - 報價單預覽頁面新增「列印/儲存為 PDF」按鈕
  - 列印專用 CSS 樣式優化

  ### Removed
  - 移除 `/api/quotations/[id]/pdf` API 端點
  - 移除 `@react-pdf/renderer` 依賴
  ```

## 6. 部署與驗證

### 6.1 本地驗證
- [ ] 6.1.1 執行完整測試套件（如有）：
  ```bash
  pnpm test
  ```
- [ ] 6.1.2 執行 lint 和 typecheck：
  ```bash
  pnpm run lint
  pnpm run build
  ```

### 6.2 Cloudflare 環境測試（如已遷移）
- [ ] 6.2.1 部署到 Cloudflare Preview 環境
- [ ] 6.2.2 驗證所有功能正常
- [ ] 6.2.3 確認 CPU 使用率正常（< 10ms）

### 6.3 正式部署
- [ ] 6.3.1 建立 Git commit：
  ```
  移除 PDF API，改用瀏覽器列印功能

  - 移除後端 PDF 生成邏輯和 API 端點
  - 報價單預覽頁面新增列印按鈕
  - Email 連結改為線上預覽
  - 新增列印專用 CSS 樣式

  原因：確保 Cloudflare Workers 免費版相容（CPU < 10ms）

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- [ ] 6.3.2 推送到 main 分支（觸發自動部署）
- [ ] 6.3.3 監控部署狀態和錯誤日誌

## 7. 用戶溝通（如需要）

### 7.1 內部通知
- [ ] 7.1.1 通知團隊成員功能變更
- [ ] 7.1.2 提供新的操作說明
- [ ] 7.1.3 收集使用者回饋

### 7.2 外部客戶（如有影響）
- [ ] 7.2.1 評估是否需要通知客戶
- [ ] 7.2.2 準備說明文件或 FAQ

## 預估時程

| 階段 | 任務 | 預估時間 |
|------|------|----------|
| 1. 前端列印功能 | 1.1-1.3 | 2-3 小時 |
| 2. Email 調整 | 2.1-2.3 | 1 小時 |
| 3. 移除後端邏輯 | 3.1-3.3 | 1 小時 |
| 4. 測試驗證 | 4.1-4.4 | 2-3 小時 |
| 5. 文件更新 | 5.1-5.3 | 1 小時 |
| 6. 部署 | 6.1-6.3 | 1 小時 |
| **總計** | **43 項任務** | **1-2 天** |

## 回滾計劃

如果列印方案不被接受，可快速回滾：
1. 恢復 `app/api/quotations/[id]/pdf/route.tsx`
2. 重新安裝 `@react-pdf/renderer`
3. 恢復 Email 的 `downloadUrl`
4. 升級 Cloudflare 到付費版（$5/月）

## 成功標準

- ✅ 所有任務完成（43/43）
- ✅ 報價單可正常列印/儲存為 PDF
- ✅ Email 發送功能正常
- ✅ Cloudflare 免費版 CPU 使用率 < 10ms
- ✅ 無迴歸錯誤
- ✅ 用戶接受新的操作流程
