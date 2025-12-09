# Development Log

## 2025-12-09: 🚨 嚴重錯誤 - owner_id 外鍵設計錯誤導致生產環境無法新增報價單

### 問題嚴重性：🔴 Critical
**影響範圍**：所有用戶無法新增報價單，直接影響業務運營

### 錯誤時間線
1. Migration 028 設計時犯了致命錯誤
2. 部署到生產環境後，所有新增報價單操作失敗
3. 錯誤訊息具有誤導性，導致初步診斷方向錯誤

### 錯誤訊息
```
Failed to create quotation: insert or update on table "quotations" violates foreign key constraint "quotations_owner_id_fkey"
```

### 根本原因分析

#### 致命錯誤：外鍵指向錯誤的欄位

```
user_profiles 表結構：
┌─────────────────────────────────────────┐
│ id (主鍵)    │ 自動生成的 UUID           │ ← 錯誤指向這裡
│ user_id      │ 對應 auth.users.id        │ ← 應該指向這裡
└─────────────────────────────────────────┘

這兩個是完全不同的 UUID！
```

| 項目 | 錯誤設計 | 正確設計 |
|-----|---------|---------|
| 外鍵指向 | `user_profiles(id)` | `user_profiles(user_id)` |

#### 為什麼會出錯
1. 設計 migration 時**假設** `user_profiles.id` = `auth.users.id`
2. **沒有驗證** `user_profiles` 的實際表結構
3. **沒有測試** 新增報價單功能

#### 連鎖問題
1. 新用戶註冊後沒有自動創建 `user_profiles` 記錄
2. 即使有 `user_profiles`，外鍵指向錯誤也會失敗

### 修復步驟

#### 1. 為缺失用戶創建 user_profiles
```sql
INSERT INTO user_profiles (user_id, email, full_name)
SELECT au.id, au.email, COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
```

#### 2. 修正外鍵指向
```sql
-- 刪除錯誤的外鍵
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_owner_id_fkey;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_owner_id_fkey;

-- 創建正確的外鍵
ALTER TABLE quotations ADD CONSTRAINT quotations_owner_id_fkey
FOREIGN KEY (owner_id) REFERENCES user_profiles(user_id);

ALTER TABLE customers ADD CONSTRAINT customers_owner_id_fkey
FOREIGN KEY (owner_id) REFERENCES user_profiles(user_id);
```

#### 3. 刷新 Schema Cache
```sql
NOTIFY pgrst, 'reload schema';
```

### 預防措施（必須遵守）

#### 1. Migration 設計檢查清單
- [ ] **查看目標表的完整結構**：`\d table_name` 或查詢 `information_schema.columns`
- [ ] **確認外鍵指向的是正確欄位**：不要假設欄位名稱
- [ ] **檢查 user_profiles 的 id vs user_id**：這是常見陷阱
- [ ] **在開發環境測試完整流程**：不只是 migration 成功，要測試業務功能

#### 2. user_profiles 表的特殊性
```
⚠️ user_profiles 有兩個 UUID 欄位：
- id: 表主鍵（自動生成，與 auth.users.id 無關）
- user_id: 對應 auth.users.id（這才是要用的）

任何引用用戶的外鍵都應該指向 user_profiles(user_id)，不是 user_profiles(id)
```

#### 3. 部署前必須測試
- 新增報價單
- 新增客戶
- 新用戶註冊後的所有操作

### 經驗教訓

1. **永遠不要假設表結構**：一定要先查看實際結構
2. **外鍵設計要特別謹慎**：錯誤的外鍵會導致整個功能失效
3. **測試要覆蓋完整業務流程**：migration 成功不代表功能正常
4. **錯誤訊息可能誤導診斷**：要深入分析根本原因
5. **生產環境問題要快速響應**：這種錯誤直接影響業務

### 相關檔案
- `migrations/028_add_owner_fields.sql` - 已修正外鍵定義

---

## 2025-12-09: Supabase 客戶端環境變數完整修復

