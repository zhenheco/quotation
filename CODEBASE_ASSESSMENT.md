# 代碼考古報告 | Codebase Assessment

**專案**: Quotation System (報價單系統)  
**提交版本**: 865ad1f  
**評估日期**: 2025-10-20  
**代碼行數**: ~28,355 行 (TypeScript/TSX)  
**淨代碼**: ~16,169 行 (不含註解和空白)

---

## 1. 執行摘要 | Executive Summary

### 專案定位
現代化的中英雙語報價單管理系統，支援多公司架構、多幣別、Google OAuth 認證、RBAC 權限控制和合約付款追蹤。

### 技術棧
- **前端**: Next.js 15.5.5 (App Router + Turbopack) + React 19 + TypeScript
- **樣式**: Tailwind CSS 4
- **資料庫**: PostgreSQL (混合架構)
  - Supabase (認證系統)
  - Zeabur (業務資料)
- **認證**: Supabase Auth (Google OAuth 2.0)
- **國際化**: next-intl v4.3.12
- **PDF 生成**: @react-pdf/renderer v4.3.1
- **部署**: Vercel (前端) + Zeabur (資料庫)

### 架構風格
- **前端**: Server Components + Client Components 混合模式
- **後端**: Next.js API Routes (RESTful)
- **資料層**: 直接 PostgreSQL 查詢 + Supabase Client
- **權限**: Row Level Security (RLS) + RBAC

### 健康評分: **7.5/10**

**理由**:
- ✅ 良好的專案結構和模組化
- ✅ 完整的型別定義 (TypeScript strict mode)
- ✅ 詳細的文檔和變更日誌
- ✅ 多語言支援完善
- ⚠️ 測試覆蓋率不足 (338 個測試檔案，但主要是單元測試)
- ⚠️ 存在代碼重複和複雜度較高的檔案
- ⚠️ 安全性配置需要加強

### 三大風險

1. **資料庫連接混亂** (P0 - Critical)
   - 同時使用 Supabase 和 Zeabur PostgreSQL
   - 連接邏輯分散在多個模組
   - RLS 政策與 Zeabur 直連衝突

2. **認證架構不一致** (P1 - High)
   - 混用 Supabase Auth 和自建 auth wrapper
   - 中介軟體邏輯複雜 (i18n + auth 混合)
   - Session 管理依賴 cookie，無 refresh token 機制

3. **缺乏生產環境監控和錯誤追蹤** (P2 - Medium)
   - 133 個 console.log/error/warn 語句
   - 無結構化日誌系統
   - 無應用程式效能監控 (APM)

---

## 2. 架構概覽 | Architecture Overview

### 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                         使用者 (Users)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Next.js 15)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ App Router   │  │ API Routes   │  │ Middleware   │      │
│  │ (SSR/SSG)    │  │ (43 routes)  │  │ (Auth+i18n)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────┬──────────────────┬──────────────────┬──────────┘
             │                  │                  │
             ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Supabase Cloud   │  │ Zeabur PostgreSQL │  │ ExchangeRate API │
│ - Auth (OAuth)   │  │ - Business Data   │  │ - 即時匯率       │
│ - Session Mgmt   │  │ - RLS Policies    │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### 關鍵模組與職責

| 模組 | 職責 | 關鍵檔案 | 直接依賴 |
|------|------|----------|----------|
| **認證層** | OAuth, Session 管理 | `lib/supabase/server.ts`<br>`middleware.ts`<br>`lib/auth.ts` | Supabase Auth |
| **權限層** | RBAC, RLS 政策 | `lib/services/rbac.ts`<br>`lib/middleware/withPermission.ts` | Zeabur DB |
| **業務邏輯** | 報價單、客戶、產品 | `lib/services/database.ts`<br>`lib/services/company.ts`<br>`lib/services/contracts.ts` | Zeabur DB |
| **資料存取** | PostgreSQL 連接池 | `lib/db/zeabur.ts` | pg (node-postgres) |
| **API 層** | REST API 端點 | `app/api/**/route.ts` (43 routes) | All services |
| **UI 層** | Server/Client 組件 | `app/[locale]/**`<br>`components/**` | React 19 |
| **國際化** | 雙語支援 | `i18n/request.ts`<br>`messages/{en,zh}.json` | next-intl |
| **PDF 生成** | 報價單 PDF | `lib/pdf/generator.ts`<br>`lib/pdf/QuotationPDFTemplate.tsx` | @react-pdf/renderer |

