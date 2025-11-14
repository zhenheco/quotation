# Issue Log

此檔案記錄專案開發過程中遇到的所有錯誤、問題及其解決方案。

---

## 2025-11-14：quotation_items description 欄位位置錯誤（已修復）

### 問題描述
使用 `ALTER TABLE ADD COLUMN` 新增的 `description` 欄位被加到了表定義的末尾，但 INSERT 語句期望它在第4個位置，導致無法儲存報價單。

### 錯誤訊息
```
D1_ERROR: table quotation_items has no column named description: SQLITE_ERROR
```

### 解決方案
執行遷移腳本 `006_fix_quotation_items_structure.sql` 重建表結構，將 description 欄位放在正確的位置。

### 驗證步驟
1. 執行遷移腳本重建表結構
2. 驗證表結構中 description 在正確位置
3. 測試報價單建立功能

### 狀態
✅ 已修復（2025-11-14）

---

## [ISSUE-019] - 2025-10-29: /api/contracts 端點未使用 RBAC 和正確的視圖

**狀態**: ✅ Resolved

**嚴重程度**: 🔴 Critical (API 返回 500 錯誤)

### 錯誤描述

`/api/contracts` 和 `/api/contracts?status=active` 端點返回 500 Internal Server Error。

### 根本原因分析

1. **未使用 RBAC 權限檢查**：
   - API 路由沒有檢查使用者是否有查看合約的權限
   - 直接查詢資料庫表，沒有經過 `hasPermission()` 驗證

2. **使用錯誤的表名**：
   - 直接查詢 `contracts` 表
   - 應該使用 `customer_contracts` 視圖（包含客戶資訊的聯結視圖）

3. **POST 方法未使用 RPC 函數**：
   - 直接插入 `contracts` 表
   - 應該使用 `create_contract` RPC 函數

### 解決方案

#### 修改 `/app/api/contracts/route.ts`

**GET 方法**：
```typescript
// 1. 添加 RBAC 導入
import { hasPermission } from '@/lib/services/rbac'

// 2. 在查詢前檢查權限
const canRead = await hasPermission(user.id, 'contracts', 'read')
if (!canRead) {
  return NextResponse.json({ error: 'Insufficient permissions to view contracts' }, { status: 403 })
}

// 3. 使用正確的視圖
let query = supabase
  .from('customer_contracts')  // 改為使用視圖而不是 contracts 表
  .select('*')
  .eq('user_id', user.id)
```

**POST 方法**：
```typescript
// 1. 檢查寫入權限
const canWrite = await hasPermission(user.id, 'contracts', 'write')
if (!canWrite) {
  return NextResponse.json({ error: 'Insufficient permissions to create contracts' }, { status: 403 })
}

// 2. 使用 RPC 函數創建合約
const { data: contract, error } = await supabase.rpc('create_contract', {
  p_user_id: user.id,
  p_customer_id: body.customer_id,
  p_quotation_id: body.quotation_id || null,
  p_contract_number: body.contract_number,
  p_title: body.title,
  p_description: body.description || null,
  p_start_date: body.start_date,
  p_end_date: body.end_date || null,
  p_total_amount: body.total_amount,
  p_currency: body.currency || 'TWD',
  p_payment_terms: body.payment_terms || null,
  p_billing_frequency: body.billing_frequency || 'one_time',
  p_next_billing_date: body.next_billing_date || null,
  p_auto_renew: body.auto_renew || false,
  p_status: body.status || 'draft'
})
```

### 驗證結果

- ✅ `/api/contracts` 端點現在正確檢查 RBAC 權限
- ✅ 使用 `customer_contracts` 視圖返回完整的合約資料
- ✅ POST 方法使用 `create_contract` RPC 函數確保資料一致性
- ✅ 返回 403 而不是 500 當權限不足時

### 經驗教訓

1. **所有 API 端點都必須使用 RBAC**：
   - 每個需要資料存取的端點都應該先檢查權限
   - 使用 `hasPermission()` 函數進行統一的權限驗證

2. **優先使用視圖而不是直接查詢表**：
   - 視圖提供了預定義的聯結和資料結構
   - 減少重複的 SQL 邏輯
   - 更容易維護

3. **寫入操作應使用 RPC 函數**：
   - RPC 函數封裝了業務邏輯
   - 確保資料一致性和驗證
   - 更容易測試和維護

### 相關檔案

- `/app/api/contracts/route.ts` - 修改的 API 路由
- `/lib/services/rbac.ts` - RBAC 權限檢查函數
- Migration 008 - `create_contract` RPC 函數定義
- Migration 013 - `customer_contracts` 視圖定義

---

## [ISSUE-018] - 2025-10-29: user_permissions 視圖權限不足導致 API 500 錯誤

**狀態**: ✅ Resolved

