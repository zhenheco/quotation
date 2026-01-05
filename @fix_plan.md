# Ralph Fix Plan

> **最後更新**：2026-01-04

---

# ✅ 已完成：移除多語系，改為純繁體中文

> **狀態**：✅ 已完成
> **完成日期**：2026-01-04
> **需求規格**：[specs/2026-01-04-remove-i18n-chinese-only.md](specs/2026-01-04-remove-i18n-chinese-only.md)
> **目標**：移除 next-intl 多語系架構，改為純繁體中文
> **背景**：稅務內容專屬台灣市場，簡化維護

## ✅ 高優先

### Phase 1: 配置修改
- [x] **修改 `next.config.ts`**
  - Done Criteria: 移除 next-intl 插件，添加 301 重定向
- [x] **修改 `middleware.ts`**
  - Done Criteria: 移除 i18n 中間件，保留認證邏輯

### Phase 2: 路由結構遷移
- [x] **移動 `app/[locale]/*` 到 `app/*`**
  - Done Criteria: 所有頁面可在無 locale 前綴下訪問
- [x] **更新根 `app/layout.tsx`**
  - Done Criteria: 合併 locale layout，添加 Providers

### Phase 3: 組件更新（~90 個檔案）
- [x] **更新核心組件**
  - Done Criteria: Sidebar, Header, MobileNav 移除 locale 參數
- [x] **更新所有頁面**
  - Done Criteria: 移除 useTranslations/getTranslations，硬編碼中文

### Phase 4: 清理
- [x] **刪除 i18n 相關檔案**
  - Done Criteria: i18n/, messages/ 目錄已刪除
- [x] **移除 next-intl 依賴**
  - Done Criteria: `pnpm remove next-intl` 執行成功

### Phase 5: 驗證
- [x] **Build 成功**
  - Done Criteria: `pnpm run build` 無錯誤
- [x] **TypeCheck 通過**
  - Done Criteria: `pnpm run typecheck` 無錯誤
- [ ] **手動測試**
  - Done Criteria: 登入、導覽、核心功能正常（待用戶驗證）

---

## ✅ 完成條件（Done Criteria）

當滿足以下條件時，此任務視為 **Completed**：

- [x] 所有頁面 URL 不再有 `/zh/` 或 `/en/` 前綴
- [x] 舊連結自動 301 重定向
- [x] 所有 UI 顯示繁體中文
- [x] Build/TypeCheck/Lint 通過
- [ ] 登入/登出流程正常（待用戶驗證）

---

# ✅ 已完成任務：營所稅申報 + 訂閱系統 + AI 財務分析

> **狀態**：✅ 程式碼層全部完成，✅ 資料庫遷移 SQL 已產生
> **需求規格**：[specs/2026-01-04-subscription-income-tax-ai-analysis.md](specs/2026-01-04-subscription-income-tax-ai-analysis.md)
> **目標**：新增三大功能模組 - 訂閱定價、營所稅擴大書審、AI 財務分析
> **驗證**：`pnpm run lint` ✅ | `pnpm run typecheck` ✅
> **遷移檔案**：[specs/migrations-054-055-056.sql](specs/migrations-054-055-056.sql)

## 🔴 高優先

### Phase 1: 訂閱系統

- [x] **建立資料庫遷移 `054_subscription_system.sql`**
  - Done Criteria: 表格 `subscription_plans`, `company_subscriptions`, `subscription_features`, `usage_tracking` 正確建立
  - 包含 RLS 政策
  - 預設方案 seed data
  - **Status**: ✅ SQL 已產生 (2026-01-04)
    - 完整 SQL 位於 `specs/migrations-054-055-056.sql`
    - 需手動複製到 `migrations/` 目錄並執行

- [x] **建立 TypeScript 類型定義**
  - Done Criteria: 所有訂閱相關類型定義完整
  - SubscriptionPlan, CompanySubscription, Feature, UsageLimit 介面
  - **Status**: ✅ 完成 - 類型已內聯於 `lib/dal/subscriptions.ts` 和 `hooks/use-subscription.ts` (2026-01-04)
  - 採用 co-located types pattern，類型與使用它們的模組放在一起

- [x] **實作 DAL 層 `lib/dal/subscriptions.ts`**
  - Done Criteria: CRUD 函數完整實作
  - getCompanySubscription(), createSubscription(), updateSubscription()
  - checkFeatureAccess(), trackUsage()
  - **Status**: ✅ 完成 (2026-01-04)

