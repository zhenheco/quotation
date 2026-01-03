# Ralph Fix Plan

> **最後更新**：2026-01-02

---

# 🔴 當前任務：電子發票整合

> **狀態**：🔴 待開發
> **需求規格**：[specs/einvoice-integration.md](specs/einvoice-integration.md)
> **目標**：整合財政部電子發票平台，實現 Excel 匯入 + 401 媒體申報 TXT 匯出

## 🔴 高優先

### 1. 401 媒體檔產生器
- [ ] **建立 `lib/services/accounting/media-file-generator.ts`**
  - Done Criteria: 產出的每筆資料剛好 81 bytes
  - 實作 `generateMediaLine()` 和 `generateMediaFile()` 函數
  - 支援進項（格式代號 25）和銷項（格式代號 35）
  - 正確處理民國年轉換（西元年 - 1911）

- [ ] **建立測試 `__tests__/services/accounting/media-file-generator.test.ts`**
  - Done Criteria: 所有測試案例通過，覆蓋率 > 90%
  - 測試 81 bytes 固定長度
  - 測試金額右靠補零
  - 測試統編欄位補空白
  - 測試民國年轉換

### 2. 媒體檔下載 API
- [ ] **建立 `app/api/accounting/reports/tax/media/route.ts`**
  - Done Criteria: GET 請求回傳正確的 TXT 檔案
  - 參數驗證（company_id, year, bi_month）
  - Content-Type: text/plain; charset=utf-8
  - Content-Disposition 包含正確檔名

### 3. 整合稅務報表服務
- [ ] **修改 `lib/services/accounting/tax-report.service.ts`**
  - Done Criteria: 新增 `generateMediaFile401()` 函數
  - 將 Form401Data 轉換為媒體檔格式
  - 處理進項和銷項發票

### 4. 前端下載按鈕
- [ ] **修改 `app/[locale]/accounting/reports/TaxReportDashboard.tsx`**
  - Done Criteria: 新增「下載媒體檔」按鈕，點擊可下載 TXT
  - 在現有「下載 XML」按鈕旁新增
  - 實作 useDownloadMediaFile hook

## 🟡 中優先

### 5. 財政部 Excel 解析器
- [ ] **建立 `lib/services/accounting/mof-excel-parser.ts`**
  - Done Criteria: 可正確解析財政部 Excel 格式
  - 支援進項和銷項不同欄位名稱
  - 處理民國年日期格式（113/12/15）
  - 處理千分位金額格式

- [ ] **建立測試 `__tests__/services/accounting/mof-excel-parser.test.ts`**
  - Done Criteria: 所有測試案例通過
  - 測試日期格式轉換
  - 測試金額解析
  - 測試缺失欄位錯誤處理

### 6. 前端匯入模式選擇
- [ ] **修改 `app/[locale]/accounting/invoices/InvoiceUpload.tsx`**
  - Done Criteria: 新增匯入模式選擇 UI
  - 新增 Radio 選擇（標準模板 / 財政部進項 / 財政部銷項）
  - 根據模式使用不同解析器

## 🟢 低優先

### 7. i18n 翻譯
- [ ] **更新 `messages/zh.json` 和 `messages/en.json`**
  - Done Criteria: 所有新增 UI 文字有雙語翻譯
  - 新增媒體檔相關翻譯鍵
  - 新增匯入模式相關翻譯鍵

---

## ✅ 完成條件（Done Criteria）

當滿足以下條件時，此任務視為 **Completed**：

- [ ] 401 媒體檔可正確產出（81 bytes/筆）
- [ ] TXT 檔可成功匯入財政部「營業稅離線建檔系統」
- [ ] 財政部 Excel 可正確匯入系統
- [ ] `pnpm test` 全部通過
- [ ] `pnpm run typecheck` 無錯誤
- [ ] `pnpm run lint` 無警告

---

# ✅ 已完成任務

## Vercel 遷移（2025-12-31）

> **狀態**：✅ 全部完成
> **目標**：將應用程式從 Cloudflare Workers 遷移至 Vercel
> **原因**：Bundle 大小（13 MiB）超過 Workers 限制（10 MiB）
> **驗證結果**：`pnpm run build` ✅ | `pnpm run lint` ✅ | `pnpm run typecheck` ✅

---

## ✅ 已完成 - 程式碼層級遷移

所有程式碼層級的 Cloudflare 清理工作已完成：

- [x] **next.config.ts** - 移除 OpenNext 初始化和 Cloudflare 配置
- [x] **移除依賴** - `@opennextjs/cloudflare`, `wrangler`, `@cloudflare/workers-types`
- [x] **清理 scripts** - 移除 `preview:cf`, `deploy:cf`, `cf-typegen`
- [x] **刪除檔案** - `deploy-cloudflare.yml`, `cloudflare-env.d.ts`, `.open-next/`, `open-next.config.ts`
- [x] **移除 KV 相關代碼** - `lib/middleware/rate-limiter.ts` 中的 Cloudflare KV 部分
- [x] **更新 tsconfig.json** - 移除 `@cloudflare/workers-types`，排除 `workers/` 目錄
- [x] **Build 驗證** - 成功
- [x] **Lint 驗證** - 通過
- [x] **TypeScript 驗證** - 通過

---

## 🟢 待執行 - Vercel Dashboard 設定（手動）

> 以下項目需要在 Vercel Dashboard 手動設定

### 1. 建立 Vercel 專案

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. Import Git Repository → 選擇 quotation-system
3. 框架會自動識別為 Next.js

### 2. 設定環境變數

在 Vercel Dashboard → Settings → Environment Variables 設定：

**必要變數（Production + Preview）：**
```
NEXT_PUBLIC_SUPABASE_URL=<你的 Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<你的 Supabase Anon Key>
SUPABASE_SERVICE_ROLE_KEY=<你的 Service Role Key>
NEXT_PUBLIC_APP_URL=https://quote24.cc

# Email (Brevo)
BREVO_API_KEY=<Brevo API Key>
BREVO_SENDER_EMAIL=<寄件者 Email>
BREVO_SENDER_NAME=<寄件者名稱>

# AI OCR
QWEN_API_KEY=<Qwen API Key>
CF_AIG_TOKEN=<Cloudflare AI Gateway Token>
```

### 3. 設定自定義域名

1. Vercel Dashboard → Settings → Domains
2. 添加 `quote24.cc`
3. 更新 DNS：
   - 如果使用 Cloudflare DNS：設定 CNAME 指向 `cname.vercel-dns.com`
   - 關閉 Cloudflare Proxy（橙色雲 → 灰色）

### 4. 更新 Supabase OAuth 設定

在 Supabase Dashboard → Authentication → URL Configuration：

1. **Site URL**: `https://quote24.cc`
2. **Redirect URLs** 添加：
   - `https://quote24.cc/**`
   - `https://*.vercel.app/**`（用於預覽部署）

---

## 📝 Notes

- `workers/` 目錄保留作為獨立的 Cloudflare Workers 專案（observability-api）
- `wrangler.toml` 保留作為備份參考
- R2 Storage 可繼續使用（通過 API 調用）
- Cloudflare DNS 可繼續使用

---

## 完成條件

當滿足以下條件時，此任務視為完成：

- [x] 所有 Cloudflare 程式碼已移除
- [x] Build/Lint/TypeCheck 通過
- [x] Vercel 專案已建立並連接 GitHub
- [x] 環境變數已設定
- [x] 自定義域名 quote24.cc 已設定
- [x] Supabase OAuth redirect URLs 已更新
- [x] 部署成功
- [x] 登入功能正常
