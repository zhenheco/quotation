# 設計文件：報價單品牌元素顯示

## 設計原則

基於專業商業文件的最佳實踐和 UX 研究，本設計遵循以下原則：

1. **品牌識別優先**：Logo 是用戶最先注意到的元素
2. **視線自然流動**：從左上到右下的閱讀習慣
3. **資訊層次清晰**：主要資訊（Logo、標題）→ 次要資訊（公司詳情）→ 交易資訊
4. **列印友善**：確保所有元素在 PDF 中清晰可見

## UI 佈局設計

### 整體結構

基於 Nielsen Norman Group 的研究和業界最佳實踐，採用以下佈局：

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]                            [公司名稱]           │
│                                    [公司地址]           │
│                                    [聯絡資訊]           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  報價單 #QT-2024-001               發出日期: 2024-01-15 │
│  狀態: [草稿]                                           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  客戶資訊                   │  報價詳情                 │
│  [客戶名稱]                 │  有效期限: 2024-02-15     │
│                             │  幣別: TWD                │
│                             │  稅率: 5%                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  項目列表（表格）                                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                小計: TWD 10,000         │
│                                稅額: TWD 500            │
│                                總計: TWD 10,500         │
│                                                         │
│                                          [印章圖片]     │
├─────────────────────────────────────────────────────────┤
│  付款資訊                                               │
│  備註                                                   │
└─────────────────────────────────────────────────────────┘
```

### Logo 位置設計

**位置**：左上角（頁面頂部左側）

**理由**：
- Nielsen Norman Group 研究顯示：用戶有 89% 機率記住左上角的 Logo
- 符合西方和東方的閱讀習慣（從左到右，從上到下）
- 與大多數專業商業文件一致

**尺寸規範**：
- 最大寬度：200px
- 最大高度：80px
- 保持長寬比
- 響應式調整：手機版減少至 150px 寬

**實作細節**：
```tsx
<div className="flex items-start justify-between mb-8 print:mb-4">
  <div className="flex-shrink-0">
    {companyLogoUrl && (
      <Image
        src={companyLogoUrl}
        alt="Company Logo"
        width={200}
        height={80}
        className="max-w-[200px] max-h-[80px] object-contain print:max-w-[150px]"
        priority
      />
    )}
  </div>
  <div className="text-right">
    {/* 公司資訊 */}
  </div>
</div>
```

### 公司資訊位置設計

**位置**：右上角（與 Logo 同一區塊，靠右對齊）

**內容**：
- 公司名稱（中/英文）
- 統一編號
- 地址
- 電話
- Email

**樣式**：
- 右對齊（`text-right`）
- 字體大小遞減（公司名稱最大，其他資訊較小）
- 灰色輔助文字（`text-gray-600`）

### 印章位置設計

**位置**：總計區域的右下方

**理由**：
- 符合亞洲（特別是台灣）商業文件的傳統習慣
- 印章蓋在總計附近代表「確認金額無誤」
- 視覺上與簽名位置一致

**尺寸規範**：
- 最大寬度：150px
- 最大高度：150px
- 保持正方形比例（如果是圓形章）

**實作細節**：
```tsx
<div className="bg-white rounded-lg shadow p-6 print:shadow-none">
  <div className="max-w-md ml-auto space-y-2">
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">小計:</span>
      <span>TWD {subtotal}</span>
    </div>
    {/* ... 其他總計項目 ... */}
    <div className="flex justify-between text-lg font-bold border-t pt-2">
      <span>總計:</span>
      <span>TWD {total}</span>
    </div>
  </div>

  {/* 印章區域 */}
  {companySignatureUrl && (
    <div className="flex justify-end mt-6">
      <Image
        src={companySignatureUrl}
        alt="Company Stamp"
        width={150}
        height={150}
        className="max-w-[150px] max-h-[150px] object-contain print:max-w-[120px]"
      />
    </div>
  )}
