# 移除 PDF API，改用瀏覽器列印功能

## Why

為了確保專案能在 Cloudflare Workers 免費版順利運作，需要移除 CPU 密集的後端 PDF 生成功能。

### 問題背景
- **Cloudflare Workers 免費版限制**：每個請求最多 10ms CPU 時間
- **PDF 生成耗時**：使用 `@react-pdf/renderer` 生成複雜 PDF 可能需要 50-200ms
- **付費版成本**：升級到 Paid Plan ($5/月) 可獲得 50ms CPU 時間限制

### 用戶需求分析
目前報價單使用場景：
1. **內部預覽**：查看報價內容、確認資訊正確
2. **Email 發送**：寄送報價單給客戶（已使用 HTML Email）
3. **PDF 下載**：提供 PDF 檔案給客戶留存

實際上：
- ✅ **內部預覽**：HTML 頁面更快、更方便
- ✅ **Email 發送**：已使用 HTML，客戶可點擊連結查看
- ⚠️ **PDF 下載**：可改用瀏覽器列印（Chrome PDF 引擎品質更好）

## What Changes

### 移除的功能
- ❌ `/api/quotations/[id]/pdf` API 端點
- ❌ `lib/pdf/generator.ts` 後端 PDF 生成邏輯
- ❌ Email 中的 `downloadUrl` 連結

### 新增的功能
- ✅ 報價單預覽頁面加入「列印/儲存 PDF」按鈕
- ✅ Email 連結改為「檢視報價單」（導向線上預覽）
- ✅ 提供列印最佳化的 CSS（`@media print`）

### 保留的功能
- ✅ 報價單 HTML 預覽頁面（`/[locale]/quotations/[id]`）
- ✅ HTML Email 發送功能（`/api/quotations/[id]/send`）
- ✅ `lib/pdf/QuotationPDFTemplate.tsx`（改為 HTML 版本，用於預覽和列印）

## Impact

### 受影響的檔案
1. **API 路由**（移除）：
   - `app/api/quotations/[id]/pdf/route.tsx`
   - `app/api/quotations/batch/export/*`（批次匯出，如有）

2. **PDF 生成邏輯**（移除或改寫）：
   - `lib/pdf/generator.ts`
   - `lib/pdf/QuotationPDFTemplate.tsx`（改為 HTML 組件）

3. **Email 模板**（修改）：
   - `lib/templates/quotation-email.ts`（移除 `downloadUrl`）
   - `app/api/quotations/[id]/send/route.ts`（調整 Email 內容）

4. **前端頁面**（新增功能）：
   - `app/[locale]/quotations/[id]/page.tsx`（加入列印按鈕）
   - 新增列印專用 CSS

### 用戶體驗變化

**之前**：
```
查看報價 → 點擊「下載 PDF」→ 等待生成（1-3 秒）→ 下載 PDF 檔案
```

**之後**：
```
查看報價 → 點擊「列印/儲存」→ 瀏覽器列印預覽 → 另存為 PDF 或直接列印
```

### 優勢
1. ✅ **速度更快**：無需等待後端生成（0ms CPU）
2. ✅ **品質更好**：Chrome PDF 引擎支援完整 CSS
3. ✅ **成本更低**：免費版完全足夠（$0/月）
4. ✅ **維護更簡單**：減少一個 API 端點和依賴

### 潛在問題與緩解
1. **用戶不熟悉瀏覽器列印**：
   - 提供清楚的說明文字
   - 按鈕文字明確：「列印或儲存為 PDF」

2. **列印樣式需要調整**：
   - 使用 `@media print` CSS
   - 測試各瀏覽器相容性

3. **批次匯出功能**（如有使用）：
   - 可保留，但改為前端批次列印
   - 或使用 JSZip 打包多個 HTML 檔案

## Next Steps

1. **確認決策**：與使用者確認此方案可接受
2. **實作變更**：依照 `tasks.md` 逐步執行
3. **測試驗證**：
   - 列印樣式測試（Chrome、Safari、Firefox）
   - Email 連結測試
   - 用戶接受度測試

## 相關提案

此提案與 `migrate-vercel-to-cloudflare` 互補：
- **Cloudflare 遷移**：主要目標是平台遷移
- **移除 PDF API**：確保免費版 CPU 限制相容
- **可獨立實施**：即使不遷移 Cloudflare，移除 PDF API 也能簡化架構