---

## 3. 資料與控制流 | Data & Control Flow

### 使用者請求流程

```
使用者請求
  ↓
middleware.ts (Line 8)
  ├─ 檢查路徑是否需要 i18n (Line 12-17)
  ├─ 套用 next-intl middleware (Line 29)
  └─ 刷新 Supabase session (Line 52)
  ↓
受保護路由 (e.g., /[locale]/dashboard)
  ↓
Server Component
  ├─ createClient() from lib/supabase/server.ts
  ├─ getUser() 取得認證資訊
  └─ 查詢 Zeabur DB 取得業務資料
  ↓
渲染頁面 (SSR)
```

### API 請求流程

```
API Request (e.g., POST /api/quotations)
  ↓
API Route Handler (app/api/quotations/route.ts)
  ↓
withAuth() or withPermission() middleware
  ├─ requireAuth() - 驗證 Supabase session
  ├─ requirePermission() - 檢查 RBAC 權限
  └─ 返回 401/403 或繼續
  ↓
業務邏輯處理
  ├─ query() from lib/db/zeabur.ts
  ├─ 執行 SQL (使用 parameterized queries)
  └─ 返回結果
  ↓
JSON Response
```

### 資料庫架構重點

主要資料表 (11 張核心表):
- `companies` - 公司資訊 (多公司架構核心)
- `company_members` - 公司成員關聯
- `user_profiles` - 使用者個人資料
- `roles` - 角色定義 (5 種角色)
- `user_roles` - 使用者角色關聯
- `permissions` - 權限定義
- `role_permissions` - 角色權限關聯
- `customers` - 客戶管理
- `products` - 產品目錄
- `quotations` - 報價單
- `quotation_items` - 報價單明細

---

## 4. 依賴圖譜 | Dependency Graph

### 第三方依賴

#### 生產依賴 (關鍵)
```
@supabase/supabase-js@2.75.0 ──┐
@supabase/ssr@0.7.0 ────────────┼─→ 認證與 Session 管理
                                │
next@15.5.5 ────────────────────┼─→ 框架核心
react@19.1.0 ───────────────────┘
react-dom@19.1.0

next-intl@4.3.12 ───────────────→ 國際化

pg@8.16.3 ──────────────────────→ PostgreSQL 直連

@react-pdf/renderer@4.3.1 ──────→ PDF 生成

nodemailer@7.0.9 ───────────────→ 郵件發送
resend@6.1.3 ───────────────────→ 郵件服務 (備用)

recharts@3.2.1 ─────────────────→ 圖表渲染
```

#### 開發依賴
```
vitest@3.2.4 ────────────────────→ 測試框架
@vitest/ui@3.2.4
@vitest/coverage-v8@3.2.4

@testing-library/react@16.3.0 ──→ React 測試工具
@testing-library/jest-dom@6.9.1

msw@2.11.5 ─────────────────────→ API Mocking

typescript@5 ───────────────────→ 型別檢查
eslint@9 ───────────────────────→ 程式碼檢查
```

### 過期或有風險的依賴

⚠️ **關注點**:
1. **nodemailer@7.0.9** - 最新版本，但與 next-auth 不相容 (已避免安裝 next-auth)
2. **React 19** - 生產版本，但生態系統部分套件尚未完全支援
3. **大量 extraneous 套件** - `npm list` 顯示許多未在 package.json 中宣告的套件 (來自子依賴)