</div>
```

## 技術架構

### 不使用 shadcn UI 的理由

經過評估，決定**不引入 shadcn UI**，原因如下：

1. **專案已有完整工具鏈**：
   - Tailwind CSS 4（最新版本）
   - lucide-react（圖標庫）
   - @headlessui/react（無樣式組件）
   - Next.js Image（圖片優化）

2. **報價單 UI 需求簡單**：
   - 主要是靜態展示
   - 不需要複雜的交互組件
   - 列印友善的簡潔設計

3. **避免依賴膨脹**：
   - shadcn UI 需要安裝多個組件
   - 增加 bundle size
   - 維護成本增加

4. **純 Tailwind 即可滿足需求**：
   - 響應式佈局
   - 列印樣式
   - 美觀的視覺設計

### 使用的技術元素

**圖片處理**：
- `next/image` 的 Image 組件
- 自動優化和 lazy loading
- 響應式圖片

**佈局**：
- Flexbox（`flex`, `justify-between`, `items-center`）
- Grid（項目表格）
- 響應式斷點（`md:`, `print:`）

**樣式**：
- Tailwind 工具類
- 自訂列印 CSS（`print.css`）
- 保持長寬比（`object-contain`）

## 列印和 PDF 優化

### 列印樣式規範

**顏色處理**：
```css
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
```

**圖片優化**：
```css
.company-logo,
.company-signature {
  max-width: 150px;
  height: auto;
  page-break-inside: avoid;
  image-rendering: -webkit-optimize-contrast; /* 提高清晰度 */
}
```

**避免分頁截斷**：
```css
.quotation-header,
.total-section,
.signature-section {
  page-break-inside: avoid;
}
```

### 響應式設計

**桌面版（>= 768px）**：
- Logo 200px 寬
- 雙欄佈局（客戶資訊 | 報價詳情）
- 完整的表格寬度

**手機版（< 768px）**：
- Logo 150px 寬
- 單欄佈局
- 表格水平滾動

**列印版**：
- Logo 150px 寬（節省空間）
- 移除所有陰影和圓角
- 黑白友善的配色

## 邊界情況處理

### Logo 或印章缺失時

**設計原則**：優雅降級，不影響整體佈局

**Logo 缺失**：
```tsx
{companyLogoUrl ? (
  <Image src={companyLogoUrl} {...imageProps} />
) : (
  <div className="h-20 flex items-center">
    {/* 公司名稱作為後備 */}
    <h1 className="text-2xl font-bold">{companyName}</h1>
  </div>
)}
```

**印章缺失**：
- 直接不顯示印章區域
- 總計區域保持原樣
- 不留空白佔位

### 圖片載入失敗

使用 Next.js Image 的錯誤處理：
```tsx
<Image
  src={logoUrl}
  alt="Company Logo"
  onError={(e) => {
    e.currentTarget.style.display = 'none';
  }}
  {...otherProps}
/>
```

## 可訪問性

**Alt 文字**：
- Logo: "Company Logo" 或公司名稱
- 印章: "Company Stamp" 或 "Official Seal"

**語義化 HTML**：
```tsx
<header className="quotation-header">
  <div className="company-branding">
    <img alt="..." />
  </div>
</header>
```

**列印時保持語義**：
- 使用 `<h1>`, `<h2>` 等標題標籤
- 使用 `<table>` 而非 div 佈局

## 實作優先級

### Phase 1: 基礎佈局（1-2 小時）
1. 修改報價單 API 包含公司品牌 URL
2. 在 QuotationDetail 加入 Logo 區域（左上角）
3. 調整公司資訊區塊（右上角）

### Phase 2: 印章和總計優化（1 小時）
1. 在總計區域加入印章顯示
2. 調整總計區塊佈局（向右對齊）
3. 確保印章在右下角

### Phase 3: 列印優化（30 分鐘）
1. 調整 print.css
2. 測試 PDF 輸出
3. 修正任何列印問題

### Phase 4: 測試和微調（30 分鐘）
1. 測試各種情況（有/無 Logo、有/無印章）
2. 響應式測試
3. 跨瀏覽器測試

## 設計決策記錄

### 為什麼不使用 Card 組件？

雖然 shadcn 的 Card 組件很美觀，但：
- 報價單需要扁平化設計（列印友善）
- 過多的卡片會增加視覺噪音
- 簡單的 border 和 padding 即可達到分隔效果

### 為什麼印章不用浮水印方式？

考慮過將印章作為背景浮水印，但：
- 亞洲商業文件傳統上印章是實體的、可見的
- 浮水印可能影響閱讀
- 右下角的實體印章更符合用戶期望

### 為什麼 Logo 不居中？

雖然有些發票設計將 Logo 居中，但：
- 左上角是 UX 研究證實的最佳位置
- 節省垂直空間
- 可以同時顯示公司資訊在右側
