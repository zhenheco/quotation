# quotation-branding-display Specification

## Purpose
TBD - created by archiving change quotation-branding. Update Purpose after archive.
## Requirements
### Requirement: 報價單左上角顯示公司 Logo

報價單頁面 **SHALL** 在左上角位置顯示公司 Logo（基於 Nielsen Norman Group 的 UX 研究，89% 用戶更容易記住左上角的 Logo），且在螢幕顯示和列印輸出中都能正常呈現。

#### Scenario: 公司已上傳 Logo 時在左上角顯示

**Given** 公司設定中已上傳 Logo（`company_logo_url` 不為 null）
**When** 用戶查看報價單詳細頁面
**Then** 應在報價單**左上角**顯示公司 Logo
**And** Logo 應使用 Next.js Image 組件載入
**And** Logo 最大寬度為 200px，最大高度為 80px
**And** Logo 應保持原始長寬比（`object-contain`）
**And** 在手機版（< 768px）Logo 最大寬度縮小至 150px
**And** 在列印時 Logo 最大寬度為 150px

#### Scenario: 公司未上傳 Logo 時顯示公司名稱

**Given** 公司設定中未上傳 Logo（`company_logo_url` 為 null）
**When** 用戶查看報價單詳細頁面
**Then** Logo 區域應顯示公司名稱（作為後備）
**And** 公司名稱應使用 `h1` 標籤，字體大小 `text-2xl`
**And** 報價單佈局應保持正常，不留空白

#### Scenario: Logo 載入失敗時優雅降級

**Given** 公司已上傳 Logo 但圖片載入失敗（404 或網路錯誤）
**When** Next.js Image 組件觸發 `onError` 事件
**Then** 應隱藏該圖片元素（`display: none`）
**And** 可選擇性顯示公司名稱作為後備
**And** 不應顯示破損圖片圖標

---

### Requirement: 報價單右上角顯示公司資訊

報價單頁面 **SHALL** 在右上角（與 Logo 同一水平區塊）顯示公司詳細資訊，採用右對齊佈局。

#### Scenario: 顯示完整公司資訊在右上角

**Given** 報價單屬於某個公司
**When** 用戶查看報價單詳細頁面
**Then** 應在頁面右上角顯示公司資訊
**And** 公司資訊應包含：公司名稱、統一編號、電話、Email
**And** 所有資訊應右對齊（`text-right`）
**And** 公司名稱字體較大（`text-lg font-semibold`）
**And** 其他資訊使用灰色輔助文字（`text-gray-600 text-sm`）
**And** 在手機版（< 768px）應移至 Logo 下方，改為左對齊

---

### Requirement: 總計區域右下方顯示報價專用章

報價單頁面 **SHALL** 在總計區域下方的右側顯示報價專用章，符合亞洲商業文件的傳統習慣（印章蓋在金額附近代表確認）。

#### Scenario: 公司已上傳章時顯示在總計右下方

**Given** 公司設定中已上傳報價專用章（`company_signature_url` 不為 null）
**When** 用戶查看報價單詳細頁面
**Then** 應在總計金額下方 6 個間距單位（`mt-6`）處顯示報價專用章
**And** 章應靠右對齊（`justify-end`）
**And** 章應使用 Next.js Image 組件載入
**And** 章最大寬度和高度均為 150px（保持正方形）
**And** 章應保持原始長寬比（`object-contain`）
**And** 在列印時章最大寬度縮小至 120px
**And** 章不應被分頁截斷（`page-break-inside: avoid`）

#### Scenario: 公司未上傳章時不顯示

**Given** 公司設定中未上傳報價專用章（`company_signature_url` 為 null）
**When** 用戶查看報價單詳細頁面
**Then** 章區域應完全不渲染
**And** 總計區域應保持正常佈局
**And** 不應留下空白佔位

#### Scenario: 章載入失敗時優雅降級

**Given** 公司已上傳章但圖片載入失敗
**When** Next.js Image 組件觸發 `onError` 事件
**Then** 應隱藏該圖片元素
**And** 不應顯示破損圖片圖標

---

### Requirement: 報價單 API 包含公司品牌資訊

報價單查詢 API **MUST** 包含關聯公司的完整品牌資訊（Logo、簽章和公司詳細資訊），透過 JOIN `companies` 表取得。

#### Scenario: API 回傳包含公司品牌 URL 和資訊

**Given** 報價單屬於某個公司（`quotations.company_id` 不為 null）
**When** 前端調用 `GET /api/quotations/:id`
**Then** 回應應包含以下欄位：
  - `company_logo_url`: string | null（公司 Logo URL）
  - `company_signature_url`: string | null（報價專用章 URL）
  - `company_name`: { zh: string, en: string }（公司名稱）
  - `company_tax_id`: string | null（統一編號）
  - `company_phone`: string | null（電話）
  - `company_email`: string | null（Email）
**And** 如果公司已上傳 Logo/章，URL 應為有效的 Supabase Storage 公開 URL
**And** 如果公司未上傳，這些欄位應為 `null`
**And** 公司名稱應為 JSON 物件，包含中英文

#### Scenario: API 效能優化

**Given** 需要查詢報價單的公司資訊
**When** API 執行資料庫查詢
**Then** 應使用 LEFT JOIN `companies` 表（一次查詢取得所有資料）
**And** 不應使用 N+1 查詢模式
**And** 應在 DAL 層處理 JOIN 邏輯

---

### Requirement: 列印樣式支援品牌元素

列印 CSS **SHALL** 確保 Logo、章和公司資訊在 PDF 輸出中正確顯示、清晰可見且不變形。

#### Scenario: 列印時 Logo 和章清晰顯示

**Given** 報價單包含公司 Logo 和章
**When** 用戶點擊列印按鈕（或使用瀏覽器列印功能）
**Then** Logo 應在 PDF 左上角清晰顯示
**And** 公司資訊應在 PDF 右上角清晰顯示（黑白列印時也清晰）
**And** 章應在 PDF 總計區域右下方清晰顯示
**And** 所有圖片應保持原始比例不變形（`object-contain`）
**And** 圖片不應被分頁截斷（`page-break-inside: avoid`）
**And** 圖片顏色應正確呈現（`print-color-adjust: exact`）

#### Scenario: 列印時調整圖片大小以節省空間

**Given** 報價單需要列印為 PDF
**When** 應用列印樣式（`@media print`）
**Then** Logo 最大寬度應縮小至 150px（從桌面版的 200px）
**And** 章最大寬度應縮小至 120px（從桌面版的 150px）
**And** 所有陰影和圓角應被移除（`shadow-none`）
**And** 頁面應使用 A4 尺寸（`@page { size: A4 }`）

#### Scenario: 響應式設計適配不同裝置

**Given** 用戶在不同裝置上查看報價單
**When** 裝置螢幕寬度 < 768px（手機版）
**Then** Logo 最大寬度應為 150px
**And** 公司資訊應移至 Logo 下方，改為左對齊
**And** 章最大寬度維持 150px
**And** 所有區塊應改為單欄佈局
**When** 裝置螢幕寬度 >= 768px（桌面版）
**Then** Logo 和公司資訊應在同一水平線
**And** Logo 在左，公司資訊在右
**And** Logo 最大寬度為 200px

