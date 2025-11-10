# Cloudflare 部署設定指南

## 前置準備

已完成項目：
- ✅ GitHub Actions 工作流程（`.github/workflows/cloudflare-deploy.yml`）
- ✅ Wrangler 配置檔（`wrangler.jsonc`）
- ✅ 本地環境變數（`.dev.vars`）
- ✅ Cloudflare Workers、KV Helper、Analytics Helper
- ✅ Resend 郵件服務

---

## 步驟 1：建立 KV Namespace

### 使用 Cloudflare Dashboard

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 選擇您的帳戶：**Acejou27@gmail.com's Account**
3. 左側選單：**Workers & Pages** → **KV**
4. 點擊 **Create a namespace**
5. 建立兩個 Namespace：
   - **名稱**: `quotation-system-KV`（生產環境）
   - **名稱**: `quotation-system-KV-preview`（預覽環境）
6. 複製產生的 **Namespace ID**

### 更新 wrangler.jsonc

將 KV Namespace ID 更新到 `wrangler.jsonc`：

```json
{
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "<生產環境的 Namespace ID>",
      "preview_id": "<預覽環境的 Namespace ID>"
    }
  ]
}
```

---

## 步驟 2：設定 Cloudflare Secrets

### 方法一：使用 Cloudflare Dashboard

1. 前往 **Workers & Pages** → 選擇 **quotation-system** Worker
2. 點擊 **Settings** → **Variables and Secrets**
3. 在 **Environment Variables** 區塊，點擊 **Add variable**
4. 新增以下環境變數（選擇 **Encrypt** 以保護敏感資料）：

#### Supabase 配置
```
NEXT_PUBLIC_SUPABASE_URL=https://nxlqtnnssfzzpbyfjnby.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHF0bm5zc2Z6enBieWZqbmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODMwMTEsImV4cCI6MjA1OTY1OTAxMX0.nMSM3V16oNAEpK738c5SOQmMDL3kPpJSgsC71HppQrI
SUPABASE_SERVICE_ROLE_KEY=***REMOVED***
SUPABASE_DB_URL=postgresql://postgres.nxlqtnnssfzzpbyfjnby:0BcMgW5mlOENYK9G@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

#### 應用配置
```
EXCHANGE_RATE_API_KEY=1679aaaab03fec128b24a69a
CRON_SECRET=<生成隨機字串>
CSRF_SECRET=<生成隨機字串>
COMPANY_NAME=振禾有限公司
NEXT_PUBLIC_APP_URL=https://quotation-system.pages.dev
NODE_ENV=production
```

#### Resend API（需先註冊）
```
RESEND_API_KEY=<您的 Resend API Key>
```

### 方法二：使用 Wrangler CLI（如果權限已修復）

```bash
# Supabase
pnpm exec wrangler secret put NEXT_PUBLIC_SUPABASE_URL --name quotation-system
pnpm exec wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --name quotation-system
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name quotation-system
pnpm exec wrangler secret put SUPABASE_DB_URL --name quotation-system

# 應用配置
pnpm exec wrangler secret put EXCHANGE_RATE_API_KEY --name quotation-system
pnpm exec wrangler secret put CRON_SECRET --name quotation-system
pnpm exec wrangler secret put CSRF_SECRET --name quotation-system
pnpm exec wrangler secret put COMPANY_NAME --name quotation-system
pnpm exec wrangler secret put NEXT_PUBLIC_APP_URL --name quotation-system
pnpm exec wrangler secret put NODE_ENV --name quotation-system

# Resend API
pnpm exec wrangler secret put RESEND_API_KEY --name quotation-system
```

---

## 步驟 3：註冊 Resend 並取得 API Key

1. 前往 [Resend.com](https://resend.com)
2. 註冊帳號（免費方案：每月 3000 封郵件）
3. 前往 **API Keys** 頁面
4. 點擊 **Create API Key**
5. 命名：`quotation-system`
6. 權限：**Sending access**
7. 複製 API Key 並儲存到 Cloudflare Secrets（步驟 2）

---

## 步驟 4：配置 Supabase Email 認證

### 4.1 啟用 Email Provider

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇專案：**quotation-system**
3. 左側選單：**Authentication** → **Providers**
4. 啟用 **Email**
5. 確認 **Enable Email provider** 已勾選

### 4.2 設定 Resend 作為 SMTP 服務

1. 在 Supabase Dashboard：**Settings** → **Auth** → **SMTP Settings**
2. 啟用 **Enable Custom SMTP**
3. 填入以下資訊：
   ```
   Sender email: quotations@yourdomain.com
   Sender name: 振禾有限公司
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: <您的 Resend API Key>
   ```
4. 點擊 **Save**

### 4.3 配置 Redirect URLs

1. 在 Supabase Dashboard：**Authentication** → **URL Configuration**
2. **Site URL**: `https://quotation-system.pages.dev`
3. **Redirect URLs**: 新增以下網址
   ```
   https://quotation-system.pages.dev/auth/callback
   https://quotation-system.pages.dev/*
   http://localhost:3333/auth/callback
   http://localhost:3333/*
   ```

---

## 步驟 5：設定 Google OAuth

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立或選擇專案
3. 左側選單：**APIs & Services** → **Credentials**
4. 點擊 **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Name: `quotation-system`
7. **Authorized redirect URIs**:
   ```
   https://<your-project-id>.supabase.co/auth/v1/callback
   ```
8. 點擊 **Create**
9. 複製 **Client ID** 和 **Client Secret**

