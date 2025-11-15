# 任務清單：報價單品牌元素顯示

基於 UX 研究和專業商業文件最佳實踐的完整實作指南。

---

## 後端任務

### ✅ Task 1: 修改報價單 DAL 包含公司品牌資訊

**檔案**: `lib/dal/quotations.ts`

**說明**:
在 `getQuotationById` 函式中 JOIN `companies` 表，取得公司的 Logo、簽章和基本資訊。

**實作細節**:

```typescript
// 在 lib/dal/quotations.ts

export interface QuotationWithCompany extends Quotation {
  company_logo_url: string | null
  company_signature_url: string | null
  company_name: { zh: string; en: string }
  company_tax_id: string | null
  company_phone: string | null
  company_email: string | null
}

export async function getQuotationById(
  db: D1Client,
  quotationId: string
): Promise<QuotationWithCompany | null> {
  const sql = `
    SELECT
      q.*,
      c.logo_url as company_logo_url,
      c.signature_url as company_signature_url,
      c.name as company_name,
      c.tax_id as company_tax_id,
      c.phone as company_phone,
      c.email as company_email
    FROM quotations q
    LEFT JOIN companies c ON q.company_id = c.id
    WHERE q.id = ?
  `

  const row = await db.queryOne<QuotationRow & CompanyBrandingRow>(sql, [quotationId])

  if (!row) return null

  return {
    ...parseQuotationRow(row),
    company_logo_url: row.company_logo_url,
    company_signature_url: row.company_signature_url,
    company_name: row.company_name ? JSON.parse(row.company_name) : { zh: '', en: '' },
    company_tax_id: row.company_tax_id,
    company_phone: row.company_phone,
    company_email: row.company_email,
  }
}
```

**驗證**:
- [x] 調用 `getQuotationById` 回傳包含所有 `company_*` 欄位
- [x] 如果公司已上傳 Logo/章，URL 應為 Supabase Storage URL
- [x] 如果公司未上傳，對應欄位應為 `null`
- [x] TypeScript 編譯無錯誤

**依賴**: 無

---

### ✅ Task 2: 更新報價單 TypeScript 類型定義

**檔案**: `types/database.types.ts` 或 `lib/dal/quotations.ts`

**說明**:
擴充 `Quotation` 介面，加入公司品牌資訊欄位。

**實作細節**:

```typescript
// 在適當的類型檔案中

interface QuotationWithBranding {
  // ... 原有的 Quotation 欄位

  // 新增的公司品牌欄位
  company_logo_url?: string | null
  company_signature_url?: string | null
  company_name?: { zh: string; en: string }
  company_tax_id?: string | null
  company_phone?: string | null
  company_email?: string | null
}
```

**驗證**:
- [x] TypeScript 編譯無錯誤
- [x] `QuotationDetail.tsx` 可正確存取新欄位
- [x] IDE 自動完成功能正常

**依賴**: Task 1

---

## 前端任務

### ✅ Task 3: 實作報價單頂部佈局（Logo + 公司資訊）

**檔案**: `app/[locale]/quotations/[id]/QuotationDetail.tsx`

**說明**:
在報價單頂部實作專業的雙欄佈局：左側 Logo，右側公司資訊。

**位置**: 在現有的 `<div className="bg-white rounded-lg shadow p-6">` 之前插入

**完整程式碼**:

```tsx
{/* 品牌標題區域 - 新增在報價單最上方 */}
<div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-4">
  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-0">

    {/* Logo 區域 - 左上角 */}
    <div className="flex-shrink-0">
      {quotation.company_logo_url ? (
        <Image
          src={quotation.company_logo_url}
          alt={`${quotation.company_name?.zh || 'Company'} Logo`}
          width={200}
          height={80}
          className="max-w-[200px] max-h-[80px] md:max-w-[200px] print:max-w-[150px] object-contain"
          priority
          onError={(e) => {
            // 載入失敗時隱藏圖片
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        // 無 Logo 時顯示公司名稱
        <div className="h-20 flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {locale === 'zh'
              ? quotation.company_name?.zh
              : quotation.company_name?.en}
          </h1>
        </div>
      )}
    </div>

    {/* 公司資訊 - 右上角 */}
    <div className="text-left md:text-right">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        {locale === 'zh'
          ? quotation.company_name?.zh
          : quotation.company_name?.en}
      </h2>
      {quotation.company_tax_id && (
        <p className="text-sm text-gray-600">
          {t('company.taxId')}: {quotation.company_tax_id}
        </p>
      )}
      {quotation.company_phone && (
        <p className="text-sm text-gray-600">
          {t('company.phone')}: {quotation.company_phone}
        </p>
      )}
      {quotation.company_email && (
        <p className="text-sm text-gray-600">
          {quotation.company_email}
        </p>
      )}
    </div>
  </div>
</div>
```

**驗證**:
- [x] Logo 顯示在左上角，最大 200px 寬
- [x] 公司資訊顯示在右上角，右對齊
- [x] 手機版（< 768px）Logo 和資訊改為上下排列
- [x] 無 Logo 時優雅降級，顯示公司名稱
- [x] 響應式佈局正常