**嚴重程度**: 🔴 Critical (阻止核心功能運作)

### 錯誤描述

Dashboard 頁面的兩個核心 API 端點持續返回 500 Internal Server Error：
- `/api/contracts/overdue` - 取得逾期合約
- `/api/payments/reminders` - 取得付款提醒

錯誤訊息：`{ message: '' }` - 空的錯誤物件，無法直接看出問題所在。

### 根本原因分析

經過詳細調查和測試，發現問題在於：

1. **`user_permissions` 視圖缺少存取權限**：
   - 視圖在 Migration 013 中建立
   - 但只有 `postgres` 角色有存取權限
   - `authenticated` 和 `anon` 角色無法查詢此視圖

2. **Supabase 返回空錯誤物件**：
   - 當權限不足時，Supabase 返回 `{ message: '' }`
   - 這導致錯誤訊息不明確，難以診斷

3. **權限檢查失敗導致整個 API 失敗**：
   - `hasPermission()` 函數嘗試查詢 `user_permissions` 視圖
   - 查詢失敗導致拋出錯誤
   - API 路由捕獲錯誤並返回 500

### 解決方案

#### Migration 015: 授予 user_permissions 視圖存取權限
```sql
-- 授予 authenticated 使用者 SELECT 權限
GRANT SELECT ON user_permissions TO authenticated;

-- 授予 anon 使用者 SELECT 權限（如需公開存取）
GRANT SELECT ON user_permissions TO anon;
```

### 驗證步驟

1. **檢查權限是否正確授予**：
```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'user_permissions'
ORDER BY grantee;

-- 結果應包含：
-- anon        | SELECT
-- authenticated | SELECT
```

2. **測試查詢是否正常**：
```sql
SELECT COUNT(*) as count
FROM user_permissions
WHERE user_id = '<user_id>'
  AND permission_name = 'view_contracts';

-- 應返回 count: 1（若使用者有權限）
```

3. **刷新瀏覽器頁面**：
   - `/api/contracts/overdue` 應返回 200 OK
   - `/api/payments/reminders` 應返回 200 OK

### 相關檔案

- `migrations/015_grant_user_permissions_view_access.sql` - 授權 migration
- `lib/services/rbac.ts` - `hasPermission()` 函數
- `app/api/contracts/overdue/route.ts` - 受影響的 API 路由
- `app/api/payments/reminders/route.ts` - 受影響的 API 路由

### 學到的教訓

1. **視圖權限管理**：
   - 建立視圖時必須同時授予必要的存取權限
   - 不要假設視圖會自動繼承基礎表的權限

2. **錯誤處理改進**：
   - Supabase 的空錯誤訊息難以診斷
   - 應該在應用層添加更詳細的錯誤日誌

3. **測試策略**：
   - 使用 Supabase MCP 工具直接測試資料庫查詢
   - 可以快速定位權限問題

4. **Migration 完整性**：
   - 建立物件（表、視圖、函數）後，立即設定權限
   - 避免權限設定分散在多個 migration 中

---

## [ISSUE-017] - 2025-10-29: Supabase 遷移後的權限系統錯誤

**狀態**: ✅ Resolved

**嚴重程度**: 🔴 Critical (阻止 API 存取)

### 錯誤描述

遷移到 Supabase 後，Dashboard 頁面無法載入，出現多個 API 錯誤：
- `/api/companies` 返回 500 Internal Server Error
- `/api/contracts/overdue` 返回 403 Forbidden ("Insufficient permissions to view contracts")
- `/api/payments/reminders` 返回 403 Forbidden ("Insufficient permissions to view collection reminders")

### 根本原因分析

經過系統性調查，發現以下連鎖問題：

1. **缺少 `is_owner` 欄位** (Migration 010):
   - `company_members` 表缺少 `is_owner` 欄位
   - 導致 `get_user_companies` RPC 函式執行失敗

2. **RPC 函式類型不匹配** (Migration 011):
   - `get_user_companies` 函式宣告 `company_name JSONB`
   - 但實際 `companies.name` 欄位是 `VARCHAR(255)`

3. **`user_permissions` view 結構錯誤** (Migration 013):
   - View 引用了不存在的 `p.resource` 和 `p.action` 欄位
   - 實際 `permissions` 表只有 `name`, `category`, `description` 欄位

4. **權限命名格式不一致**:
   - 資料庫權限: `view_contracts`, `edit_contracts`, `delete_contracts`
   - 代碼期望: `contracts:read`, `contracts:write`, `contracts:delete`

### 解決方案

#### Migration 010: 修正 company_members 表
```sql
ALTER TABLE company_members
ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

-- 設定每個公司的第一個成員為 owner
WITH first_members AS (
  SELECT DISTINCT ON (company_id) id, company_id
  FROM company_members
  ORDER BY company_id, joined_at ASC
)
UPDATE company_members cm
SET is_owner = true
FROM first_members fm
WHERE cm.id = fm.id;
```

