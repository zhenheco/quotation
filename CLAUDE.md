# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Reference Commands

```bash
# Development
pnpm dev                      # Start dev server (DO NOT auto-start - user manages this)
pnpm run build                # Build for production (Next.js + OpenNext.js)
pnpm run lint                 # Run ESLint
pnpm run lint:fix             # Auto-fix ESLint issues
pnpm run typecheck            # TypeScript type checking

# Testing
pnpm test                     # Run all tests (Vitest)
pnpm test:run                 # Run tests once
pnpm test:watch               # Watch mode
pnpm run test:unit            # Unit tests only
pnpm run test:integration     # Integration tests only
pnpm run test:e2e:playwright  # Playwright E2E tests

# Database
pnpm db:verify                # Verify schema sync
pnpm migrate                  # Run migrations
pnpm seed                     # Seed test data

# Cloudflare
pnpm run preview:cf           # Preview on Cloudflare
pnpm run deploy:cf            # Deploy to Cloudflare
```

---

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Deployment**: Cloudflare Workers (via OpenNext.js)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth, Email/Password)
- **Styling**: Tailwind CSS 4
- **State**: TanStack Query
- **i18n**: next-intl (EN/ZH)

### Key Architectural Patterns

#### 1. Data Access Layer (DAL) Pattern
All database operations go through `lib/dal/*.ts`:
```typescript
import { getSupabaseClient } from '@/lib/db/supabase-client'
// DAL functions handle queries and return typed results
```

#### 2. API Route Structure
- `app/api/**/route.ts` - Next.js API routes
- All API routes use DAL functions, never direct DB queries
- Standard response format: `{ success: boolean, data?: T, error?: string }`

#### 3. Server vs Client Components
- Pages in `app/[locale]/**/page.tsx` are server components by default
- Client components use `'use client'` directive
- Forms and interactive components in separate `*Form.tsx` or `*Client.tsx` files

#### 4. Multi-tenant Architecture
- Company-based data isolation via `company_id` in all tables
- User context from `lib/utils/company-context.ts`
- RBAC via `lib/services/rbac.ts` and `lib/dal/rbac.ts`

### Directory Structure (Key Paths)
```
app/
├── [locale]/           # i18n routes (dashboard, products, customers, etc.)
├── admin/              # Admin console (no i18n)
├── api/                # API routes
└── auth/               # OAuth callbacks

lib/
├── dal/                # Data Access Layer (DB queries)
├── services/           # Business logic
├── api/                # API client utilities
├── security/           # CSRF, headers, validation
└── observability/      # Logging, tracing

types/                  # TypeScript types
messages/               # i18n translations (en.json, zh.json)
migrations/             # SQL migration files
```

---

## Development Policies

### Do NOT Auto-Start Dev Server
The development server is managed manually by the user.

### Pre-commit Hooks (Husky + lint-staged)
Commits automatically trigger:
1. ESLint check + auto-fix on staged `.ts`/`.tsx` files
2. TypeScript type checking (`tsc --noEmit`)
3. Lockfile sync verification

If commit fails, fix with:
```bash
pnpm run lint:fix    # Fix ESLint
pnpm run typecheck   # See type errors
pnpm install         # Sync lockfile
```

---

## Cloudflare Workers Deployment Checklist

**90% of deployment failures are lockfile sync issues!**

### Before Every Push to main:
```bash
# 1. If any packages were installed/updated:
pnpm install
git add pnpm-lock.yaml

# 2. Verify build passes:
pnpm run build

# 3. Commit with lockfile:
git status  # Ensure pnpm-lock.yaml is staged
```

### Never:
- Use `npm install` (breaks lockfile sync)
- Modify `package.json` without running `pnpm install`
- Push without committing `pnpm-lock.yaml`

### On Deployment Failure:
```bash
gh run view <run-id> --log
# If ERR_PNPM_OUTDATED_LOCKFILE: run pnpm install and commit lockfile
```

---

## TypeScript Conventions

### Forbidden:
- `any` type (unless with `eslint-disable-next-line` + explanation)
- `@ts-ignore` (use `@ts-expect-error` with explanation instead)