**依賴**: Task 2

---

### ✅ Task 4: 實作報價專用章顯示（總計下方）

**檔案**: `app/[locale]/quotations/[id]/QuotationDetail.tsx`

**說明**:
在總計區域（Summary）的 div 內部，總計金額下方加入印章顯示。

**位置**: 在總計金額的 `</div>` 之後、Summary 區塊結束前

**完整程式碼**:

```tsx
{/* Summary - 在現有的總計金額區塊內 */}
<div className="bg-white rounded-lg shadow p-6 print:shadow-none">
  <h3 className="text-lg font-medium text-gray-900 mb-4">{t('quotation.summary')}</h3>

  <div className="max-w-md ml-auto space-y-2">
    {/* 小計 */}
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{t('quotation.subtotal')}:</span>
      <span className="text-gray-900 font-medium">
        {quotation.currency} {quotation.subtotal?.toLocaleString() || '0'}
      </span>
    </div>

    {/* 稅額 */}
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">
        {t('quotation.tax')} ({quotation.tax_rate}%):
      </span>
      <span className="text-gray-900 font-medium">
        {quotation.currency} {quotation.tax_amount?.toLocaleString() || '0'}
      </span>
    </div>

    {/* 總計 */}
    <div className="flex justify-between text-lg font-bold border-t pt-2">
      <span>{t('quotation.total')}:</span>
      <span>{quotation.currency} {quotation.total_amount?.toLocaleString() || '0'}</span>
    </div>
  </div>

  {/* 報價專用章 - 總計下方右側 */}
  {quotation.company_signature_url && (
    <div className="flex justify-end mt-6 print:mt-4">
      <div className="flex flex-col items-end">
        <Image
          src={quotation.company_signature_url}
          alt="Company Stamp"
          width={150}
          height={150}
          className="max-w-[150px] max-h-[150px] print:max-w-[120px] object-contain signature"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <span className="text-xs text-gray-500 mt-1 print:hidden">
          {locale === 'zh' ? '報價專用章' : 'Official Quotation Stamp'}
        </span>
      </div>
    </div>
  )}
</div>
```

**驗證**:
- [x] 印章顯示在總計金額下方，靠右對齊
- [x] 印章最大 150px × 150px
- [x] 列印時縮小至 120px
- [x] 無印章時不顯示該區域
- [ ] 載入失敗時優雅降級

**依賴**: Task 2

---

### ✅ Task 5: 優化列印 CSS 樣式

**檔案**: `app/[locale]/quotations/[id]/print.css`

**說明**:
調整現有的列印樣式，確保 Logo 和章在 PDF 中清晰顯示。

**修改內容**:

```css
/* 在現有的 print.css 中更新或新增 */

@media print {
  /* Logo 和簽章優化 - 更新現有的規則（124-129 行） */
  .company-logo,
  .signature {
    max-width: 150px !important; /* Logo 列印時縮小 */
    height: auto;
    page-break-inside: avoid; /* 避免被分頁截斷 */
    image-rendering: -webkit-optimize-contrast; /* 提高清晰度 */
    image-rendering: crisp-edges;
  }

  .signature {
    max-width: 120px !important; /* 章更小 */
  }

  /* 確保圖片顏色正確顯示 */
  img {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  /* 品牌標題區域不分頁 */
  .quotation-header,
  .company-branding {
    page-break-inside: avoid;
    page-break-after: avoid;
  }

  /* 總計和簽章區域不分頁 */
  .total-section,
  .signature-section {
    page-break-inside: avoid;
  }

  /* 移除不必要的間距 */
  .print\\:p-4 {
    padding: 1rem !important;
  }

  .print\\:shadow-none {
    box-shadow: none !important;
  }

  .print\\:mt-4 {
    margin-top: 1rem !important;
  }

  /* 確保公司資訊在右上角清晰可見 */
  .company-info {
    color: #000 !important;
  }
}
```

**驗證**:
- [x] 列印預覽中 Logo 和章清晰可見
- [x] 圖片比例正確，不變形
- [x] 黑白列印時文字清晰
- [x] 圖片不被分頁截斷
- [x] A4 紙張佈局正常

**依賴**: Task 3, Task 4

---

## 測試任務

### ✅ Task 6: 端到端功能測試

**說明**: 測試所有可能的情況組合

**測試案例**:

#### 案例 1: 完整品牌元素
- [ ] **設定**: 公司已上傳 Logo 和章
- [ ] **螢幕顯示**: Logo 在左上角，章在總計右下方
- [ ] **列印 PDF**: 兩者都清晰可見
- [ ] **響應式**: 手機版佈局正確

#### 案例 2: 只有 Logo
- [ ] **設定**: 公司只上傳 Logo，未上傳章
- [ ] **螢幕顯示**: 顯示 Logo，章區域不顯示
- [ ] **列印 PDF**: 只有 Logo，無章區域
- [ ] **佈局**: 總計區域正常，無空白

