# Proposal: 報價單品牌元素顯示

## 概述

在報價單列印和 PDF 輸出中增加公司 Logo 和報價專用章的顯示功能，基於專業商業文件的最佳實踐和 UX 研究，提升報價單的專業形象和品牌識別度。

## 背景

### 現有功能

目前系統已具備：
- 公司設定頁面的 Logo 和簽章上傳功能（`CompanySettingsForm.tsx`）
- 資料庫中的 `logo_url` 和 `signature_url` 欄位（`companies` 表）
- 報價單列印樣式（`print.css`）
- 完整的技術棧：Tailwind CSS 4、Next.js Image、lucide-react

但報價單詳細頁面（`QuotationDetail.tsx`）在列印時**未顯示**這些品牌元素。

### 設計研究基礎

本提案基於以下研究和最佳實踐：

1. **Nielsen Norman Group UX 研究**：
   - 用戶有 89% 機率記住放在左上角的 Logo
   - 左對齊的 Logo 符合自然視線流動

2. **專業商業文件慣例**：
   - Logo 應放在頁面左上角
   - 公司資訊應右對齊於 Logo 旁邊
   - 印章應放在總計金額附近（亞洲商業文件傳統）

3. **已研究的專業範例**：
   - Invoify（shadcn UI 發票生成器）
   - 多個專業發票和報價單模板

## 目標

### 主要目標

1. **在報價單左上角顯示公司 Logo**
   - 位置：頁面左上角（基於 UX 研究）
   - 尺寸：最大 200px 寬，80px 高
   - 響應式：手機版縮小至 150px
   - 優雅降級：無 Logo 時顯示公司名稱

2. **在報價單右上角顯示公司資訊**
   - 位置：與 Logo 同行，右對齊
   - 內容：公司名稱、統編、電話、Email
   - 樣式：層次清晰，灰色輔助文字

3. **在總計區域右下方顯示報價專用章**
   - 位置：總計金額下方，靠右對齊
   - 尺寸：最大 150px × 150px
   - 符合亞洲商業文件傳統

### 次要目標

- 確保所有品牌元素在 PDF 列印時清晰可見
- 保持響應式設計（桌面、平板、手機）
- 優化圖片載入效能（使用 Next.js Image）

## 設計決策

### 不使用 shadcn UI 的原因

經過評估，決定**不引入 shadcn UI**：

**理由**：
1. 專案已有完整工具鏈（Tailwind CSS 4、lucide-react、@headlessui/react）
2. 報價單 UI 主要是靜態展示，不需要複雜交互組件
3. 避免依賴膨脹和增加 bundle size
4. 純 Tailwind 即可滿足所有設計需求

**使用的技術**：
- Tailwind CSS 4（響應式佈局和樣式）
- Next.js Image（圖片優化和 lazy loading）
- 自訂 print.css（列印優化）

## 影響範圍

### 前端變更

- **主要檔案**：`app/[locale]/quotations/[id]/QuotationDetail.tsx`
  - 新增 Logo 區域（左上角）
  - 調整公司資訊區塊（右上角）
  - 新增印章區域（總計下方）

- **樣式檔案**：`app/[locale]/quotations/[id]/print.css`
  - 優化圖片列印樣式
  - 確保品牌元素不被分頁截斷
  - 調整響應式斷點

### 後端變更

- **API 調整**：報價單查詢 API
  - 在回傳資料中包含 `company_logo_url` 和 `company_signature_url`
  - JOIN `companies` 表取得品牌資訊

- **類型定義**：`types/database.types.ts`
  - 更新 `Quotation` 介面加入品牌欄位

## 非目標

明確**不包含**在本次變更中：

- ❌ 不修改公司設定上傳功能（已完成且運作正常）
- ❌ 不修改資料庫結構（已有 `logo_url` 和 `signature_url` 欄位）
- ❌ 不影響報價單的其他顯示內容和功能
- ❌ 不引入 shadcn UI 或其他新的 UI 框架
- ❌ 不修改 PDF 生成方式（繼續使用瀏覽器列印）

## 相關規格

建立新規格：
- `quotation-branding-display` - 報價單品牌元素顯示規格

詳細設計文件：
- `design.md` - 完整的 UI 設計規範、技術架構和實作細節

## 實作策略

### Phase 1: 後端準備（30 分鐘）
1. 修改報價單 DAL，JOIN companies 表
2. 更新 TypeScript 類型定義
3. 測試 API 回傳正確的品牌 URL

### Phase 2: 前端佈局（1.5 小時）
1. 實作 Logo 區域（左上角）+ 公司資訊（右上角）
2. 實作印章區域（總計下方右側）
3. 處理邊界情況（無 Logo/章時優雅降級）

### Phase 3: 列印優化（30 分鐘）
1. 調整 print.css
2. 測試各種裝置的列印效果
3. 確保圖片清晰且不被截斷

### Phase 4: 測試驗證（30 分鐘）
1. 功能測試（4 種情況：有/無 Logo × 有/無章）
2. 響應式測試（桌面、平板、手機）
3. 列印測試（Chrome、Safari、Firefox）

**總預估時間**：3 小時

## 風險與考量

### 技術風險

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 圖片載入失敗 | 低 | 使用 Next.js Image 錯誤處理，優雅降級 |
| 列印時圖片模糊 | 中 | 使用高 DPI 圖片，設定 `image-rendering` CSS |
| 響應式斷點問題 | 低 | 充分測試各種裝置 |
| PDF 中圖片缺失 | 中 | 設定 `print-color-adjust: exact` |

### 用戶體驗考量

1. **圖片大小平衡**：
   - Logo 太大會佔用空間
   - Logo 太小會不清晰
   - **解決**：基於研究設定合理尺寸（200px）

2. **缺失優雅降級**：
   - 公司未上傳 Logo 或章
   - **解決**：不顯示該區域，不留空白

3. **列印品質**：
   - 確保黑白列印也清晰
   - **解決**：測試黑白列印，調整對比度

### 效能考量

- **圖片優化**：使用 Next.js Image 自動優化
- **Lazy Loading**：非首屏圖片延遲載入
- **預估影響**：< 50KB 額外載入（兩張圖片）

## 成功指標

1. **功能完整性**：
   - ✅ 有 Logo 時正確顯示在左上角
   - ✅ 有章時正確顯示在總計右下方
   - ✅ 無品牌元素時優雅降級

2. **視覺品質**：
   - ✅ 列印 PDF 中圖片清晰
   - ✅ 響應式佈局在各裝置正常
   - ✅ 專業美觀的視覺效果

3. **效能指標**：
   - ✅ 頁面載入時間增加 < 200ms
   - ✅ 圖片總大小 < 100KB
   - ✅ 無 Layout Shift

## 參考資料

- [Nielsen Norman Group - Logo Placement](https://www.nngroup.com/articles/top-left-logo/)
- [Invoice Design Best Practices - Smashing Magazine](https://www.smashingmagazine.com/2009/11/invoice-like-a-pro/)
- [Invoify - Open Source Invoice Generator](https://github.com/al1abb/invoify)
- UX Research: 89% of users remember logos in top-left corner
