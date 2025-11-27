<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

## 🖥️ 開發伺服器政策

**不要自動啟動開發伺服器**。開發伺服器由用戶手動管理。

---

## 🚨 Cloudflare Workers 部署檢查（強制執行）

**每次推送到 main 分支前必須執行**：

### 1. 依賴同步檢查（最重要！90% 部署失敗原因）
```bash
# 如果安裝了任何套件，必須執行：
pnpm install
git add pnpm-lock.yaml
```

**原因**：GitHub Actions 使用 `pnpm install --frozen-lockfile`，lockfile 過期會導致部署失敗

**絕對不要**：
- ❌ 使用 `npm install`（會導致 lockfile 不同步）
- ❌ 安裝套件後未提交 `pnpm-lock.yaml`
- ❌ 手動修改 `package.json` 後未執行 `pnpm install`

### 2. Build 測試
```bash
pnpm run build
```

### 3. 提交前確認
```bash
# 確保 pnpm-lock.yaml 已包含在提交中
git status
git add pnpm-lock.yaml
```

**完整檢查清單**：參考 `DEPLOYMENT_CHECKLIST.md`

**如遇到部署失敗**：
1. 查看 GitHub Actions 日誌：`gh run view <run-id> --log`
2. 如果是 `ERR_PNPM_OUTDATED_LOCKFILE`：執行 `pnpm install` 並提交 lockfile
3. 更新 `DEPLOYMENT_CHECKLIST.md` 記錄新的失敗模式

---

## 🛡️ 自動化品質防護機制

本專案已啟用 **Pre-commit hooks**（使用 Husky + lint-staged），確保程式碼品質。

### Pre-commit Hook 行為

每次執行 `git commit` 時，會自動：

1. **ESLint 檢查和自動修復**
   - 檢查所有 staged 的 `.ts` 和 `.tsx` 檔案
   - 自動修復可修復的問題（如格式化、移除未使用的導入等）
   - 如果有無法自動修復的錯誤，會阻止 commit 並顯示錯誤訊息

2. **TypeScript 類型檢查**
   - 執行 `tsc --noEmit` 檢查整個專案的類型錯誤
   - 如果有類型錯誤，會阻止 commit 並顯示錯誤訊息

3. **依賴同步檢查**
   - 如果 `pnpm-lock.yaml` 被修改，自動執行 `pnpm install --frozen-lockfile --lockfile-only`
   - 確保 lockfile 與 `package.json` 同步

### 如何通過 Pre-commit Hook

1. **修正 ESLint 錯誤**：
   ```bash
   pnpm run lint:fix  # 自動修復
   pnpm run lint      # 查看剩餘錯誤
   ```

2. **修正 TypeScript 錯誤**：
   ```bash
   pnpm run typecheck  # 查看類型錯誤
   ```

3. **同步依賴**：
   ```bash
   pnpm install  # 安裝並同步 lockfile
   ```

### 緊急情況繞過 Hooks

⚠️ **僅在緊急情況使用**，且需要在下一個 commit 修正問題：

```bash
git commit --no-verify -m "緊急修復：[描述問題]"
```

### Commit 前自動檢查清單

Pre-commit hooks 會自動執行以下檢查（無需手動執行）：

- ✅ 所有 staged 檔案通過 ESLint 檢查
- ✅ 整個專案通過 TypeScript 類型檢查
- ✅ `pnpm-lock.yaml` 與 `package.json` 同步

如果遇到任何錯誤，commit 會被阻止，並顯示錯誤訊息指引如何修正。

---

## 🔒 TypeScript 類型安全規範

### 核心原則

**絕對禁止**：
- ❌ 使用 `any` 類型（除非使用 `eslint-disable-next-line` 並註明原因）
- ❌ 忽略類型錯誤以「讓編譯通過」
- ❌ 使用 `@ts-ignore`（應使用 `@ts-expect-error` 並說明原因）

**強制要求**：
- ✅ 所有函式參數必須有明確類型
- ✅ 所有函式必須有回傳類型
- ✅ API response 必須做類型斷言
- ✅ Error 物件屬性存取必須使用類型斷言

### 類型定義模式

#### 1. API Response 類型斷言
```typescript
// ✅ 正確
const data = await response.json() as { token: string };
const errorData = await response.json().catch(() => ({})) as ApiError;

// ❌ 錯誤
const data = await response.json();  // unknown type
```