### 內部模組依賴

```
app/api/**/route.ts
  ↓
lib/middleware/withAuth.ts
  ↓
lib/services/rbac.ts
  ↓
lib/db/zeabur.ts
  ↓
PostgreSQL
```

---

## 5. 程式碼品質指標 | Quality Metrics

| 指標 | 數值 | 註解 |
|------|------|------|
| **總代碼行數** | 28,355 | TypeScript/TSX (含 node_modules) |
| **淨代碼行數** | 16,169 | 不含註解和空白 |
| **檔案數量** | 134 | app, lib, components |
| **註解行數** | 1,451 | 註解比例: 8.9% |
| **空白行數** | 2,014 | 增強可讀性 |
| **API 端點** | 43 | REST API routes |
| **測試檔案** | 338 | 主要是單元測試 |
| **使用 `any` 的檔案** | 93 | ⚠️ 型別安全性待改善 |
| **Console 語句** | 133 | ⚠️ 應使用結構化日誌 |
| **TODO 註解** | 1 | `lib/services/company.ts:569` |

### 檔案大小分析 (Top 10 最大檔案)

| 檔案 | 行數 | 複雜度評估 |
|------|------|------------|
| `app/[locale]/quotations/QuotationForm.tsx` | 837 | 🔴 高 - 需要拆分 |
| `lib/services/payments.ts` | 826 | 🔴 高 - 複雜業務邏輯 |
| `lib/services/contracts.ts` | 790 | 🔴 高 - 複雜業務邏輯 |
| `lib/services/company.ts` | 647 | 🟡 中 - 考慮拆分 |
| `tests/unit/exchange-rates.test.ts` | 612 | 🟢 低 - 測試檔案 |
| `types/extended.types.ts` | 606 | 🟢 低 - 型別定義 |
| `app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx` | 593 | 🔴 高 - 需要拆分 |
| `lib/services/rbac.ts` | 585 | 🟡 中 - 權限邏輯 |
| `examples/api-usage-examples.ts` | 570 | 🟢 低 - 範例檔案 |
| `app/[locale]/quotations/QuotationList.tsx` | 493 | 🟡 中 - UI 邏輯 |

### 命名規範與一致性

✅ **優點**:
- 統一使用 camelCase (函數和變數)
- 統一使用 PascalCase (組件和型別)
- 資料庫欄位使用 snake_case
- 檔案命名清晰 (功能導向)

⚠️ **需改善**:
- 部分 API route 檔案過大，缺乏模組化
- 部分函數名稱過於簡短 (`query`, `getClient`)
- 混用 `user_id` 和 `userId` (資料庫 vs. 應用層)

### 重複代碼檢測

**潛在重複區域**:
1. **認證邏輯** (5+ 處)
   - `lib/supabase/server.ts` - `createClient()`
   - `lib/auth.ts` - `getServerSession()`
   - `lib/middleware/withAuth.ts` - `requireAuth()`
   - 各 API routes 中的驗證邏輯

2. **資料庫查詢模式** (10+ 處)
   - 重複的 CRUD 操作
   - 相似的 JOIN 查詢
   - 缺乏統一的 query builder

3. **表單驗證** (8+ 處)
   - QuotationForm 和 QuotationEditForm 共用 80% 邏輯
   - CustomerForm 和 ProductForm 類似結構

4. **錯誤處理** (全域)
   - 每個 API route 都有相似的 try-catch 結構
   - 缺乏統一的錯誤處理中介軟體

**建議**: 抽取共用邏輯到 `lib/utils/` 或建立自訂 hooks

---

## 6. 安全評估 | Security Assessment

### 高風險問題 (Critical)