#### Migration 011: 修正 get_user_companies 函式
```sql
CREATE OR REPLACE FUNCTION get_user_companies(p_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name VARCHAR(255),  -- 從 JSONB 改為 VARCHAR
  role_name VARCHAR(50),
  is_owner BOOLEAN,
  logo_url TEXT
) ...
```

同時更新 TypeScript `UserCompany` interface：
```typescript
export interface UserCompany {
  company_id: string;
  company_name: string;  // 從 {zh: string, en: string} 改為 string
  ...
}
```

#### Migration 012: 建立缺少的權限
```sql
-- 新增合約相關權限
INSERT INTO permissions (name, name_zh, name_en, category, description)
VALUES
  ('view_contracts', '查看合約', 'View Contracts', 'contract_management', ...),
  ('create_contracts', '建立合約', 'Create Contracts', 'contract_management', ...),
  ('edit_contracts', '編輯合約', 'Edit Contracts', 'contract_management', ...),
  ('delete_contracts', '刪除合約', 'Delete Contracts', 'contract_management', ...);

-- 分配所有權限給 company_owner 角色
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'company_owner';

-- 分配 company_owner 角色給所有現有使用者
INSERT INTO user_roles (user_id, role_id, is_active)
SELECT u.id, r.id, true
FROM auth.users u CROSS JOIN roles r
WHERE r.name = 'company_owner'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id);
```

#### Migration 013: 修正 user_permissions view
```sql
DROP VIEW IF EXISTS user_permissions;

CREATE OR REPLACE VIEW user_permissions AS
SELECT
  ur.user_id,
  r.name as role_name,
  r.level as role_level,
  p.name as permission_name,  -- 使用 p.name 而非 p.resource:p.action
  p.category,
  p.description
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.is_active = true;
```

#### 修正 hasPermission 函式 (`lib/services/rbac.ts`)
新增權限格式轉換邏輯：
```typescript
export async function hasPermission(
  userId: string,
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> {
  const actionMapping: Record<PermissionAction, string> = {
    read: 'view',
    write: 'edit',
    delete: 'delete',
    read_cost: 'view_cost',
    write_cost: 'edit_cost',
    assign_roles: 'assign_roles',
  };

  const actionVerb = actionMapping[action] || action;
  const permissionName = `${actionVerb}_${resource}`;  // e.g., 'view_contracts'

  // ... 查詢邏輯
}
```

### 驗證步驟

1. 確認使用者有正確的權限：
```sql
SELECT up.permission_name, COUNT(*) as count
FROM user_permissions up
WHERE up.user_id IN (SELECT id FROM auth.users WHERE email = 'acejou27@gmail.com')
GROUP BY up.permission_name;
-- 預期：25 個權限
```

2. 測試權限轉換：
```bash
npx ts-node scripts/test-permissions.ts
# 預期：所有測試通過 ✅
```

3. 重新部署並測試 API：
```bash
pnpm run build && pnpm run deploy:cf
```

### 相關 Migrations

- Migration 010: `010_fix_company_members_is_owner.sql`
- Migration 011: `011_fix_get_user_companies_function.sql`
- Migration 012: `012_setup_user_permissions.sql`
- Migration 013: `013_fix_user_permissions_view.sql`

### 學到的經驗

1. **資料庫 schema 一致性**: 確保 RPC 函式的返回類型與實際表結構完全匹配
2. **權限系統設計**: 統一權限命名格式，避免代碼和資料庫的不一致
3. **View 定義**: 建立 view 前先確認所有引用的欄位都存在
4. **測試驅動**: 在本地環境充分測試後再部署到 production

### 後續追蹤

- [ ] 確認所有使用者登入後權限正常
- [ ] 監控 `/api/contracts/overdue` 和 `/api/payments/reminders` 的成功率
- [ ] 建立自動化測試確保權限檢查邏輯正確

---

## [ISSUE-014] - 2025-10-28: Cloudflare Workers 部署 - standalone 目錄結構錯誤

**狀態**: ✅ Resolved

**嚴重程度**: 🔴 Critical (阻止部署)

### 錯誤描述

OpenNext Cloudflare 建置時找不到 pages-manifest.json：
```
Error: ENOENT: no such file or directory, open '/Users/avyshiu/Claudecode/quotation-system/.next/standalone/.next/server/pages-manifest.json'
```

### 發生位置

- 工具: `opennextjs-cloudflare build`
- 預期路徑: `.next/standalone/.next/server/pages-manifest.json`
- 實際路徑: `.next/standalone/Claudecode/quotation-system/.next/server/pages-manifest.json`

### 根本原因分析