#### 2. Error 物件處理
```typescript
// ✅ 正確
try {
  // ...
} catch (error) {
  console.error((error as Error).message);
  const code = (error as { code?: string }).code;
}

// ❌ 錯誤
try {
  // ...
} catch (error) {
  console.error(error.message);  // Type error
}
```

#### 3. Database 類型占位符
```typescript
// ✅ 正確（當 Database 類型不可用時）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompanyRow = any; // Database type placeholder

// ❌ 錯誤
type CompanyRow = any;  // 缺少 eslint-disable 和說明
```

#### 4. RequestInit Body 類型
```typescript
// ✅ 正確（避免 Cloudflare Workers 類型衝突）
interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

// ❌ 錯誤
interface FetchOptions extends RequestInit {
  body?: CustomType  // 與 RequestInit['body'] 衝突
}
```

#### 5. 中間件類型導入
```typescript
// ✅ 必須明確導入類型
import type { PermissionResource, PermissionAction } from '@/types/rbac.types';

const hasAccess = await checkPermission(
  userId,
  resource as PermissionResource,
  action as PermissionAction
);
```

### 何時使用 @ts-expect-error

**允許使用的情況**（必須加註解說明）：
- ✅ Cloudflare Workers/D1/Neon 等基礎設施類型不相容
- ✅ TanStack Query 等第三方套件回調參數類型不完整
- ✅ 複雜泛型類型推導問題

**範例**：
```typescript
// ✅ 正確：說明原因
// @ts-expect-error - Cloudflare Workers RequestInit type compatibility
const requestConfig: RequestInit = { ... };

// @ts-expect-error - TanStack Query onMutate argument type compatibility
userContext = await config.onMutate(variables);

// ❌ 錯誤：沒有說明
// @ts-expect-error
const config = { ... };
```

**禁止使用的情況**：
- ❌ 業務邏輯層的類型錯誤
- ❌ 可透過正確類型定義解決的問題
- ❌ 單純為了通過編譯

### 類型檢查工作流程

**開發時**：
```bash
# 即時類型檢查（在編輯器中）
# VS Code 會自動顯示類型錯誤

# 手動執行完整檢查
pnpm run typecheck
```

**提交前**：
```bash
# Pre-commit hook 會自動執行
# 無需手動執行，有錯誤會自動阻止 commit
```

**修復類型錯誤時的優先順序**：
1. ✅ 優先：定義正確的類型
2. ✅ 次之：使用類型斷言（`as Type`）
3. ⚠️ 謹慎：使用 `@ts-expect-error`（必須註明原因）
4. ❌ 禁止：使用 `any` 或 `@ts-ignore`

### 常見類型錯誤快速參考

| 錯誤訊息 | 解決方案 |
|---------|---------|
| `Property 'X' does not exist on type 'unknown'` | 加上 `as Type` 類型斷言 |
| `Cannot find name 'TypeName'` | 檢查導入和實際類型名稱 |
| `Property 'error' is missing in type '{}'` | 提供完整的錯誤物件或 fallback |
| `Conversion of type 'X' to type 'Y' may be a mistake` | 使用 `as unknown as Y` 中間斷言 |
| `Expected 0 arguments, but got 1` | 檢查函式定義，移除多餘參數 |

**詳細說明**：參考 `DEPLOYMENT_CHECKLIST.md` 的「TypeScript 類型檢查最佳實踐」章節

---

## 🗄️ 混合資料庫架構說明（重要！）

本專案使用 **混合資料庫架構**，必須理解兩個資料庫的職責分工：

### 架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                      應用程式層                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐              ┌────────────────────┐   │
│  │   Supabase       │              │  Cloudflare D1     │   │
│  │   (遠端)         │              │  (遠端 + 本地)     │   │
│  ├──────────────────┤              ├────────────────────┤   │
│  │ • Auth (認證)    │              │ • customers        │   │
│  │ • user_profiles  │              │ • quotations       │   │
│  │ • user_roles     │              │ • products         │   │
│  │ • user_permissions│             │ • payments         │   │
│  │ • roles          │              │ • payment_schedules│   │
│  │ • role_permissions│             │ • customer_contracts│  │
│  └──────────────────┘              │ • companies        │   │
│                                     │ • 其他業務表...    │   │
│                                     └────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 資料庫職責分工

#### Supabase（使用者與權限）
**位置**：遠端（`https://oubsycwrxzkuviakzahi.supabase.co`）
**用途**：
- ✅ 使用者認證（Auth）
- ✅ 使用者資料（`user_profiles`）
- ✅ 角色與權限（`user_roles`, `roles`, `permissions`, `role_permissions`）