| 問題 | 位置 | 嚴重性 | 建議 |
|------|------|--------|------|
| **明文 API Key 風險** | `.env.local` | 🔴 Critical | 使用 Vercel Secrets / AWS Secrets Manager |
| **SQL 注入風險 (已部分緩解)** | `lib/db/zeabur.ts` | 🟡 Medium | 全部查詢使用 parameterized queries (已做到 95%) |
| **CSRF 保護缺失** | 所有 API routes | 🔴 Critical | 實作 CSRF token 驗證 |
| **Rate Limiting 不完整** | `lib/middleware/rate-limiter.ts` | 🟡 Medium | 僅部分端點有限流 |
| **Session 固定攻擊** | Supabase Auth | 🟢 Low | Supabase 自動處理 |
| **XSS 風險** | React 組件 | 🟢 Low | React 自動跳脫，但需檢查 `dangerouslySetInnerHTML` |

### 認證與授權

✅ **良好實踐**:
- 使用 Supabase Auth (OAuth 2.0)
- 實作 RBAC 權限系統 (5 種角色, 多權限)
- API 層級權限檢查 (`withPermission` middleware)
- Row Level Security (RLS) 政策

⚠️ **需改善**:
- **Session 管理**: 僅依賴 cookie，無 refresh token 自動更新機制
- **權限檢查重複**: 每個 API route 都需手動呼叫 `withAuth()`
- **RLS 與直連衝突**: Zeabur 直連繞過 Supabase RLS 政策
- **密碼政策**: 依賴 Google OAuth，無自訂密碼策略

### 資料保護

✅ **已實作**:
- 環境變數分離 (`.env.local.example`)
- 資料庫連接字串遮罩 (`lib/db/zeabur.ts:28-31`)
- SSL 連接 (生產環境)

⚠️ **缺失**:
- **靜態資料加密**: 敏感欄位 (tax_id, bank_account) 未加密
- **傳輸層安全**: 無 HSTS header
- **日誌安全**: console.log 可能洩漏敏感資訊
- **檔案上傳驗證**: `CompanySettingsForm` 上傳檔案無類型/大小驗證

### 依賴安全

```bash
# 建議執行
npm audit
npm audit fix
```

**已知問題** (需手動檢查):
- React 19 較新，部分生態系統套件可能有相容性問題
- Supabase SDK 版本需定期更新

---

## 7. 效能評估 | Performance Assessment

### 潛在瓶頸

| 瓶頸類型 | 位置 | 影響 | 建議修復 |
|---------|------|------|----------|
| **N+1 查詢** | `lib/services/database.ts` | 🔴 High | 使用 JOIN 或 Dataloader |
| **大型 JSON 序列化** | 公司設定 (name, address 為 JSONB) | 🟡 Medium | 考慮正規化或索引 |
| **缺少分頁** | `app/[locale]/quotations/page.tsx` | 🔴 High | 所有清單都應分頁 |
| **Client-Side 排序/過濾** | `QuotationList.tsx` | 🟡 Medium | 移至伺服器端 |
| **同步匯率 API** | `lib/services/exchange-rate.ts` | 🟡 Medium | 改用 Cron Job 預先快取 |
| **PDF 生成阻塞** | `lib/pdf/generator.ts` | 🟡 Medium | 改用 Queue (e.g., BullMQ) |
| **連接池未優化** | `lib/db/zeabur.ts:34-40` | 🟢 Low | 目前設定合理 (max: 20) |

### 資料庫效能

**索引情況**:
```sql
-- 已有索引 (從 migrations 確認)
CREATE INDEX idx_quotations_user_id ON quotations(user_id);
CREATE INDEX idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_company_members_company_id ON company_members(company_id);
-- ... 等 15+ 個索引
```

✅ **良好實踐**:
- 主要查詢欄位都有索引
- 使用複合索引 (e.g., `company_id + user_id`)
- JSONB 欄位有 GIN 索引 (待確認)

⚠️ **待優化**:
- 缺少 `exchange_rates(base_currency, target_currency, date)` 複合索引
- 缺少 query plan 分析工具
- 無慢查詢日誌監控

### 前端效能