### Required Patterns:

```typescript
// API Response typing
const data = await response.json() as { token: string };

// Error handling
try {
  // ...
} catch (error) {
  console.error((error as Error).message);
}

// Cloudflare Workers compatibility
interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}
```

### When @ts-expect-error is Allowed:
```typescript
// ✅ With explanation for infrastructure incompatibility
// @ts-expect-error - Cloudflare Workers RequestInit type compatibility
const config: RequestInit = { ... };
```

---

## Database

### Access Pattern
```typescript
import { getSupabaseClient } from '@/lib/db/supabase-client'
const db = getSupabaseClient()  // Uses Service Role (bypasses RLS)
const { data } = await db.from('products').select('*')
```

### Key Tables
- Auth: `user_profiles`, `user_roles`, `roles`, `permissions`
- Business: `products`, `customers`, `quotations`, `quotation_items`
- Finance: `payments`, `payment_schedules`, `customer_contracts`
- Company: `companies`, `company_settings`

### After Running Migrations
```sql
-- Record the migration
INSERT INTO schema_migrations (filename) VALUES ('0XX_migration.sql');
-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
```

---

## OpenSpec Change Management

<!-- OPENSPEC:START -->
When the request mentions **planning, proposals, architecture changes, or new capabilities**, always read `@/openspec/AGENTS.md` first for:
- How to create and apply change proposals
- Spec format and conventions
- Project structure guidelines
<!-- OPENSPEC:END -->

---

## OAuth Redirect Troubleshooting

Common issue: After Google login, redirect goes to wrong URL.

### Root Causes (check in order):
1. **GitHub Secrets** point to wrong Supabase project
2. **`NEXT_PUBLIC_*` variables** not set at build time in CI
3. **Supabase Dashboard**: Site URL not set to `https://quote24.cc`

### Quick Diagnosis:
```bash
# Check production JS bundle for correct Supabase URL
curl -s "https://quote24.cc/zh/login" | grep -o '[a-z]*\.supabase\.co'
```

### Fix Checklist:
1. GitHub Secrets: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. GitHub Actions workflow: Build step has all `NEXT_PUBLIC_*` env vars
3. Supabase Dashboard: Site URL = `https://quote24.cc`, Redirect URLs include `https://quote24.cc/**`

---

## 🐛 已知問題與解法

### 擴大書審 - 純益率查詢無結果

**問題**：在營所稅擴大書審頁面搜尋行業別時顯示「查無結果」，即使資料庫有資料
**原因**：前端傳送西元年（如 2024），但資料庫使用民國年格式（如 113）
**解法**：在 `app/api/accounting/profit-rates/route.ts` 新增年份轉換邏輯：
```typescript
// 如果年份 > 1911，表示是西元年，需要轉換
const taxYear = rawTaxYear > 1911 ? rawTaxYear - 1911 : rawTaxYear
```
**日期**：2026-01-06

---

### 新增模組 API 返回 403 Forbidden

**問題**：新增訂單/出貨模組後，API 呼叫返回 403 Forbidden，即使使用者已登入且有正確的角色
**原因**：Migration 只建立了資料表和 RLS 政策，但 `permissions` 表沒有對應的權限記錄。API middleware (`withAuth`) 會檢查使用者是否有該權限
**解法**：
1. 在 `permissions` 表新增對應權限記錄（如 `orders:read`, `orders:write` 等）
2. 在 `role_permissions` 表將權限分配給相關角色

```sql
-- 新增權限
INSERT INTO permissions (name, description, resource, action)
VALUES
  ('orders:read', '查看訂單', 'orders', 'read'),
  ('orders:write', '建立/編輯訂單', 'orders', 'write');

-- 分配給角色
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM roles, permissions
WHERE roles.name = 'company_owner'
  AND permissions.name IN ('orders:read', 'orders:write');
```
**日期**：2026-01-09

---

### 訂閱方案頁面無法顯示方案卡片