**存取方式**：
```typescript
// lib/services/rbac.ts
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data } = await supabase.from('user_profiles').select('*')
```

#### Cloudflare D1（業務資料）
**位置**：遠端生產環境 + 本地開發環境
**用途**：
- ✅ 所有業務資料（客戶、報價單、產品、付款等）
- ✅ 日誌與追蹤（`logs`, `traces`, `audit_logs`）
- ✅ 監控資料（`usage_stats`, `alert_events`）

**存取方式**：
```typescript
// lib/dal/*.ts
import { getD1Client } from '@/lib/db/d1-client'
const db = getD1Client(env)
const customers = await db.query('SELECT * FROM customers WHERE user_id = ?', [userId])
```

### ⚠️ 常見錯誤與解決方案

#### 錯誤 1：測試腳本找不到使用者

**現象**：
```bash
❌ 找不到活躍的使用者，請先建立使用者資料
```

**原因**：
- 測試腳本查詢 Supabase `user_profiles` 表
- 但使用者可能只在 Auth 中註冊，尚未建立 `user_profile` 記錄
- 或本地 Supabase 環境與遠端不同步

**解決方案**：
1. **方法 A**：修改腳本使用 Supabase Auth Admin API
   ```typescript
   const { data: { users }, error } = await supabase.auth.admin.listUsers()
   const userId = users[0].id
   ```

2. **方法 B**：允許腳本接受環境變數指定 user_id
   ```typescript
   const userId = process.env.TEST_USER_ID || await getUserFromDatabase()
   ```

3. **方法 C**：從生產環境 D1 提取現有的 user_id
   ```bash
   # 需要有遠端 D1 存取權限
   pnpm exec wrangler d1 execute quotation-system-db \
     --command "SELECT DISTINCT user_id FROM customers LIMIT 1" \
     --remote
   ```

#### 錯誤 2：本地腳本無法存取生產資料

**現象**：
- 使用者在生產環境（https://quote24.cc）有資料
- 但本地測試腳本查詢不到

**原因**：
- 本地 D1 資料庫（`.wrangler/state/v3/d1`）與遠端生產環境分離
- 本地 Supabase 可能指向不同的資料庫實例

**解決方案**：
1. **開發時**：使用本地資料庫測試
   ```bash
   # 執行本地 migration
   pnpm exec wrangler d1 migrations apply quotation-system-db --local

   # 執行測試腳本（連接本地）
   pnpm run seed:payments
   ```

2. **驗證生產資料時**：
   - 使用 API 端點測試（通過部署的應用）
   - 或使用 wrangler 遠端命令（需要權限）
   - 或使用瀏覽器 DevTools 檢查前端請求

#### 錯誤 3：Wrangler 遠端存取被拒

**現象**：
```bash
✘ [ERROR] A request to the Cloudflare API failed.
  The given account is not valid [code: 7403]
```

**原因**：
- 本地 wrangler 未正確認證
- 或帳號權限不足

**解決方案**：
```bash
# 重新登入 Cloudflare
pnpm exec wrangler login

# 確認帳號
pnpm exec wrangler whoami

# 測試連接
pnpm exec wrangler d1 list
```

### 📝 測試資料最佳實踐

#### 本地開發測試
1. 確保本地 D1 已初始化：
   ```bash
   pnpm exec wrangler d1 migrations apply quotation-system-db --local
   ```

2. 先登入本地開發環境（如果有），或修改腳本使用固定 user_id

3. 執行測試腳本：
   ```bash
   # 設定測試用 user_id（可選）
   export TEST_USER_ID="your-user-id-here"

   # 執行測試資料腳本
   pnpm run seed:payments
   ```

#### 生產環境驗證
1. **不要直接在生產資料庫執行測試腳本**

2. 使用瀏覽器 + DevTools 驗證：
   - 登入生產環境
   - 開啟 Chrome DevTools (F12)
   - 檢查 Network 請求
   - 檢查 Console 錯誤

3. 或建立專門的測試 API 端點：
   ```typescript
   // app/api/test/seed-data/route.ts
   export async function POST(request: Request) {
     if (process.env.NODE_ENV === 'production') {
       return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
     }
     // 建立測試資料...
   }
   ```

### ✅ 檢查清單

開發新功能時，確認：
- [ ] 使用者資料查詢使用 Supabase（`user_profiles`, `user_roles` 等）
- [ ] 業務資料查詢使用 D1（`customers`, `quotations` 等）
- [ ] 測試腳本能處理 user_id 不存在的情況
- [ ] 本地測試使用本地資料庫，不影響生產環境
- [ ] API 端點正確處理兩個資料庫的資料關聯