**Bundle 大小** (需要實際測量):
- 預估首屏 JS: ~300KB (gzipped)
- recharts 套件較大: ~150KB
- @react-pdf/renderer: ~200KB

**優化建議**:
1. 動態匯入 (Dynamic Import) PDF 生成模組
2. Code Splitting 按路由拆分
3. 圖片優化 (使用 Next.js Image 組件)
4. 考慮使用 CDN (Vercel 自動處理)

---

## 8. 技術債務與 Code Smell | Technical Debt

### 高優先級技術債務

#### 1. 資料庫架構混亂 (P0)
**問題**:
- Supabase (認證) + Zeabur (業務資料) 混合架構
- 直接使用 `pg` 繞過 Supabase RLS
- 連接邏輯分散在多個檔案

**影響**:
- 開發者困惑 (何時用哪個 client)
- RLS 政策無法完全生效
- 難以遷移或擴展

**解決方案**:
```
選項 A: 統一使用 Supabase
- 將業務資料遷移到 Supabase
- 完全使用 Supabase Client
- 移除 lib/db/zeabur.ts

選項 B: 統一使用 Zeabur (推薦)
- 將認證遷移到自建方案 (e.g., NextAuth)
- 完全移除 Supabase 依賴
- 簡化架構

選項 C: 清晰分層 (短期)
- 明確定義哪些資料在哪個資料庫
- 建立統一的資料存取層
- 文件化資料流向
```

#### 2. 認證邏輯不一致 (P0)
**問題**:
- `lib/auth.ts` 封裝 Supabase Auth 為 NextAuth 介面
- 部分 API routes 直接用 `createClient()`
- 部分使用 `getServerSession()`

**Code Smell**:
```typescript
// ❌ 不一致的做法
// 檔案 A
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// 檔案 B
const session = await getServerSession();
const userId = session?.user?.id;
```

**建議**:
- 統一使用一種認證方式
- 建立 `lib/auth/index.ts` 作為唯一入口
- 所有 routes 使用 `withAuth()` HOC

#### 3. 缺乏統一錯誤處理 (P1)
**問題**:
- 每個 API route 都有重複的 try-catch
- 錯誤訊息格式不一致
- 無錯誤追蹤和監控

**範例**:
```typescript
// ❌ 重複模式
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth(request);
    if (error) return error;
    // ... 業務邏輯
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

**建議方案**:
```typescript
// ✅ 統一錯誤處理
// lib/middleware/errorHandler.ts
export function withErrorHandler(handler) {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      logger.error('API Error', { error, url: req.url });
      return formatErrorResponse(error);
    }
  };
}

// 使用
export const GET = withErrorHandler(
  withAuth(async (req, { userId }) => {
    // 乾淨的業務邏輯
  })
);
```

#### 4. 巨大的組件檔案 (P1)
**問題**:
- `QuotationForm.tsx`: 837 行
- `QuotationEditForm.tsx`: 593 行
- `CompanySettings.tsx`: 490 行

**重構建議**:
```
QuotationForm.tsx (837 行)
  ↓ 拆分為:
  ├─ QuotationFormHeader.tsx (表頭資訊)
  ├─ QuotationItemsTable.tsx (明細表格)
  ├─ QuotationSummary.tsx (金額統計)
  ├─ QuotationNotesTemplate.tsx (備註模版)
  ├─ useQuotationForm.ts (業務邏輯 hook)
  └─ useExchangeRates.ts (匯率邏輯 hook)