### 問題
生產環境 (quote24.cc) 出現錯誤：
```
@supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

### 根本原因（兩個層面）

#### 1. Server-side Runtime 問題
`wrangler.jsonc` 的 `compatibility_date` 設為 `2025-03-25`，早於 `2025-04-01`。
- `nodejs_compat_populate_process_env` 標誌在 `compatibility_date >= 2025-04-01` 時才自動啟用
- 修復：更新 `compatibility_date` 為 `2025-04-01`

#### 2. Client-side Build-time 問題
客戶端代碼的 `NEXT_PUBLIC_*` 是在 **build time** 被 Next.js 編譯器嵌入：
- `wrangler.jsonc` 的 `vars` 是 **runtime** 變數，不影響 build 過程
- Cloudflare Workers Builds 的 build 環境沒有設定這些變數
- 結果：`lib/supabase/client.ts` 編譯時 `process.env.NEXT_PUBLIC_*` 是 `undefined`

### 解決方案

#### Server-side（middleware.ts, server.ts）
```typescript
// 使用環境變數（需 compatibility_date >= 2025-04-01）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
```

#### Client-side（client.ts）
```typescript
// 硬編碼（因為 build-time 無法取得環境變數）
const SUPABASE_URL = 'https://oubsycwrxzkuviakzahi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...'
```

**安全性說明**：
- Anon Key 本來就是公開的（前端 JS 已暴露）
- 資料安全由 Supabase RLS 保護

### 修改的檔案
- `wrangler.jsonc`: `compatibility_date` → `2025-04-01`
- `middleware.ts`: 恢復使用 `process.env`
- `lib/supabase/client.ts`: 硬編碼 URL 和 Key

### 經驗教訓
1. Cloudflare Workers 環境變數有兩種類型：
   - **Runtime vars**（`wrangler.jsonc` vars）：Worker 執行時可用
   - **Build vars**（Dashboard 設定）：build 過程可用
2. `NEXT_PUBLIC_*` 對於 Next.js 客戶端代碼需要在 **build time** 可用
3. 對於客戶端代碼，最可靠的方案是硬編碼公開值

### 參考資料
- [Cloudflare process.env 支援公告](https://developers.cloudflare.com/changelog/2025-03-11-process-env-support/)
- [OpenNext Env Vars 文檔](https://opennext.js.org/cloudflare/howtos/env-vars)
- [Cloudflare Build Configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

---

## 2025-12-09: Cloudflare 部署無限循環修復

### 問題
部署在 Cloudflare 上執行超過 10 分鐘，build 過程陷入無限循環。

### 根本原因
`package.json` 的 build script 設定為：
```json
"build": "next build && pnpm exec opennextjs-cloudflare build"
```

當 `opennextjs-cloudflare build` 執行時，它內部會呼叫 `pnpm run build`，造成無限遞迴：
```
build → next build → opennextjs-cloudflare build → build → ...
```

### 解決方案
使用 `--skipNextBuild` 參數避免遞迴：
```json
"build": "next build && pnpm exec opennextjs-cloudflare build --skipNextBuild"
```

**流程**：
1. `next build` 執行
2. `opennextjs-cloudflare build --skipNextBuild` 執行（跳過內部的 next build 呼叫）
3. 生成 `.open-next` 目錄
4. 無遞迴 ✅

### 支援 Git 整合自動部署
這個修改支援 Cloudflare Workers Git 整合（push 到 GitHub 自動部署）：
- Cloudflare 組建命令：`pnpm run build`
- Cloudflare 部署命令：`npx wrangler deploy`

### 經驗教訓
1. `opennextjs-cloudflare build` 預設會呼叫 `pnpm run build`，會造成遞迴
2. 使用 `--skipNextBuild` 參數可以跳過 OpenNext 內部的 next build 呼叫
3. 參考 [OpenNext CLI 文檔](https://opennext.js.org/cloudflare/cli) 了解更多選項

---

## 2025-12-09: Google OAuth 登入重導向修復

### 問題
用戶反應 Google 登入驗證完成後會跳回登入畫面，無法正常進入系統。

### 根本原因（兩個問題）

#### 問題 1：Cloudflare 部署失敗
```
✘ [ERROR] The entry-point file at ".open-next/worker.js" was not found.
```

切換到 Cloudflare Git 整合後，build command 只執行 `next build`，
缺少 `opennextjs-cloudflare build` 步驟。

#### 問題 2：OAuth redirect URL 錯誤
`NEXT_PUBLIC_APP_URL` 環境變數在 build time 未設定，導致 OAuth redirect URL 指向 `localhost:3333`。

### 解決方案

#### 修復 1：修改 build script
```json
// package.json
"build": "next build && pnpm exec opennextjs-cloudflare build"
```

#### 修復 2：硬編碼 OAuth redirect URL
```typescript
// app/[locale]/login/LoginButton.tsx
const redirectBase = 'https://quote24.cc'
```

### 經驗教訓
1. Cloudflare Git 整合需要完整的 build 流程，包括 opennextjs-cloudflare build
2. wrangler.jsonc 的 `vars` 只對 runtime 有效，不影響 build time
3. 使用硬編碼生產 URL 可避免環境變數問題

### 相關提交
- `2343c33` - fix: 強制使用 quote24.cc 作為 OAuth redirect URL
- `8fa7d0b` - fix: 修改 build script 加入 opennextjs-cloudflare build

---

## 2025-12-08: 程式碼品質改善與部署架構調整

### 一、程式碼品質改善（PR #1）

#### 1.1 清理過時程式碼
- 刪除 `legacy_backup/` 資料夾（100+ 個過時檔案）

#### 1.2 CompanySettings.tsx 修復
- **Image 優化**：將 `unoptimized={true}` 改為 `unoptimized={!!pendingFiles.logo}`，僅對 blob URL 禁用優化
- **useCallback 依賴**：重新排序 `loadCompany` 定義，修正依賴陣列問題

#### 1.3 React Query staleTime 標準化
新增 `STALE_TIME` 常數到 `lib/api/queryClient.ts`：
| 類型 | 時間 | 用途 |
|------|------|------|
| STATIC | 10 分鐘 | 產品、客戶等少變動資料 |
| DYNAMIC | 5 分鐘 | 報價單、付款、合約等 |
| REALTIME | 2 分鐘 | 分析數據、即時統計 |

更新的 hooks：useProducts, useCustomers, useQuotations, usePayments, useContracts, useAnalytics

#### 1.4 統一錯誤處理
新增 `hooks/useApiError.ts`，提供：
- `handleError()` - 錯誤處理（含 toast 通知、console 記錄、認證重導向）
- `handleMutationError()` - React Query mutation 專用
- `getErrorMessage()` - 錯誤訊息提取

---

### 二、部署架構調整：切換至 Cloudflare Git 整合

#### 2.1 移除 GitHub Actions
- 刪除 `.github/workflows/cloudflare-deploy.yml`
- 部署改由 Cloudflare Dashboard Git 整合處理

#### 2.2 更新 wrangler.jsonc
- 加入 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 到 vars
- 加入 `NEXT_PUBLIC_APP_URL` 到 vars
- 自訂網域設定從 `zone_name` 改為 `custom_domain: true`

#### 2.3 設定 Cloudflare Secrets
透過 wrangler secret 設定：
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_POOLER_URL`

