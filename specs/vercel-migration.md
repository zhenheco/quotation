# Vercel 遷移規格

## 任務描述

將應用程式從 Cloudflare Workers 遷移至 Vercel，因為 bundle 大小（13 MiB）超過 Workers 的 10 MiB 限制。

---

## 背景資訊

### 當前狀態

| 項目 | 數值 |
|------|------|
| 當前 Bundle 大小 | 13 MiB |
| Workers 限制 | 10 MiB |
| 差距 | 超出 3 MiB |
| 主要原因 | Next.js 框架本身約 22 MiB |

### 已完成的優化

- ✅ 移除未使用的 API routes（12 個）
- ✅ Middleware 重構（移除 KV 依賴）
- ✅ Cache 服務重構
- ✅ 會計 API 重構（13 個 routes）

---

## 功能需求

### 1. 移除 Cloudflare 專用代碼

#### 1.1 更新 next.config.ts

移除以下內容：
```typescript
// 移除這些
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

// 移除這些配置
output: 'standalone',
outputFileTracingRoot: path.join(__dirname),
```

#### 1.2 移除 Cloudflare 依賴

```bash
pnpm remove @opennextjs/cloudflare wrangler @cloudflare/workers-types
```

#### 1.3 清理檔案

- 刪除或保留 `wrangler.toml`（備用）
- 刪除 `.github/workflows/deploy-cloudflare.yml`
- 刪除 `cloudflare-env.d.ts`
- 刪除 `.open-next/` 目錄

---

### 2. 處理 getCloudflareContext 殘留

雖然 middleware 已重構，但仍需確認所有檔案都不再使用 `getCloudflareContext`。

搜尋並移除所有：
```typescript
import { getCloudflareContext } from '@opennextjs/cloudflare'
```

---

### 3. Vercel 專案設定

#### 3.1 連接 GitHub

1. 登入 Vercel Dashboard
2. Import Git Repository
3. 選擇 quotation-system repo

#### 3.2 環境變數設定

在 Vercel Dashboard 設定以下環境變數：

**必要變數（Production + Preview）：**
```
NEXT_PUBLIC_SUPABASE_URL=https://oubsycwrxzkuviakzahi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=<從 Supabase Dashboard 取得>
NEXT_PUBLIC_APP_URL=https://quote24.cc

# Email
BREVO_API_KEY=<Brevo API Key>
BREVO_SENDER_EMAIL=<寄件者 Email>
BREVO_SENDER_NAME=<寄件者名稱>

# AI OCR
QWEN_API_KEY=<Qwen API Key>
CF_AIG_TOKEN=<Cloudflare AI Gateway Token>
```

**可選變數（如需保留 R2）：**
```
CLOUDFLARE_ACCOUNT_ID=<Account ID>
R2_ACCESS_KEY_ID=<R2 Access Key>
R2_SECRET_ACCESS_KEY=<R2 Secret>
R2_BUCKET_NAME=<Bucket Name>
```

#### 3.3 自定義域名

1. 在 Vercel Dashboard 添加域名：`quote24.cc`
2. 更新 DNS 記錄：
   - 如果使用 Cloudflare DNS：設定 CNAME 指向 `cname.vercel-dns.com`
   - 關閉 Cloudflare Proxy（橙色雲）改為 DNS only

---

### 4. 更新 Supabase 設定

在 Supabase Dashboard → Authentication → URL Configuration：

1. **Site URL**: `https://quote24.cc`
2. **Redirect URLs** 添加：
   - `https://quote24.cc/**`
   - `https://*.vercel.app/**`（用於預覽部署）

---

### 5. 更新 package.json scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

移除：
- `preview:cf`
- `deploy:cf`
- `cf-typegen`

---

## 注意事項

### 保留的 Cloudflare 服務

- **R2 Storage**：可繼續使用，通過 API 調用
- **DNS**：可繼續使用 Cloudflare DNS

### 不需要的服務

- **Workers**：不再使用
- **KV**：已在 middleware 重構中移除依賴

### 遷移風險

1. **OAuth 回調**：確保 Supabase 的 Redirect URLs 已更新
2. **環境變數**：確保所有 `NEXT_PUBLIC_*` 變數都已設定
3. **DNS 切換**：可能有短暫的 DNS 傳播延遲

---

## 測試要求

### 遷移後測試

1. 首頁載入正常
2. 登入/登出功能正常
3. Google OAuth 登入正常
4. 報價單 CRUD 功能正常
5. 會計系統功能正常
6. 檔案上傳功能正常（如使用 R2）

---

## 完成條件

當滿足以下條件時，此任務視為 **Completed**：

- [ ] Cloudflare 專用代碼已移除
- [ ] `@opennextjs/cloudflare` 等依賴已移除
- [ ] Vercel 專案已建立並連接 GitHub
- [ ] 環境變數已設定
- [ ] 自定義域名 quote24.cc 已設定
- [ ] Supabase OAuth redirect URLs 已更新
- [ ] `pnpm run build` 成功
- [ ] 部署成功
- [ ] 登入功能正常
- [ ] 主要功能測試通過