```

#### 5. 過度使用 `any` 型別 (P2)
**統計**: 93 個檔案使用 `any`

**常見位置**:
- `quotation?: any` (應該是 `Quotation` 型別)
- `params?: any[]` (應該是具體參數型別)
- `data: any` (API 回應應該有型別)

**影響**:
- 失去 TypeScript 型別檢查優勢
- IDE 自動完成失效
- 潛在執行期錯誤

**修復策略**:
1. 為所有 API 回應定義 interface
2. 使用 `unknown` 替代 `any`，強制型別檢查
3. 漸進式重構，從核心模組開始

#### 6. Console 語句過多 (P2)
**統計**: 133 個 console.log/error/warn

**問題**:
- 生產環境會輸出敏感資訊
- 無法結構化查詢日誌
- 效能影響 (雖然很小)

**解決方案**:
```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    if (process.env.NODE_ENV === 'production') {
      // 發送到 log service (e.g., Datadog, LogRocket)
      sendToLogService('info', message, meta);
    } else {
      console.log(message, meta);
    }
  },
  error: (message: string, error?: Error, meta?: object) => {
    // 發送到 error tracking (e.g., Sentry)
    sendToErrorTracking(error, { message, ...meta });
  },
};

// 使用
logger.info('User logged in', { userId, timestamp: Date.now() });
```

### Code Smell 清單

| Smell | 範例位置 | 影響 |
|-------|---------|------|
| **God Object** | `lib/services/database.ts` (455 行) | 難以測試和維護 |
| **Feature Envy** | QuotationForm 直接操作多個 service | 耦合度高 |
| **Primitive Obsession** | 使用 `string` 表示 `currency`, `status` | 缺乏型別安全 |
| **Long Parameter List** | `createQuotation(userId, customerId, items, currency, ...)` | 考慮使用 DTO |
| **Duplicated Code** | 表單驗證邏輯重複 | 抽取共用函數 |
| **Magic Numbers** | `max: 20`, `idleTimeoutMillis: 30000` | 定義常數 |

---

## 9. 優先級改進建議 | Recommended Actions

### P0 - Critical (立即修復)

| 優先級 | 行動項目 | 負責子模組/檔案 | 預估工時 | 影響範圍 |
|--------|---------|----------------|----------|----------|
| P0-1 | **統一資料庫存取策略** | `lib/db/`, `lib/supabase/` | 16h | 全域 |
| P0-2 | **實作 CSRF 保護** | `lib/middleware/csrf.ts` | 4h | 所有 API routes |
| P0-3 | **加密敏感資料** (tax_id, bank_account) | `migrations/`, `lib/crypto/` | 8h | 公司設定 |
| P0-4 | **修復 RLS 繞過問題** | `lib/db/zeabur.ts` | 8h | 資料安全 |

**總計**: 36 小時 (約 4.5 個工作天)

### P1 - High (本週完成)

| 優先級 | 行動項目 | 負責子模組/檔案 | 預估工時 | 影響範圍 |
|--------|---------|----------------|----------|----------|
| P1-1 | **建立統一錯誤處理** | `lib/middleware/errorHandler.ts` | 6h | API 層 |
| P1-2 | **實作結構化日誌** | `lib/logger/index.ts` | 4h | 全域 |
| P1-3 | **完善 Rate Limiting** | `lib/middleware/rate-limiter.ts` | 4h | 高風險 API |
| P1-4 | **重構 QuotationForm** (拆分組件) | `app/[locale]/quotations/` | 12h | 報價單功能 |
| P1-5 | **新增 API 分頁** | 所有清單 API | 8h | 效能 |

**總計**: 34 小時 (約 4 個工作天)

### P2 - Medium (本月完成)

| 優先級 | 行動項目 | 負責子模組/檔案 | 預估工時 | 影響範圍 |
|--------|---------|----------------|----------|----------|
| P2-1 | **增加測試覆蓋率** (目標 70%) | `tests/` | 40h | 程式碼品質 |
| P2-2 | **減少 `any` 使用** (目標 < 20 個檔案) | 全域型別重構 | 16h | 型別安全 |
| P2-3 | **實作 APM 監控** (e.g., Vercel Analytics) | 整合設定 | 4h | 可觀測性 |
| P2-4 | **優化資料庫查詢** (消除 N+1) | `lib/services/` | 12h | 效能 |
| P2-5 | **前端 Bundle 優化** | 動態匯入、Code Splitting | 8h | 使用者體驗 |
| P2-6 | **建立 CI/CD 流程** | `.github/workflows/` | 6h | 開發效率 |

**總計**: 86 小時 (約 10 個工作天)

### P3 - Low (下一季度)

- 實作 E2E 測試 (Playwright)
- 建立 Storybook (組件文件)
- 國際化支援更多語言 (日文、韓文)
- 實作即時通知 (WebSocket)
- 建立管理後台 (super admin console)

---

## 10. 開放問題與未知領域 | Open Questions

### 架構決策

1. **資料庫策略最終方案?**
   - 繼續混合架構?
   - 統一到 Supabase?
   - 統一到 Zeabur?
   - 預期資料量和併發量?

2. **認證系統方向?**
   - 繼續使用 Supabase Auth?
   - 遷移到 NextAuth / Auth.js?
   - 是否需要支援多種登入方式 (帳號密碼、SAML SSO)?

3. **多公司架構完整性?**
   - 目前實作到什麼程度?
   - 是否所有功能都支援 company_id 隔離?
   - 如何處理跨公司資料存取?

### 業務邏輯

4. **付款追蹤系統使用情況?**
   - `contracts` 和 `payments` 表是否已投入生產?
   - 使用者反饋如何?
   - 是否需要整合第三方支付?

5. **匯率更新機制?**
   - 目前是手動更新還是自動?
   - Cron Job 是否已部署? (docs 中提到但未確認)
   - 匯率資料保留多久?

6. **PDF 生成效能?**
   - 單次生成時間?
   - 是否有使用者抱怨?
   - 是否需要非同步處理?

### 測試與品質

7. **測試覆蓋率實際情況?**
   - 338 個測試檔案具體覆蓋率?
   - 哪些模組測試不足?
   - E2E 測試計劃?

8. **生產環境監控?**
   - 是否有 APM 工具?
   - 錯誤追蹤工具 (Sentry)?
   - 使用者行為分析?

### 部署與運維

9. **當前部署環境?**
   - Vercel 哪個方案? (Hobby / Pro / Enterprise)
   - Zeabur 資料庫配置? (CPU/Memory/Storage)
   - 是否有備份策略?

10. **災難復原計劃?**
    - 資料庫備份頻率?
    - 是否有測試過還原?
    - RTO/RPO 目標?

### 未來規劃

11. **使用者規模預期?**
    - 目前有多少使用者?
    - 一年內預期成長?
    - 是否需要考慮水平擴展?

12. **功能優先級?**
    - ROADMAP.md 中的哪些功能最重要?
    - 是否有客戶特定需求?
    - 行動裝置 App 計劃?

---

## 11. 附錄 | Appendix

### A. 關鍵檔案清單

**核心架構** (必讀):
```
/middleware.ts                        # 全域中介軟體
/lib/supabase/server.ts               # Supabase Client
/lib/db/zeabur.ts                     # Zeabur DB Client
/lib/services/rbac.ts                 # 權限系統
/lib/auth.ts                          # 認證封裝
```

**業務邏輯**:
```
/lib/services/database.ts             # 通用 CRUD
/lib/services/company.ts              # 公司管理
/lib/services/contracts.ts            # 合約管理
/lib/services/payments.ts             # 付款追蹤
```

**資料庫**:
```
/migrations/000_initial_schema.sql    # 初始架構
/migrations/001_rbac_and_new_features.sql
/migrations/002_rbac_fixed.sql
/migrations/003_multi_company_architecture.sql
/migrations/004_contracts_and_payments_enhancement.sql
/migrations/005_super_admin_setup.sql
```

**文件**:
```
/README.md                            # 專案說明
/ROADMAP.md                           # 開發路線圖
/CHANGELOG.md                         # 變更日誌 (超詳細!)
/ISSUELOG.md                          # 問題追蹤
/docs/ADMIN_ACCESS_TROUBLESHOOTING.md # 管理員存取指南
```

### B. 技術棧版本矩陣

| 技術 | 版本 | 發布日期 | 生命週期狀態 |
|------|------|---------|-------------|
| Next.js | 15.5.5 | 2025-01 | ✅ 最新穩定版 |
| React | 19.1.0 | 2024-12 | ✅ 最新穩定版 |
| TypeScript | 5.x | 2024 | ✅ 最新穩定版 |
| Tailwind CSS | 4.x | 2024-12 | ✅ 最新穩定版 |
| Supabase JS | 2.75.0 | 2025-01 | ✅ 活躍維護 |
| PostgreSQL | 14+ | - | ✅ 長期支援 |
| next-intl | 4.3.12 | 2025-01 | ✅ 活躍維護 |
| Vitest | 3.2.4 | 2025-01 | ✅ 活躍維護 |

### C. 效能基準 (需實際測量)

**建議使用工具**:
- Lighthouse (網頁效能)
- Web Vitals (CLS, LCP, FID)
- Chrome DevTools Performance
- k6 或 Artillery (負載測試)

**目標指標**:
```
FCP (First Contentful Paint):     < 1.5s
LCP (Largest Contentful Paint):   < 2.5s
TTI (Time to Interactive):        < 3.5s
CLS (Cumulative Layout Shift):    < 0.1
FID (First Input Delay):          < 100ms