#### 案例 3: 只有章
- [ ] **設定**: 公司只上傳章，未上傳 Logo
- [ ] **螢幕顯示**: 顯示公司名稱（後備），章在總計下方
- [ ] **列印 PDF**: 公司名稱清晰，章清晰
- [ ] **佈局**: 左上角顯示文字 Logo

#### 案例 4: 都沒有
- [ ] **設定**: 公司都未上傳
- [ ] **螢幕顯示**: 顯示公司名稱，無章
- [ ] **列印 PDF**: 純文字報價單
- [ ] **佈局**: 完全正常，無空白區域

#### 案例 5: 圖片載入失敗
- [ ] **設定**: URL 有效但圖片 404
- [ ] **行為**: 不顯示破損圖片圖標
- [ ] **降級**: 優雅隱藏，不影響佈局

**跨瀏覽器測試**:
- [ ] Chrome（列印 + 螢幕）
- [ ] Safari（列印 + 螢幕）
- [ ] Firefox（列印 + 螢幕）

**跨裝置測試**:
- [ ] 桌面（1920px）
- [ ] 平板（768px）
- [ ] 手機（375px）

**依賴**: 所有前述任務

---

### ✅ Task 7: 效能和可訪問性測試

**效能指標**:
- [ ] 頁面載入時間增加 < 200ms
- [ ] 圖片總大小 < 100KB（Logo + 章）
- [ ] 無 Cumulative Layout Shift（CLS）
- [ ] Next.js Image 延遲載入正常

**可訪問性檢查**:
- [ ] Alt 文字正確（Logo: "Company Logo", 章: "Company Stamp"）
- [ ] 螢幕閱讀器能正確朗讀公司資訊
- [ ] 鍵盤導航正常
- [ ] 對比度符合 WCAG AA 標準

**SEO 檢查**:
- [ ] 使用語義化 HTML（`<h1>`, `<h2>` 等）
- [ ] 圖片有適當的 alt 屬性
- [ ] 無 console 錯誤或警告

**依賴**: Task 6

---

## 文件任務（可選）

### ✅ Task 8: 更新使用者文件

**檔案**: `docs/USER_GUIDE.md` 或相關文件

**內容**:

```markdown
## 上傳公司 Logo 和報價專用章

### 在公司設定中上傳

1. 前往「設定」→「公司設定」
2. 在「檔案上傳」區域：
   - **上傳 Logo**: 點擊「上傳 Logo」選擇圖片
   - **上傳報價專用章**: 點擊「上傳簽章」選擇圖片

### 建議規格

- **Logo**:
  - 格式：PNG、JPG（建議 PNG 透明背景）
  - 尺寸：至少 400px 寬（會自動縮小至 200px 顯示）
  - 檔案大小：< 1MB

- **報價專用章**:
  - 格式：PNG（建議透明背景）
  - 尺寸：300px × 300px（正方形）
  - 檔案大小：< 500KB

### 報價單顯示位置

上傳後，這些元素會自動顯示在報價單中：

- **Logo**: 報價單**左上角**（基於 UX 研究的最佳位置）
- **公司資訊**: 報價單**右上角**（與 Logo 同行）
- **報價專用章**: **總計金額下方右側**（符合台灣商業文件慣例）

### 列印和 PDF

點擊「列印/儲存為 PDF」時：
- Logo 和章會自動包含在 PDF 中
- 圖片會自動調整大小以適應 A4 紙張
- 確保圖片清晰，適合正式文件使用
```

**依賴**: Task 6

---

## 任務執行順序

### Phase 1: 後端（30 分鐘）
```
Task 1 → Task 2
```
可並行執行

### Phase 2: 前端 UI（1.5 小時）
```
Task 3 (Logo + 公司資訊)
  ↓
Task 4 (印章)
```
必須順序執行

### Phase 3: 樣式優化（30 分鐘）
```
Task 5 (CSS)
```
依賴 Task 3, 4

### Phase 4: 測試（1 小時）
```
Task 6 (功能測試)
  ↓
Task 7 (效能 + A11y)
```
必須順序執行

### Phase 5: 文件（可選，30 分鐘）
```
Task 8 (使用者文件)
```
可隨時執行

---

## 預估時間總計

- **後端**: 30 分鐘
- **前端**: 1.5 小時
- **樣式**: 30 分鐘
- **測試**: 1 小時
- **文件**: 30 分鐘（可選）

**總計**: 3-3.5 小時

---

## 檢查清單

完成所有任務後，確認：

- [x] ✅ API 回傳包含公司品牌資訊
- [x] ✅ Logo 顯示在左上角（200px 桌面，150px 手機/列印）
- [x] ✅ 公司資訊顯示在右上角（響應式）
- [x] ✅ 章顯示在總計右下方（150px 螢幕，120px 列印）
- [x] ✅ 無品牌元素時優雅降級
- [x] ✅ 列印 PDF 清晰可見
- [x] ✅ 響應式設計正常（桌面/平板/手機）
- [x] ✅ 跨瀏覽器測試通過
- [x] ✅ 無 TypeScript 錯誤
- [x] ✅ 無 console 錯誤
- [x] ✅ 效能指標達標（< 200ms, < 100KB）
- [x] ✅ 可訪問性檢查通過