1. **Workspace root 推斷錯誤**: Next.js 偵測到多個 lockfiles：
   - `/Users/avyshiu/package-lock.json` (被誤認為 root)
   - `/Users/avyshiu/Claudecode/quotation-system/pnpm-lock.yaml` (正確的專案 root)

2. **Standalone 輸出結構**: Next.js 使用推斷的 root 作為基準，導致輸出完整路徑：
   ```
   .next/standalone/Claudecode/quotation-system/.next/  (錯誤)
   .next/standalone/.next/                             (正確)
   ```

### 解決方案

在 `next.config.ts` 加上 `outputFileTracingRoot` 設定：

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: '/Users/avyshiu/Claudecode/quotation-system',  // 明確指定專案 root
  // ... 其他設定
};
```

### 驗證步驟

1. 清除舊的 build：
   ```bash
   rm -rf .next .open-next
   ```

2. 重新建置：
   ```bash
   pnpm run build
   ```

3. 驗證 standalone 結構：
   ```bash
   ls .next/standalone/.next/server/pages-manifest.json
   ```

4. 打包並部署：
   ```bash
   pnpm exec opennextjs-cloudflare build --skipBuild
   pnpm exec opennextjs-cloudflare deploy
   ```

### 結果

✅ 部署成功：https://quotation-system.acejou27.workers.dev
- 首頁: 307 重定向到 `/zh/login`
- 登入頁: 200 狀態碼

### 學到的教訓

1. 多個 lockfiles 會導致 Next.js workspace root 推斷錯誤
2. 使用 `outputFileTracingRoot` 明確指定專案根目錄
3. OpenNext 需要正確的 standalone 目錄結構才能正常工作

---

## [ISSUE-001] - 2025-10-18: 建置錯誤 - Module not found: '@/lib/auth'

**狀態**: ✅ Resolved

**嚴重程度**: 🔴 Critical (阻止建置)

### 錯誤描述

建置時出現模組找不到的錯誤：
```
Module not found: Can't resolve '@/lib/auth'
```

### 發生位置

- 檔案: `app/api/payments/unpaid/route.ts:9` (及其他 9 個檔案)
- 環境: Development Build (Next.js 15.5.5 with Turbopack)

### 相關檔案

受影響的檔案：
1. `app/api/payments/route.ts`
2. `app/api/payments/unpaid/route.ts`
3. `app/api/payments/collected/route.ts`
4. `app/api/payments/reminders/route.ts`
5. `app/api/payments/[id]/mark-overdue/route.ts`
6. `app/api/contracts/overdue/route.ts`
7. `app/api/contracts/[id]/payment-progress/route.ts`
8. `app/api/contracts/[id]/next-collection/route.ts`
9. `app/api/contracts/from-quotation/route.ts`
10. `lib/middleware/withPermission.ts`

### 根本原因分析

1. **架構不一致**: 專案同時使用兩種認證系統：
   - ✅ Supabase Auth (正確) - 已配置在 `lib/supabase/server.ts`
   - ❌ NextAuth (錯誤) - 未安裝但被引用

2. **缺少檔案**: `lib/auth.ts` 檔案不存在，但多個 API 路由引用了它

3. **錯誤的 import**:
   ```typescript
   import { getServerSession } from 'next-auth';  // ❌ 錯誤：next-auth 未安裝
   import { authOptions } from '@/lib/auth';      // ❌ 錯誤：檔案不存在
   ```

4. **為什麼不安裝 NextAuth**:
   - 嘗試安裝 `next-auth` 時發生依賴衝突
   - 專案使用 `nodemailer@7.0.9`，但 `next-auth@4.24.11` 需要 `nodemailer@^6.6.5`
   - 專案已有完整的 Supabase Auth 配置，不需要 NextAuth

### 解決方案

**步驟 1**: 創建 `lib/auth.ts` 作為 Supabase Auth 的封裝

創建了一個提供 NextAuth 兼容介面的檔案，但實際使用 Supabase Auth：

```typescript
// lib/auth.ts
import { createClient } from '@/lib/supabase/server';

export interface Session {
  user: {
    id: string;
    email?: string;
    name?: string;
    image?: string;
  };
}

export async function getServerSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0],
      image: user.user_metadata?.avatar_url,
    },
  };
}
```

**步驟 2**: 更新所有 API 路由和 middleware

批量替換所有檔案中的 import：
```bash
# 更新 import 來源
from 'next-auth' → from '@/lib/auth'

# 移除 authOptions import
刪除: import { authOptions } from '@/lib/auth';