API 回應時間 (P95):               < 200ms
資料庫查詢 (P95):                 < 50ms
併發使用者 (目標):                 500
```

### D. 安全檢查清單

- [ ] 所有 API routes 都有認證檢查
- [ ] 敏感資料欄位已加密
- [ ] 環境變數不在 git repo 中
- [ ] CSRF token 保護已實作
- [ ] Rate limiting 已套用到高風險端點
- [ ] SQL injection 防護 (parameterized queries)
- [ ] XSS 防護 (React 自動處理，需檢查例外)
- [ ] CORS 政策正確配置
- [ ] HTTPS 強制使用 (生產環境)
- [ ] 密碼/金鑰輪替機制
- [ ] 安全 Headers (CSP, X-Frame-Options, etc.)
- [ ] 依賴套件定期更新
- [ ] 安全審計日誌

### E. 快速開始指令

```bash
# 安裝依賴
pnpm install

# 設定環境變數
cp .env.local.example .env.local
# 編輯 .env.local 填入實際值

# 執行資料庫遷移
export ZEABUR_POSTGRES_URL='postgresql://...'
psql "$ZEABUR_POSTGRES_URL" -f migrations/000_initial_schema.sql
# ... 依序執行其他 migration

# 啟動開發伺服器
pnpm dev

# 執行測試
pnpm test

# 建置生產版本
pnpm build
```

### F. 團隊聯絡與資源

**專案維護者**: (待填寫)  
**技術負責人**: (待填寫)  
**Slack Channel**: (待填寫)  
**文件連結**: https://github.com/your-org/quotation-system

---

## 總結 | Conclusion

這是一個結構良好、文件完整的中型 SaaS 專案，展現了現代化的技術棧和清晰的業務邏輯。主要優勢在於詳細的變更日誌、完善的型別系統和清晰的模組劃分。

**關鍵挑戰**:
1. 資料庫架構混亂 (Supabase + Zeabur 混合)
2. 認證邏輯不統一
3. 缺乏生產環境監控和錯誤追蹤

**建議行動路線**:
1. **本週**: 修復 P0 安全問題 (CSRF, RLS 繞過)
2. **本月**: 重構核心架構 (統一資料庫策略)
3. **本季**: 提升測試覆蓋率和效能優化

**健康趨勢**: 📈 持續改進中 (從 CHANGELOG 看出積極開發)

---

**報告產生時間**: 2025-10-20  
**下次評估建議**: 2025-11-20 (一個月後)
