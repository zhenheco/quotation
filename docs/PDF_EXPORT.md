# PDF 匯出功能文檔 | PDF Export Documentation

## 📄 概述 | Overview

本系統支援將報價單匯出為專業的 PDF 文件，支援中文、英文以及雙語並列三種模式。

This system supports exporting quotations as professional PDF documents in Chinese, English, or bilingual format.

## ✨ 功能特點 | Features

### 1. 多語言支援 | Multi-language Support
- **中文版** - 完整的繁體中文報價單
- **英文版** - 完整的英文報價單
- **雙語版** - 中英文並列顯示（適合國際客戶）

### 2. 專業排版 | Professional Layout
- A4 紙張格式
- 精美的色彩配置（藍色主題）
- 清晰的表格結構
- 狀態徽章標示
- 頁尾資訊

### 3. 完整資訊 | Complete Information
- 報價單號碼和日期
- 客戶資訊（姓名、地址、聯絡方式）
- 產品明細表（名稱、數量、單價、折扣、小計）
- 稅金計算
- 總金額
- 備註說明

## 🚀 使用方式 | Usage

### 從報價單詳情頁面下載 | Download from Quotation Detail Page

1. 進入任一報價單詳情頁面
2. 點擊右上角的「下載 PDF」按鈕
3. 選擇語言版本：
   - 🇹🇼 下載中文版 PDF
   - 🇬🇧 下載英文版 PDF
   - 🌏 下載雙語版 PDF

### 程式化使用 | Programmatic Usage

#### API 端點 | API Endpoint

```
GET /api/quotations/[id]/pdf?locale={zh|en}&both={true|false}
```

#### 參數說明 | Parameters

| 參數 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| `id` | string | ✅ | 報價單 ID | `123e4567-e89b-12d3-a456-426614174000` |
| `locale` | string | ❌ | 語言 (zh/en) | `zh` |
| `both` | boolean | ❌ | 是否雙語 | `false` |

#### 範例 | Examples

```typescript
// 1. 下載中文版 PDF
const downloadChinesePDF = async (quotationId: string) => {
  const response = await fetch(`/api/quotations/${quotationId}/pdf?locale=zh`)
  const blob = await response.blob()
  // ... 處理下載
}

// 2. 下載英文版 PDF
const downloadEnglishPDF = async (quotationId: string) => {
  const response = await fetch(`/api/quotations/${quotationId}/pdf?locale=en`)
  const blob = await response.blob()
  // ... 處理下載
}

// 3. 下載雙語版 PDF
const downloadBilingualPDF = async (quotationId: string) => {
  const response = await fetch(`/api/quotations/${quotationId}/pdf?locale=zh&both=true`)
  const blob = await response.blob()
  // ... 處理下載
}
```

### 在自訂組件中使用 | Using in Custom Components

```tsx
import PDFDownloadButton from '@/components/PDFDownloadButton'

// 基本使用
<PDFDownloadButton
  quotationId="quotation-id"
  locale="zh"
/>

// 完整配置
<PDFDownloadButton
  quotationId="quotation-id"
  locale="zh"
  variant="primary"  // primary | secondary | outline
  showLanguageOptions={true}
  className="custom-class"
/>
```

## 🎨 自訂樣式 | Customization

### 修改 PDF 模板 | Modify PDF Template

PDF 模板位於 `lib/pdf/QuotationPDFTemplate.tsx`，您可以：

1. **調整顏色** - 修改 `styles` 中的顏色值
2. **變更字型** - 註冊並使用自訂字體
3. **調整排版** - 修改組件結構和樣式
4. **添加 Logo** - 在標題區域添加公司 Logo

```typescript
// 範例：添加自訂顏色
const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',  // 修改此處
    marginBottom: 8,
  },
  // ...
})
```

### 支援中文字體 | Chinese Font Support

目前使用 Helvetica 字體（有限的中文支援）。若需完整中文支援：

1. 下載 Noto Sans TC 字體
2. 將字體檔案放置於 `public/fonts/`
3. 在模板中註冊字體：

```typescript
import { Font } from '@react-pdf/renderer'

Font.register({
  family: 'Noto Sans TC',
  src: '/fonts/NotoSansTC-Regular.ttf',
})

// 在 styles 中使用
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Noto Sans TC',
    // ...
  },
})
```

## 📊 PDF 內容結構 | PDF Content Structure

```
┌─────────────────────────────────────┐
│ 標題 & 狀態徽章 | Header & Status   │
├─────────────────────────────────────┤
│ 日期資訊 | Date Information         │
├─────────────────────────────────────┤
│ 客戶資訊 | Customer Info             │
│ 公司資訊 | Company Info (optional)   │
├─────────────────────────────────────┤
│ 產品明細表 | Items Table             │
│ ┌──────────────────────────────┐   │
│ │ 產品名稱 | 數量 | 單價 | 小計  │   │
│ └──────────────────────────────┘   │
├─────────────────────────────────────┤
│ 總計區域 | Totals Section            │
│ • 小計 Subtotal                     │
│ • 稅金 Tax                          │
│ • 總計 Total                        │
├─────────────────────────────────────┤
│ 備註 | Notes (optional)             │
├─────────────────────────────────────┤
│ 頁尾 | Footer                       │
└─────────────────────────────────────┘
```

## 🔧 技術細節 | Technical Details

### 使用的技術 | Technologies Used

- **@react-pdf/renderer** - PDF 生成核心
- **React** - 組件式開發
- **TypeScript** - 類型安全

### 效能優化 | Performance Optimization

1. **串流式輸出** - 使用 `renderToStream` 提升效能
2. **按需生成** - PDF 在請求時動態生成
3. **最小化依賴** - 僅在需要時載入 PDF 庫

### 安全性 | Security

- ✅ 用戶身份驗證
- ✅ 資料權限檢查
- ✅ 防止未授權存取
- ✅ SQL 注入防護

## 🐛 疑難排解 | Troubleshooting

### 問題：PDF 下載失敗
**解決方案:**
1. 檢查網路連接
2. 確認報價單 ID 正確
3. 確認用戶已登入
4. 查看瀏覽器控制台錯誤訊息

### 問題：中文顯示異常
**解決方案:**
1. 確認使用支援中文的字體
2. 註冊 Noto Sans TC 字體（見上方說明）

### 問題：PDF 樣式錯誤
**解決方案:**
1. 檢查 `QuotationPDFTemplate.tsx` 中的樣式定義
2. 確認 StyleSheet 語法正確
3. 使用 @react-pdf/renderer 支援的樣式屬性

## 📚 相關資源 | Related Resources

- [@react-pdf/renderer 文檔](https://react-pdf.org/)
- [PDF 模板範例](https://react-pdf.org/examples)
- [自訂字體指南](https://react-pdf.org/fonts)

## 🔄 未來改進 | Future Improvements

- [ ] 支援更多字體選項
- [ ] 添加公司 Logo 上傳功能
- [ ] 支援自訂 PDF 模板
- [ ] 批次匯出多個報價單
- [ ] PDF 預覽功能
- [ ] Email 直接發送 PDF

---

**版本**: 0.3.0
**最後更新**: 2025-10-16
**維護者**: 報價單系統開發團隊