#### 2.4 自訂網域
- `quote24.cc` ✅
- `www.quote24.cc` ✅

---

### 三、注意事項

#### wrangler delete 陷阱
當 wrangler.jsonc 有多個環境（如 preview）時，`wrangler delete <worker-name>` 可能刪錯 worker。
**解決方案**：使用 `--name` 參數明確指定，如：
```bash
pnpm exec wrangler delete --name quotation-system-preview --force
```

#### NEXT_PUBLIC_* 環境變數
這些變數在 **build time** 嵌入 JavaScript，不是 runtime。
- 使用 Git 整合部署時，需在 wrangler.jsonc 的 `vars` 中設定
- 或在 Cloudflare Dashboard Build Settings 中設定

---

### 四、相關提交
- `0c4aafc` - 重構：程式碼品質改善
- `425c958` - 切換至 Cloudflare Git 整合部署
- `93e3244` - 修正：自訂網域設定改用 custom_domain
- `5c0c35c` - 移除 preview 環境設定

---

## 2024-12-04: 客戶和商品編號系統

### 問題
- 建立客戶/商品時報錯「編號已存在」
- `customer_number` 和 `product_number` 欄位在程式碼中被引用但資料庫不存在

### 解決方案
仿照報價單編號系統（migration 025）的模式實作：

1. **資料庫遷移** (`migrations/033_customer_product_number_system.sql`)
   - 新增 `customer_number` 和 `product_number` 欄位
   - 複合唯一約束 `(company_id, number)` - 每家公司獨立編號
   - 序列表追蹤每月編號
   - Advisory Lock 防止競爭條件
   - RPC 函數：`generate_customer_number_atomic()`, `generate_product_number_atomic()`

2. **DAL 層修改**
   - `lib/dal/customers.ts`: 新增 `generateCustomerNumber()`, `createCustomerWithRetry()`
   - `lib/dal/products.ts`: 新增 `generateProductNumber()`, `createProductWithRetry()`

3. **API 端點**
   - 新增 `/api/customers/generate-number`
   - 新增 `/api/products/generate-number`
   - 修改 POST `/api/customers` 和 `/api/products` 支援自訂編號

4. **前端表單**
   - `CustomerForm.tsx`: 新增客戶編號欄位，載入時自動生成
   - `ProductForm.tsx`: 新增商品編號欄位，載入時自動生成

5. **i18n 翻譯**
   - 新增 `customer.customerNumber` 和 `product.productNumber`

### 編號格式
- 客戶：`CUS202512-0001`
- 商品：`PRD202512-0001`

### 測試要點
- 新建客戶/商品時自動生成編號
- 使用者可自訂編號
- 不同公司可有相同編號
- 同公司不能有重複編號