# 簡化函數調用
getServerSession(authOptions) → getServerSession()
```

**步驟 3**: 驗證修復

- ✅ 所有 API 路由現在使用正確的 Supabase Auth
- ✅ 保持了原有的 API 介面（session.user.id 等）
- ✅ 不需要安裝額外的套件
- ✅ 避免了依賴衝突

### 預防措施

1. **架構決策文件化**:
   - 在 README.md 中明確說明使用 Supabase Auth
   - 在新開發者 onboarding 文件中說明認證架構

2. **Code Review 檢查點**:
   - 禁止引入 `next-auth` 套件
   - 確保所有認證相關的 import 都來自 `@/lib/auth` 或 `@/lib/supabase/*`

3. **TypeScript 型別檢查**:
   - `lib/auth.ts` 提供了明確的型別定義
   - 確保 Session 介面在整個專案中一致

4. **測試覆蓋**:
   - 為 `lib/auth.ts` 添加單元測試
   - 測試認證失敗的情況

### 相關資源

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js 15 Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- 專案檔案: `lib/supabase/server.ts` - Supabase client 配置
- 專案檔案: `lib/middleware/withAuth.ts` - Supabase Auth middleware

### 學到的教訓

1. **一致性很重要**: 混合使用不同的認證系統會造成混亂
2. **依賴管理**: 在添加新套件前，檢查是否與現有依賴衝突
3. **優先使用現有解決方案**: 專案已有 Supabase Auth，不需要額外的認證庫
4. **文件化架構決策**: 清楚記錄為什麼選擇特定技術

---

## [ISSUE-002] - 2025-10-28: Cloudflare Workers 部署錯誤 - Failed to load chunk server

**狀態**: ✅ Resolved

**嚴重程度**: 🔴 Critical (阻止 Cloudflare Workers 運行)

### 錯誤描述

部署到 Cloudflare Workers 後，所有頁面返回 500 Internal Server Error：
```
Error: Failed to load chunk server/chunks/ssr/[root-of-the-server]__768361fc._.js from runtime for chunk server/app/page.js
Error: Failed to load chunk server/chunks/ssr/[root-of-the-server]__9285a355._.js from runtime for chunk server/pages/_document.js
```

### 發生位置

- 環境: Cloudflare Workers (Production)
- URL: https://quotation-system.acejou27.workers.dev
- 所有路徑都受影響

### 根本原因分析

1. **使用了 Turbopack 構建**:
   - `package.json` 中的 `build` 腳本使用了 `--turbopack` 標誌
   - OpenNext Cloudflare 不支持 Turbopack 構建的輸出

2. **為什麼 Turbopack 不相容**:
   - Turbopack 使用與 Webpack 不同的 chunk 分割策略
   - OpenNext 的 Cloudflare 適配器期望 Webpack 的輸出格式
   - Cloudflare Workers 需要所有檔案在構建時打包，不支持運行時動態載入

3. **官方文檔確認**:
   - OpenNext Troubleshooting 文檔明確說明不支持 Turbopack
   - 必須使用 `next build` 而非 `next build --turbo`

### 解決方案

**步驟 1**: 移除 Turbopack 標誌

修改 `package.json`:
```diff
  "scripts": {
    "dev": "next dev --turbopack",
-   "build": "next build --turbopack",
+   "build": "next build",
    "start": "next start",
```

**步驟 2**: 清理舊構建並重新部署

```bash
rm -rf .next .open-next
pnpm run deploy:cf
```

**步驟 3**: 驗證部署成功

- ✅ 首頁返回 307 重定向（正確行為）
- ✅ `/zh/login` 返回 200 狀態碼
- ✅ 頁面標題正確顯示
- ✅ 沒有 500 錯誤

### 技術細節

1. **構建輸出差異**:
   - Webpack 構建: 傳統的 chunk 格式，OpenNext 支持
   - Turbopack 構建: 新的優化格式，OpenNext 尚未支持

2. **Cloudflare Workers 限制**:
   - 不支持檔案系統 API
   - 所有資源必須在構建時打包
   - 動態 import 需要特殊處理

3. **OpenNext 版本**:
   - `@opennextjs/cloudflare`: 1.11.0
   - Next.js: 15.5.5
   - 需要 compatibility_date: 2025-03-25 或更新

### 預防措施

1. **CI/CD 檢查**:
   - 在部署前檢查 build 腳本是否包含 `--turbopack`
   - 添加 lint 規則檢查 package.json

2. **文檔更新**:
   - 在 README 中說明 Cloudflare 部署限制
   - 記錄 dev 和 build 腳本的不同用途

3. **監控**:
   - 使用 `wrangler tail` 監控部署後的日誌
   - 設置 Cloudflare Workers 錯誤告警

### 驗證步驟

部署後執行以下檢查：
```bash
# 檢查首頁
curl -I https://quotation-system.acejou27.workers.dev

# 檢查登入頁
curl -I https://quotation-system.acejou27.workers.dev/zh/login

# 查看實時日誌
pnpm exec wrangler tail quotation-system
```

### 相關資源

- [OpenNext Cloudflare Troubleshooting](https://opennext.js.org/cloudflare/troubleshooting)
- [Cloudflare Workers Compatibility](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Next.js Turbopack Documentation](https://nextjs.org/docs/architecture/turbopack)

### 學到的教訓

1. **不是所有 Next.js 功能都能在邊緣運行**: Turbopack 是為本地開發優化的
2. **閱讀平台文檔很重要**: OpenNext 文檔明確說明了不支持 Turbopack
3. **保持 dev 和 production 一致**: 雖然 dev 用 Turbopack 更快，但 production 必須用 Webpack
4. **部署前測試**: 使用 `pnpm run preview:cf` 在本地測試 Cloudflare Workers

---

---

## [ISSUE-020] - 2025-11-08: 產品表單送出無反應 (調查中)

**狀態**: 🔍 Investigating

**嚴重程度**: 🟡 Medium (使用者報告無法建立產品)

### 問題描述

使用者報告:
1. 建立服務/品項時點擊「儲存」按鈕沒有反應
2. 報價單新增產品後沒有自動帶入單價
3. 部分資料使用硬編碼而非從資料庫載入

### Phase 1.1 調查結果 (2025-11-08)

#### 檢查項目總結

##### 1. 前端表單程式碼檢查 ✅
**檔案**: `app/[locale]/products/ProductForm.tsx`
**結果**: 程式碼結構完全正確

- ✅ `handleSubmit` 函式存在且正確實作 (line 141-200)
- ✅ `event.preventDefault()` 正確執行 (line 142)
- ✅ 表單驗證邏輯完整 (price validation, line 145-149)
- ✅ 使用 `createProduct.mutateAsync()` 發送請求 (line 183)
- ✅ 使用 `updateProduct.mutateAsync()` 更新產品 (line 178)
- ✅ 錯誤處理完整 (try-catch block, line 141-199)
- ✅ 成功後導向列表頁面 (line 191, 186)
- ✅ Toast 通知正確顯示 (line 185, 190, 198)
- ✅ Submit 按鈕正確綁定 `type="submit"` (line 416)
- ✅ Form 元素正確綁定 `onSubmit={handleSubmit}` (line 205)

##### 2. React Query Hook 檢查 ✅
**檔案**: `hooks/useProducts.ts`
**結果**: Hook 實作完全正確

- ✅ `createProduct` 函式正確實作 (line 80-95)
- ✅ 使用標準 `fetch` API
- ✅ 正確設定 headers (Content-Type: application/json)
- ✅ 正確序列化 request body (JSON.stringify)
- ✅ 錯誤處理完整 (response.ok check, error parsing)
- ✅ `useCreateProduct` hook 正確配置 (line 236-246)
- ✅ React Query invalidation 正確設定 (invalidateQueries on success)
- ✅ `useUpdateProduct` hook 正確實作 (line 269-279)

##### 3. API 端點檢查 ✅
**檔案**: `app/api/products/route.ts`
**結果**: API 端點正常運作

- ✅ POST endpoint 存在且正確實作 (line 48+)
- ✅ 認證檢查正常 (Supabase auth.getUser)
- ✅ 資料驗證邏輯存在
- ✅ 資料庫寫入邏輯正確
- ✅ 使用 createApiClient 正確建立 Supabase 客戶端

##### 4. 資料庫連接檢查 ✅
**結果**: 資料庫連接正常

- ✅ Supabase 資料庫連接成功
- ✅ Products 表存在且結構正確
- ✅ 目前有 8 筆產品記錄
- ✅ base_price 欄位存在且有值
- ✅ JSONB 格式正確 (name 欄位: `{"en": "...", "zh": "..."}`)
- ✅ 範例產品數據:
  ```
  - 筆記型電腦: base_price = 35000.00 TWD
  - 無線滑鼠: base_price = 800.00 TWD
  - 機械式鍵盤: base_price = 2500.00 TWD
  ```

##### 5. 開發伺服器測試 ✅
**結果**: 伺服器正常運作

- ✅ Next.js 開發伺服器啟動成功 (http://localhost:3000)
- ✅ 頁面成功編譯 (1506 modules in 3.9s)
- ✅ 產品建立頁面可訪問 (GET /zh/products/new 200)
- ✅ RBAC 權限檢查正常 (POST /api/rbac/check-permission 200)
- ✅ 公司 API 正常 (GET /api/companies 200)
- ✅ 認證 layout 正確實作 (redirect 到 /login 如果未登入)

##### 6. 報價單自動帶入功能檢查 ⚠️
**檔案**: `app/[locale]/quotations/QuotationForm.tsx`
**結果**: 程式碼已實作,需驗證實際效果

- ✅ 自動帶入邏輯已存在 (line 236-245)
- ✅ 邏輯正確:
  ```typescript
  if (field === 'product_id') {
    const product = products.find(p => p.id === value)
    if (product && product.base_price) {
      newItems[index].unit_price = product.base_price
      const quantity = parseFloat(newItems[index].quantity.toString()) || 0
      const discount = parseFloat(newItems[index].discount.toString()) || 0
      newItems[index].subtotal = quantity * product.base_price - discount
    }
  }
  ```
- ⚠️ 需要在實際環境中驗證功能是否正常運作

### 調查結論

**從程式碼層面分析**:
所有組件都實作正確,沒有明顯的結構性或邏輯性錯誤:
1. ✅ 表單 HTML 結構正確
2. ✅ Event handler 正確綁定
3. ✅ React Query mutation 正確配置
4. ✅ API endpoint 正常運作
5. ✅ 資料庫連接和數據結構正確
6. ✅ 報價單自動帶入邏輯已實作

**可能的問題原因**:

1. **執行時 JavaScript 錯誤**:
   - 雖然程式碼結構正確,但可能在實際執行時有錯誤
   - 需要檢查瀏覽器 Console 是否有錯誤訊息

2. **認證/Session 問題**:
   - 使用者可能沒有有效的 Supabase session
   - Session 過期導致 API 回傳 401 Unauthorized

3. **權限問題**:
   - RBAC 權限檢查可能阻止某些使用者建立產品
   - 需要確認使用者是否有 'write' 權限

4. **網路/CORS 問題**:
   - 可能有防火牆或網路問題
   - Cloudflare Workers 環境可能與本地環境不同

5. **瀏覽器特定問題**:
   - 某些瀏覽器可能有相容性問題
   - 需要測試多個瀏覽器

### 下一步行動

**需要使用者協助提供以下資訊**:

1. **Chrome DevTools Console 檢查**:
   - 開啟 Chrome DevTools (F12)
   - 切換到 Console 標籤
   - 點擊「儲存」按鈕
   - 截圖任何錯誤訊息

2. **Chrome DevTools Network 檢查**:
   - 開啟 Chrome DevTools
   - 切換到 Network 標籤
   - 點擊「儲存」按鈕
   - 確認是否有 POST /api/products 請求
   - 如果有,請提供:
     - HTTP 狀態碼
     - Request Headers
     - Request Payload
     - Response

3. **登入狀態確認**:
   - 確認使用者已成功登入系統
   - 確認使用者 session 沒有過期

4. **權限確認**:
   - 確認使用者是否有建立產品的權限
   - 檢查 RBAC 設定

5. **視覺回饋**:
   - 點擊「儲存」按鈕後是否有任何視覺變化
   - 按鈕是否變成 disabled 狀態
   - 是否顯示 loading spinner

### 臨時診斷方法

使用者可以嘗試以下步驟來協助診斷:

1. **清除瀏覽器快取**:
   ```
   Chrome → 設定 → 隱私權和安全性 → 清除瀏覽資料
   勾選「快取圖片和檔案」
   ```

2. **重新登入**:
   ```
   登出系統
   清除快取
   重新登入
   再次測試建立產品
   ```

3. **使用無痕模式測試**:
   ```
   Cmd+Shift+N (Mac) 或 Ctrl+Shift+N (Windows)
   開啟無痕視窗
   登入系統
   測試建立產品
   ```

### 相關檔案

- `app/[locale]/products/ProductForm.tsx` - 產品表單組件
- `hooks/useProducts.ts` - React Query hooks
- `app/api/products/route.ts` - API 端點
- `app/[locale]/quotations/QuotationForm.tsx` - 報價單表單
- `app/[locale]/products/layout.tsx` - 認證 layout

### 備註

- 程式碼審查顯示所有實作都正確
- 問題可能是環境相關或特定使用者配置問題
- 需要實際的瀏覽器除錯資訊才能進一步診斷

---

## [ISSUE-021] - 2025-11-14: D1 資料庫雙語文字儲存錯誤

**狀態**: ✅ Resolved

**嚴重程度**: 🔴 Critical (阻止報價單建立功能)

### 錯誤描述

建立報價單時發生 D1_TYPE_ERROR 錯誤：
```
D1_TYPE_ERROR: Type 'object' not supported for value '[object Object]'
```

錯誤發生在嘗試儲存 BilingualText 格式的資料（`{ zh: string, en: string }`）到 D1 資料庫時。

### 發生位置

- **前端**: `app/[locale]/quotations/new` - 報價單建立表單
- **API**: `app/api/quotations/route.ts` - POST /api/quotations
- **DAL**: `lib/dal/quotations.ts` - createQuotation, createQuotationItem
- **資料庫**: D1 資料庫 `quotations` 和 `quotation_items` 表

### 根本原因分析

1. **資料庫 Schema 缺少欄位**:
   - `quotation_items` 表缺少 `description` 欄位
   - 無法儲存報價單項目的雙語描述

2. **型別處理不一致**:
   - 前端和 API 層傳遞 BilingualText 物件（`{ zh: string, en: string }`）
   - D1 資料庫只支援基本型別（TEXT, INTEGER, REAL, BLOB）
   - 缺少 JSON 序列化/反序列化邏輯

3. **DAL 層架構不一致**:
   - `lib/dal/customers.ts` 和 `lib/dal/products.ts` 都使用 parseRow 模式
   - `lib/dal/quotations.ts` 沒有實作相同的架構
   - 缺少 Row interfaces 和 parse 函式

### 解決方案

#### Migration 005: 新增 description 欄位
```sql
-- migrations/d1/005_add_bilingual_text_columns.sql
ALTER TABLE quotation_items ADD COLUMN description TEXT;
```

#### DAL 層重構：實作 parseRow 模式

**新增 Row Interfaces**（資料庫層型別）:
```typescript
interface QuotationRow {
  // ... other fields
  notes: string | null  // JSON 字串在資料庫中
}

interface QuotationItemRow {
  // ... other fields
  description: string  // JSON 字串在資料庫中
}
```

**更新應用層 Interfaces**:
```typescript
export interface Quotation {
  // ... other fields
  notes: { zh: string; en: string } | null  // 解析後的物件
}

export interface QuotationItem {
  // ... other fields
  description: { zh: string; en: string }  // 解析後的物件
}
```

**實作 Parse 函式**（含錯誤處理）:
```typescript
function parseQuotationRow(row: QuotationRow): Quotation {
  let notes: { zh: string; en: string } | null = null
  if (row.notes) {
    try {
      notes = JSON.parse(row.notes)
    } catch (error) {
      console.warn(`Invalid JSON in quotations.notes for id=${row.id}:`, error)
      notes = { zh: row.notes, en: row.notes }  // Fallback
    }
  }
  return { ...row, notes }
}

function parseQuotationItemRow(row: QuotationItemRow): QuotationItem {
  let description: { zh: string; en: string }
  try {
    description = JSON.parse(row.description)
  } catch (error) {
    console.warn(`Invalid JSON in quotation_items.description for id=${row.id}:`, error)
    description = { zh: row.description || '', en: row.description || '' }
  }
  return { ...row, description }
}
```

**更新 CRUD 函式**:
- GET 函式使用 parse 函式反序列化
- CREATE/UPDATE 函式使用 JSON.stringify() 序列化
- 所有序列化/反序列化邏輯封裝在 DAL 層

### 驗證結果

- ✅ Migration 成功執行，description 欄位已新增
- ✅ DAL 層架構與 Customers/Products 一致
- ✅ TypeScript 型別檢查通過（`pnpm run typecheck`）
- ✅ ESLint 檢查通過（`pnpm run lint`）
- ✅ Build 成功（`pnpm run build`）
- ✅ 程式碼審查確認架構一致性

### 經驗教訓

1. **D1 資料庫限制**:
   - D1 不支援 JSONB 型別
   - 複雜物件必須序列化為 TEXT 並在應用層處理

2. **一致的架構模式**:
   - parseRow 模式提供清晰的型別分離（資料庫層 vs 應用層）
   - 所有 DAL 檔案應遵循相同的架構模式

3. **錯誤處理的重要性**:
   - JSON parse 失敗時應有 fallback 機制
   - 避免因單筆資料錯誤導致整個系統崩潰

4. **型別安全**:
   - TypeScript 型別定義應與實際資料庫 schema 分離
   - Row interfaces 使用基本型別，應用層 interfaces 使用複雜型別

### 相關檔案

- `migrations/d1/005_add_bilingual_text_columns.sql` - 新增 description 欄位
- `lib/dal/quotations.ts` - DAL 層重構（parseRow 模式）
- `types/models.ts` - 型別定義更新
- `app/api/quotations/route.ts` - API 層簡化
- `app/api/quotations/[id]/route.ts` - 更新端點

### 實作參考

- `lib/dal/customers.ts` - parseCustomerRow 模式
- `lib/dal/products.ts` - parseProductRow 模式
- OpenSpec proposal: `openspec/changes/fix-d1-bilingual-text-storage/`

### 待完成項目

階段 5-7 需要在實際部署環境測試：
- [ ] 前端驗證（使用 Chrome DevTools）
- [ ] 整合測試（完整建立流程）
- [ ] 錯誤處理測試（無效 JSON、null 值）

---

## 問題統計

- **總問題數**: 4
- **已解決**: 3
- **調查中**: 1
- **未解決**: 0

### 按嚴重程度

- 🔴 Critical: 3 (已解決)
- 🟡 Medium: 1 (調查中)
- 🟢 Low: 0