### 在 Supabase 設定 Google OAuth

1. 回到 Supabase Dashboard：**Authentication** → **Providers**
2. 點擊 **Google**
3. 啟用 **Enable Google provider**
4. 貼上 **Client ID** 和 **Client Secret**
5. 點擊 **Save**

---

## 步驟 6：設定 GitHub OAuth

1. 前往 [GitHub](https://github.com) → **Settings** → **Developer settings** → **OAuth Apps**
2. 點擊 **New OAuth App**
3. 填入以下資訊：
   ```
   Application name: quotation-system
   Homepage URL: https://quotation-system.pages.dev
   Authorization callback URL: https://<your-project-id>.supabase.co/auth/v1/callback
   ```
4. 點擊 **Register application**
5. 複製 **Client ID**
6. 點擊 **Generate a new client secret** 並複製

### 在 Supabase 設定 GitHub OAuth

1. 回到 Supabase Dashboard：**Authentication** → **Providers**
2. 點擊 **GitHub**
3. 啟用 **Enable GitHub provider**
4. 貼上 **Client ID** 和 **Client Secret**
5. 點擊 **Save**

---

## 步驟 7：配置 GitHub Secrets（用於 CI/CD）

1. 前往 GitHub Repository：`https://github.com/[your-username]/quotation-system`
2. **Settings** → **Secrets and variables** → **Actions**
3. 點擊 **New repository secret**
4. 新增以下 Secrets：
   - **Name**: `CLOUDFLARE_API_TOKEN`
     - **Value**: `aC83INr4o9uz_PbsTF1Yba0hRAVqi80XchQbsegd`
   - **Name**: `CLOUDFLARE_ACCOUNT_ID`
     - **Value**: `f9916b95d011e8ad2a3fe10883053b0f`

---

## 步驟 8：本地測試

```bash
# 確認環境變數正確載入
cat .dev.vars

# 執行本地預覽
pnpm run preview:cf

# 測試功能
# 1. 開啟瀏覽器：http://localhost:8788
# 2. 測試註冊、登入、OAuth
# 3. 測試建立報價單
# 4. 檢查 Chrome DevTools Console
```

---

## 步驟 9：部署到 Cloudflare

### 方法一：手動部署

```bash
pnpm run deploy:cf
```

### 方法二：透過 GitHub Actions

1. 將變更 commit 並 push 到 `main` 分支
2. GitHub Actions 會自動觸發部署
3. 前往 GitHub Actions 查看部署狀態

---

## 步驟 10：驗證部署

### 檢查部署狀態

1. 前往 Cloudflare Dashboard：**Workers & Pages** → **quotation-system**
2. 查看 **Deployments** 確認最新部署成功
3. 查看 **Logs** 檢查是否有錯誤

### 測試生產環境

```bash
# 測試首頁
curl -I https://quotation-system.pages.dev

# 測試語系路由
curl -I https://quotation-system.pages.dev/zh
curl -I https://quotation-system.pages.dev/en

# 測試登入頁面
curl -I https://quotation-system.pages.dev/zh/login

# 測試 API
curl https://quotation-system.pages.dev/api/health
```

### 功能驗證清單

- [ ] Email/密碼註冊成功
- [ ] 收到驗證郵件（檢查垃圾郵件資料夾）
- [ ] Email/密碼登入成功
- [ ] Google OAuth 登入成功
- [ ] GitHub OAuth 登入成功
- [ ] 建立報價單成功
- [ ] 編輯報價單成功
- [ ] 刪除報價單成功
- [ ] 郵件寄送成功（使用 Resend）
- [ ] Chrome DevTools Console 無錯誤
- [ ] 匯率快取運作正常

---

## 疑難排解

### 問題 1：Wrangler 認證失敗

```bash
# 檢查 API Token 權限
env | grep CLOUDFLARE

# 重新登入
unset CLOUDFLARE_API_TOKEN
pnpm exec wrangler login
```

### 問題 2：KV Namespace 無法建立

**解決方案**：使用 Cloudflare Dashboard 手動建立（見步驟 1）

### 問題 3：Email 驗證郵件未送達

**可能原因**：
- Resend API Key 未設定
- Supabase SMTP 配置錯誤
- 郵件在垃圾郵件資料夾

**解決方案**：
1. 確認 Resend API Key 正確
2. 在 Supabase Dashboard 測試寄送郵件
3. 檢查垃圾郵件資料夾

### 問題 4：OAuth 登入失敗

**可能原因**：
- Redirect URL 配置錯誤
- Client ID/Secret 不正確

**解決方案**：
1. 確認 Supabase Site URL 正確
2. 確認 Google/GitHub OAuth Redirect URIs 正確
3. 重新生成 Client Secret

---

## 完成後的架構

```
User → Cloudflare Workers (300+ 節點)
       ↓
       Next.js App (OpenNext)
       ↓
       ├─ Supabase Auth (Email + OAuth)
       │  └─ Resend SMTP (專業郵件服務)
       ├─ Supabase PostgreSQL (Pooler)
       ├─ KV Cache (匯率快取)
       ├─ Workers Analytics (監控)
       └─ Cron Triggers (每日同步匯率)
```

---

## 參考資源

- [Cloudflare Workers 文件](https://developers.cloudflare.com/workers/)
- [OpenNext 文件](https://opennext.js.org/)
- [Supabase Auth 文件](https://supabase.com/docs/guides/auth)
- [Resend 文件](https://resend.com/docs)
- [Wrangler CLI 文件](https://developers.cloudflare.com/workers/wrangler/)
