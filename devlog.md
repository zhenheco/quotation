# Development Log

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
將 `build` script 改為只執行 `next build`：
```json
"build": "next build"
```

因為 `opennextjs-cloudflare build` 會自動執行 `next build`，所以不需要在 build script 中重複。

### 部署方式變更
使用 Wrangler CLI 直接部署，而非依賴 Cloudflare Git 整合：
```bash
pnpm exec opennextjs-cloudflare build && pnpm exec wrangler deploy
```

或使用現有的 script：
```bash
pnpm run deploy:cf
```

### 經驗教訓
1. `opennextjs-cloudflare build` 會自動呼叫 `pnpm run build`，不要在 build script 中再呼叫它
2. 如果使用 Cloudflare Git 整合，build command 應設為 `opennextjs-cloudflare build`，而非 `pnpm run build`
3. 優先使用 Wrangler CLI 部署，避免 Git 整合的 build command 配置問題

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