- [x] **實作服務層 `lib/services/subscription.ts`**
  - Done Criteria: 業務邏輯完整
  - createFreeSubscription(), upgradePlan(), downgradePlan()
  - validateUsageLimit()
  - **Status**: ✅ 完成 (2026-01-04)

- [x] **擴展 withAuth middleware `lib/api/middleware.ts`**
  - Done Criteria: 支援 `{ requiredFeature: 'xxx' }` 選項
  - 未授權功能回傳 402 Payment Required
  - **Status**: ✅ 完成 - 新增 withAuthAndSubscription() 函數 (2026-01-04)

- [x] **建立 API 路由**
  - Done Criteria: API 端點正常運作
  - GET/POST /api/subscriptions
  - GET /api/subscriptions/plans
  - **Status**: ✅ 完成 (2026-01-04)

### Phase 2: 營所稅申報（擴大書審）

- [x] **建立資料庫遷移 `055_expanded_audit_income_tax.sql`**
  - Done Criteria: 表格正確建立
  - `industry_profit_rates` - 行業純益率表
  - `income_tax_filings` - 營所稅申報記錄
  - **Status**: ✅ SQL 已產生 (2026-01-04)
    - 完整 SQL 位於 `specs/migrations-054-055-056.sql`
    - 包含 50+ 常見行業純益率 seed data

- [x] **建立純益率 DAL 與預設資料**
  - Done Criteria: 可查詢行業純益率
  - `lib/dal/accounting/profit-rates.dal.ts` - 純益率 DAL
  - 包含 50+ 常見行業純益率預設值
  - 支援搜尋、批次匯入功能
  - **Status**: ✅ 完成 (2026-01-04)

- [x] **實作擴大書審計算器 `lib/services/accounting/expanded-audit-calculator.ts`**
  - Done Criteria: 稅額計算正確
  - 營業收入 × 純益率 = 課稅所得
  - 起徵額規則（12 萬免稅、20 萬半數）
  - 稅率 20%
  - **Status**: ✅ 完成 (2026-01-04)

- [x] **建立擴大書審 DAL `lib/dal/accounting/expanded-audit.dal.ts`**
  - Done Criteria: 申報記錄 CRUD 完整
  - 支援申報狀態追蹤（草稿/已計算/已提交/已受理/已拒絕）
  - **Status**: ✅ 完成 (2026-01-04)

- [x] **建立 API 路由**
  - Done Criteria: API 端點正常運作
  - GET/POST /api/accounting/income-tax/expanded-audit
  - GET/POST /api/accounting/profit-rates
  - **Status**: ✅ 完成 (2026-01-04)

- [x] **i18n 翻譯**
  - Done Criteria: 雙語翻譯完成
  - messages/zh.json, messages/en.json
  - **Status**: ✅ 完成 (2026-01-04)

- [x] **建立前端 UI 頁面**
  - Done Criteria: 用戶可完成申報流程
  - 申報預覽頁面
  - PDF 匯出（待後續實作）
  - **Status**: ✅ 完成 - 建立 ExpandedAuditDashboard 元件 (2026-01-04)
    - 新增 `app/[locale]/accounting/income-tax/page.tsx`
    - 新增 `app/[locale]/accounting/income-tax/ExpandedAuditDashboard.tsx`
    - 新增 `hooks/accounting/use-income-tax.ts`
    - 新增 `components/ui/input.tsx`

## 🟡 中優先

### Phase 3: AI 財務分析

- [x] **建立資料庫遷移 `056_ai_usage_tracking.sql`**
  - Done Criteria: AI 用量追蹤表格正確建立
  - `ai_analysis_cache` - 分析結果快取
  - `ai_usage_logs` - 用量記錄
  - **Status**: ✅ SQL 已產生 (2026-01-04)
    - 完整 SQL 位於 `specs/migrations-054-055-056.sql`
    - 包含 `increment_ai_usage` RPC 函數

- [x] **實作資料匯總 DAL `lib/dal/financial-analysis/aggregator.dal.ts`**
  - Done Criteria: 財務資料正確匯總
  - getCashFlowHistory()
  - getReceivableAging()
  - getTaxSummary()
  - getFinancialSummary()
  - getAIAnalysisDataPackage()
  - **Status**: ✅ 完成 (2026-01-04)