### 🔍 Debug 技巧

**檢查 Supabase 連接**：
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
console.log('Current user:', user?.id, user?.email)
```

**檢查 D1 連接**：
```typescript
const db = getD1Client(env)
const result = await db.query('SELECT COUNT(*) as count FROM customers WHERE user_id = ?', [userId])
console.log('Customer count:', result[0]?.count)
```

**檢查環境變數**：
```bash
# .env.local 應包含
NEXT_PUBLIC_SUPABASE_URL=https://oubsycwrxzkuviakzahi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🔐 OAuth 登入重導向問題排查指南

### 問題現象

用戶從 `quote24.cc` 點擊 Google 登入後，被重導向到錯誤的 URL（如 `quotation-system.acejou27.workers.dev/?code=xxx`），而不是正確的 `quote24.cc/auth/callback`。

### 根本原因分析

這個問題通常由以下原因造成：

#### 1. GitHub Secrets 指向錯誤的 Supabase 專案（最常見！）

**症狀**：
- 本地開發正常，但生產環境 OAuth 失敗
- 重導向到 Cloudflare Workers 預設域名而非自訂域名

**診斷方法**：
```bash
# 檢查生產環境的 Supabase URL
curl -s "https://quote24.cc/_next/static/chunks/app/%5Blocale%5D/login/page-*.js" | grep -o '[a-z]*\.supabase\.co'
```

**解決方案**：
1. 到 GitHub Repository > Settings > Secrets and variables > Actions
2. 確認 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 指向正確的 Supabase 專案
3. 重新觸發部署

#### 2. `NEXT_PUBLIC_*` 環境變數未在 build 時設定

**重要**：`NEXT_PUBLIC_*` 變數是在 **build time** 嵌入 JavaScript 的，不是 runtime！

**症狀**：
- 生產環境的 JavaScript 包含 `localhost:3333` 或其他本地 URL

**診斷方法**：
```bash
# 檢查生產環境的 redirect URL
curl -s "https://quote24.cc/_next/static/chunks/app/%5Blocale%5D/login/page-*.js" | grep -o 'redirectTo[^}]*'
```

**解決方案**：
確保 `.github/workflows/cloudflare-deploy.yml` 包含所有必要的環境變數：
```yaml
- name: Build application
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
    NEXT_PUBLIC_APP_URL: https://quote24.cc
  run: pnpm run build
```

#### 3. Supabase Dashboard 設定不正確

**必須確認**：
1. **Site URL**：設為 `https://quote24.cc`
2. **Redirect URLs**：加入 `https://quote24.cc/**`（使用 wildcard）

### 排查流程

```
1. 檢查 Supabase Dashboard 設定
   ├─ Site URL = https://quote24.cc
   └─ Redirect URLs 包含 https://quote24.cc/**

2. 檢查 GitHub Secrets
   ├─ NEXT_PUBLIC_SUPABASE_URL 指向正確的 Supabase 專案
   └─ NEXT_PUBLIC_SUPABASE_ANON_KEY 對應正確的專案

3. 檢查 GitHub Actions workflow
   └─ Build 步驟包含所有 NEXT_PUBLIC_* 環境變數

4. 驗證部署結果
   └─ 檢查生產環境 JS bundle 中的 Supabase URL 和 redirect URL
```

### 快速驗證命令

```bash
# 1. 取得登入頁面的 JS bundle 檔名
curl -s "https://quote24.cc/zh/login" | grep -o 'login/page-[^"]*\.js'

# 2. 檢查該 JS 中的 Supabase URL（應該是你的專案 ID）
curl -s "https://quote24.cc/_next/static/chunks/app/%5Blocale%5D/login/page-XXX.js" | grep -o '[a-z]*\.supabase\.co'

# 3. 檢查 redirect URL（應該是 https://quote24.cc）
curl -s "https://quote24.cc/_next/static/chunks/app/%5Blocale%5D/login/page-XXX.js" | grep -o 'https://quote24\.cc'
```

### 經驗教訓

1. **本地與生產環境使用不同的 Supabase 專案時要特別注意**
2. **`NEXT_PUBLIC_*` 變數必須在 CI/CD build 時設定，不能只在 runtime**
3. **每次部署後都應該驗證生產環境的 JS bundle 內容**
4. **Supabase 的 Redirect URLs 建議使用 wildcard（`/**`）以支援 query parameters**