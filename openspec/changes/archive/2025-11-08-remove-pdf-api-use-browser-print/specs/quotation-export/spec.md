# 報價單匯出功能規格

## ADDED Requirements

### Requirement: 瀏覽器列印功能
系統 SHALL 提供瀏覽器原生列印功能，讓使用者可將報價單儲存為 PDF 或直接列印。

#### Scenario: 使用者點擊列印按鈕
- **GIVEN** 使用者在報價單預覽頁面（`/[locale]/quotations/[id]`）
- **WHEN** 點擊「列印或儲存為 PDF」按鈕
- **THEN** 瀏覽器應開啟列印對話框
- **AND** 列印預覽應顯示最佳化的樣式（隱藏導航列、調整邊距）
- **AND** 使用者可選擇「另存為 PDF」或直接列印

#### Scenario: 列印樣式最佳化
- **GIVEN** 使用者開啟列印預覽
- **WHEN** 檢視列印版面
- **THEN** 應隱藏導航列、側邊欄、按鈕等非必要元素
- **AND** 頁面邊距應適合 A4 紙張
- **AND** 表格不應被分頁截斷
- **AND** 背景色應移除（節省墨水）

#### Scenario: 多瀏覽器相容性
- **GIVEN** 使用者使用不同瀏覽器
- **WHEN** 執行列印功能
- **THEN** 應在 Chrome、Safari、Firefox、Edge 正常運作
- **AND** PDF 輸出品質應一致

### Requirement: Email 連結調整
系統 SHALL 在報價單 Email 中提供線上預覽連結，不再提供 PDF 下載連結。

#### Scenario: Email 包含預覽連結
- **GIVEN** 系統發送報價單 Email
- **WHEN** 客戶收到 Email
- **THEN** Email 應包含「檢視報價單」按鈕/連結
- **AND** 連結應導向線上預覽頁面（`/[locale]/quotations/[id]`）
- **AND** 不應包含「下載 PDF」連結

#### Scenario: 客戶點擊 Email 連結
- **GIVEN** 客戶收到報價單 Email
- **WHEN** 點擊「檢視報價單」連結
- **THEN** 應開啟報價單預覽頁面
- **AND** 頁面應顯示完整報價資訊
- **AND** 頁面應包含「列印/儲存為 PDF」按鈕

### Requirement: 列印專用 CSS
系統 SHALL 提供列印專用的 CSS 樣式，確保列印輸出品質。

#### Scenario: 套用列印樣式
- **GIVEN** 使用者開啟列印預覽
- **WHEN** 瀏覽器套用 `@media print` 樣式
- **THEN** 應隱藏 `.no-print` 類別的元素
- **AND** 應移除背景顏色和圖片
- **AND** 應調整字體大小和行距以適合紙張
- **AND** 應設定 `page-break-inside: avoid` 避免表格分頁

#### Scenario: 頁面分頁控制
- **GIVEN** 報價單內容超過一頁
- **WHEN** 列印長報價單
- **THEN** 標題區塊不應被分頁截斷
- **AND** 產品列表項目應完整顯示在同一頁
- **AND** 總計區塊應顯示在最後一頁底部

## REMOVED Requirements

### Requirement: 後端 PDF 生成 API
**理由**：CPU 密集操作不適合 Cloudflare Workers 免費版（10ms 限制）

**遷移**：
- 移除 `/api/quotations/[id]/pdf` API 端點
- 移除 `/api/quotations/batch/export` 批次匯出 API（如有）
- 改用瀏覽器原生列印功能

### Requirement: PDF 下載連結（Email）
**理由**：Email 改為提供線上預覽連結

**遷移**：
- Email 模板移除 `downloadUrl` 參數
- 按鈕文字從「下載 PDF」改為「檢視報價單」
- 連結目標從 `/api/quotations/[id]/pdf` 改為 `/[locale]/quotations/[id]`

### Requirement: @react-pdf/renderer 依賴
**理由**：不再需要後端 PDF 生成

**遷移**：
- 執行 `pnpm remove @react-pdf/renderer`
- 移除 `lib/pdf/generator.ts`
- `lib/pdf/QuotationPDFTemplate.tsx` 改為 HTML 組件（或移除）

## MODIFIED Requirements

### Requirement: 報價單 Email 發送
系統 SHALL 發送包含線上預覽連結的 HTML Email，不再附加或連結 PDF 檔案。

**變更**：Email 內容調整，移除 PDF 相關連結

#### Scenario: 發送報價單 Email（調整後）
- **GIVEN** 使用者點擊「發送報價單」
- **WHEN** 系統發送 Email
- **THEN** Email 應為 HTML 格式
- **AND** 應包含報價摘要（報價單號、日期、總金額）
- **AND** 應包含「檢視完整報價單」按鈕
- **AND** 按鈕連結應為 `${baseUrl}/[locale]/quotations/[id]`
- **AND** 不應包含 PDF 下載連結或附件

#### Scenario: Email 發送速度（改善）
- **GIVEN** 系統發送報價單 Email
- **WHEN** 執行發送操作
- **THEN** 發送應在 1 秒內完成
- **AND** CPU 使用率應 < 5ms（無 PDF 生成）

### Requirement: 報價單預覽頁面
系統 SHALL 在報價單預覽頁面提供列印功能按鈕。

**變更**：新增列印按鈕和說明文字

#### Scenario: 預覽頁面顯示列印按鈕
- **GIVEN** 使用者開啟報價單預覽頁面
- **WHEN** 頁面載入完成
- **THEN** 應顯示「列印或儲存為 PDF」按鈕
- **AND** 應顯示說明文字：「點擊後選擇『另存為 PDF』即可儲存檔案」
- **AND** 按鈕應在明顯位置（頁面頂部或底部）

#### Scenario: 預覽頁面載入速度（改善）
- **GIVEN** 使用者開啟報價單預覽頁面
- **WHEN** 頁面載入
- **THEN** 初始載入應 < 500ms
- **AND** CPU 使用率應 < 10ms（符合免費版限制）