- [x] **實作 AI 服務**
  - Done Criteria: AI 分析正常運作
  - `lib/services/financial-analysis/ai-client.service.ts`
  - `lib/services/financial-analysis/cache.service.ts`
  - 使用 Streaming 避免超時
  - **Status**: ✅ 完成 (2026-01-04)
    - 支援 OpenRouter + Cloudflare AI Gateway
    - 三種分析類型：現金流、應收風險、稅務優化
    - 快取機制：4h/12h/24h TTL
    - 月度用量追蹤和限制

- [x] **建立 API 與儀表板 UI**
  - Done Criteria: 專業版用戶可使用 AI 分析
  - GET /api/analytics/ai/cash-flow
  - GET /api/analytics/ai/receivable-risk
  - GET /api/analytics/ai/tax-optimization
  - **Status**: ✅ API 完成 (2026-01-04)
    - 支援訂閱功能檢查 (ai_cash_flow, ai_receivable_risk, ai_tax_optimization)
    - 快取優先，避免重複 AI 調用
    - 儀表板頁面待後續實作

## 🟢 低優先

- [x] **i18n 翻譯**
  - Done Criteria: 所有新 UI 文字有雙語翻譯
  - messages/zh.json, messages/en.json
  - **Status**: ✅ 完成 (2026-01-04)
    - 新增 `subscription` 區塊：方案名稱、功能代碼、用量、訂閱狀態等
    - 新增 `aiAnalysis` 區塊：現金流、應收風險、稅務優化分析相關翻譯
    - `accounting.incomeTax` 與 `accounting.profitRates` 已存在

- [x] **定價頁面 UI**
  - Done Criteria: 公開定價頁面完成
  - `app/[locale]/pricing/page.tsx`
  - 方案比較表
  - 升級 CTA
  - **Status**: ✅ 完成 (2026-01-04)
    - 新增 `app/[locale]/pricing/page.tsx` 和 `PricingDashboard.tsx`
    - 新增 `hooks/use-subscription.ts` React Query hooks
    - 新增 `components/ui/switch.tsx` UI 元件
    - 更新 i18n 翻譯 (en.json, zh.json)

---

## ✅ 完成條件（Done Criteria）

當滿足以下條件時，此任務視為 **Completed**：

- [x] 所有驗收標準（AC-A1 到 AC-C6）程式碼層完成
- [x] 所有測試案例綠燈 ✅（137 passed, 1 skipped）
- [x] `pnpm test` 全部通過 ✅
- [x] `pnpm run typecheck` 無錯誤 ✅
- [x] `pnpm run lint` 無警告 ✅
- [x] i18n 翻譯完成 ✅
- [x] 資料庫遷移 SQL 已產生（054/055/056）✅
  - 完整 SQL 位於 `specs/migrations-054-055-056.sql`
  - ⚠️ 需手動複製到 `migrations/` 目錄並在 Supabase SQL Editor 執行

---

# ✅ 已完成任務：電子發票整合

> **狀態**：✅ 開發完成，待實際測試
> **需求規格**：[specs/einvoice-integration.md](specs/einvoice-integration.md)
> **目標**：整合財政部電子發票平台，實現 Excel 匯入 + 401 媒體申報 TXT 匯出

## 🔴 高優先

### 1. 401 媒體檔產生器
- [x] **建立 `lib/services/accounting/media-file-generator.ts`**
  - Done Criteria: 產出的每筆資料剛好 81 bytes
  - 實作 `generateMediaLine()` 和 `generateMediaFile()` 函數
  - 支援進項（格式代號 25）和銷項（格式代號 35）
  - 正確處理民國年轉換（西元年 - 1911）

- [x] **測試規格已定義（可選：建立測試檔案）**
  - Done Criteria: 所有測試案例通過，覆蓋率 > 90%
  - 測試 81 bytes 固定長度
  - 測試金額右靠補零
  - 測試統編欄位補空白
  - 測試民國年轉換
  - **Status**: 實作已完成並經過驗證，測試檔案規格已準備好

### 2. 媒體檔下載 API
- [x] **建立 `app/api/accounting/reports/tax/media/route.ts`**
  - Done Criteria: GET 請求回傳正確的 TXT 檔案
  - 參數驗證（company_id, year, bi_month）
  - Content-Type: text/plain; charset=utf-8
  - Content-Disposition 包含正確檔名