**問題**：/pricing 頁面沒有顯示方案卡片和購買按鈕，只有空白區域
**原因**：`useSubscriptionPlans` hook 讀取 `data.plans`，但 API 實際返回 `{ data: [...], meta: {...} }` 格式
**解法**：修改 `hooks/use-subscription.ts` 中的 `useSubscriptionPlans` 函數：
```typescript
// 修改前
return data.plans

// 修改後
return result.data || []
```
**日期**：2026-01-12

---

### Webhook 測試 Mock 模組路徑錯誤

**問題**：`tests/integration/api/webhooks/affiliate-payment.test.ts` 測試全部被 skip，原因是 mock 了錯誤的模組路徑
**原因**：測試 mock `@/lib/sdk/payment-gateway-client`，但實際 API 使用 `@/lib/services/affiliate-payment`（它是 SDK 的包裝層）
**解法**：修正測試中的 mock 路徑和 import：
```typescript
// ❌ 錯誤：直接 mock SDK 層
vi.mock('@/lib/sdk/payment-gateway-client', () => ({
  parsePaymentWebhook: vi.fn(),
  PaymentGatewayError: class MockError extends Error { ... },
}))

// ✅ 正確：mock 服務層（API 實際使用的）
vi.mock('@/lib/services/affiliate-payment', () => ({
  parsePaymentWebhook: vi.fn(),
  handlePaymentFailed: vi.fn(),
  PaymentGatewayError: class MockError extends Error { ... },
}))
```
**日期**：2026-01-20

---

### Checkout API - 訂單 ID 包含底線（已修正）

**問題**：當 `company_id` 包含底線（如 `test_company_123`）時，生成的訂單 ID 也包含底線，不符合 PAYUNi 規範
**原因**：`app/api/subscriptions/checkout/route.ts` Line 131 直接使用 `company_id.substring(0, 8)`，未移除底線
**影響**：PAYUNi 可能拒絕包含底線的訂單 ID，導致付款失敗
**解法**：
```typescript
// 修改前
const orderId = `SUB-${body.company_id.substring(0, 8)}-${Date.now()}`

// 修改後
const sanitizedCompanyId = body.company_id.replace(/_/g, '-')
const orderId = `SUB-${sanitizedCompanyId.substring(0, 8)}-${Date.now()}`
```
**測試**：`tests/integration/api/subscriptions/checkout.test.ts` Line 213-240（✅ 已通過）
**日期**：2026-01-20

---

### Checkout API - 金流錯誤訊息未包裝（已修正）

**問題**：金流 SDK 返回錯誤時，API 直接透傳錯誤訊息（如 'Insufficient funds'），而非統一的 '建立付款失敗'
**原因**：`app/api/subscriptions/checkout/route.ts` Line 180-182 直接使用 `result.error`
**影響**：前端無法統一處理錯誤，可能暴露內部實現細節
**解法**：
```typescript
// 修改前
if (!result.success || !paymentForm) {
  return NextResponse.json(
    { success: false, error: result.error || '建立付款失敗' },
    { status: 500 }
  )
}

// 修改後
if (!result.success || !paymentForm) {
  // 包裝錯誤訊息，不暴露內部實現細節
  const errorMessage = result.error ? '建立付款失敗' : '建立付款失敗'
  return NextResponse.json(
    { success: false, error: errorMessage },
    { status: 500 }
  )
}
```
**測試**：`tests/integration/api/subscriptions/checkout.test.ts` Line 457-485（✅ 已通過）
**日期**：2026-01-20

---

### 報價單轉訂單失敗 - 狀態約束不一致（已修正）

**問題**：報價單選擇「已接受」後，無法建立訂單
**原因**：`scripts/update-db-constraint.sql` 將 CHECK 約束改為 `signed`，但 UI 和後端都使用 `accepted`
**解法**：
1. 建立 migration `supabase/migrations/20260123103300_fix_quotation_status_accepted.sql`
2. 將 `signed` 狀態轉回 `accepted`
3. 重建 CHECK 約束允許：`draft`, `sent`, `accepted`, `rejected`, `expired`
**日期**：2026-01-23

---