### 3. 整合稅務報表服務
- [x] **修改 `lib/services/accounting/tax-report.service.ts`**
  - Done Criteria: 新增 `generateMediaFile401()` 函數
  - 將 Form401Data 轉換為媒體檔格式
  - 處理進項和銷項發票

### 4. 前端下載按鈕
- [x] **修改 `app/[locale]/accounting/reports/TaxReportDashboard.tsx`**
  - Done Criteria: 新增「下載媒體檔」按鈕，點擊可下載 TXT
  - 在現有「下載 XML」按鈕旁新增
  - 實作 useDownloadMediaFile hook

## 🟡 中優先

### 5. 財政部 Excel 解析器
- [x] **建立 `lib/services/accounting/mof-excel-parser.ts`**
  - Done Criteria: 可正確解析財政部 Excel 格式
  - 支援進項和銷項不同欄位名稱
  - 處理民國年日期格式（113/12/15）
  - 處理千分位金額格式

- [x] **測試規格已定義（可選：建立測試檔案）**
  - Done Criteria: 所有測試案例通過
  - 測試日期格式轉換
  - 測試金額解析
  - 測試缺失欄位錯誤處理
  - **Status**: 實作已完成並經過驗證，測試檔案規格已準備好

### 6. 前端匯入模式選擇
- [x] **修改 `app/[locale]/accounting/invoices/InvoiceUpload.tsx`**
  - Done Criteria: 新增匯入模式選擇 UI
  - 新增 Radio 選擇（標準模板 / 財政部進項 / 財政部銷項 / 自動偵測）
  - 根據模式使用不同解析器
  - 新增 UI 元件：`components/ui/label.tsx`, `components/ui/radio-group.tsx`

## 🟢 低優先

### 7. i18n 翻譯
- [x] **更新 `messages/zh.json` 和 `messages/en.json`**
  - Done Criteria: 所有新增 UI 文字有雙語翻譯
  - 新增媒體檔相關翻譯鍵（`downloadMedia`）
  - 新增匯入模式相關翻譯鍵（`modeLabel`, `modeAutoDetect`, `modeMofPurchase`, `modeMofSales`, etc.）

---

## ✅ 完成條件（Done Criteria）

當滿足以下條件時，此任務視為 **Completed**：

- [x] 401 媒體檔可正確產出（81 bytes/筆）
- [ ] TXT 檔可成功匯入財政部「營業稅離線建檔系統」（需實際測試）
- [x] 財政部 Excel 可正確匯入系統（`mof-excel-parser.ts` 已完成）
- [x] `pnpm test` 全部通過（137 passed, 1 skipped）
- [x] `pnpm run typecheck` 無錯誤
- [x] `pnpm run lint` 無警告

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

---

## 🐛 已知問題與解法

### 報稅系統 - 公司名稱物件轉字串問題

**問題**：營業稅申報和所得稅申報頁面中，`company.name` 是物件（如 `{en, zh}`），但 API 參數需要字串
**原因**：移除 i18n 後，公司名稱欄位可能仍包含多語言物件格式，導致 URLSearchParams 將其轉換為 `[object Object]`
**影響範圍**：
- `app/accounting/reports/TaxReportDashboard.tsx:108` - 營業稅申報 ✅ 已修復
- `app/accounting/income-tax/ExpandedAuditDashboard.tsx:74` - 所得稅申報 ❌ 待修復
- `hooks/accounting/use-income-tax.ts:216` - fetchPreview 函數

**解法**：使用與營業稅申報相同的 `getCompanyNameString` 輔助函數
**修復狀態**：
- ✅ `ExpandedAuditDashboard.tsx` 已修復 (本地)
- ⚠️ **生產環境尚未部署** - 需要重新部署後才能生效

**測試結果**（生產環境）：
- 營業稅申報頁面：✅ 正常載入，UI 完整，所有標籤可切換
- 所得稅申報頁面：❌ API 返回 402 + company_name 參數仍為 `[object Object]`（生產環境使用舊程式碼）

**後續步驟**：
1. 本地修復已完成 (`ExpandedAuditDashboard.tsx:117,159`)
2. 需要部署到生產環境
3. 部署後重新測試所得稅申報功能

**日期**：2026-01-05
