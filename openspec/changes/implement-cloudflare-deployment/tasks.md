# Tasks

## 階段一：基礎設定與 CI/CD（2-3 小時）

### 1. 建立 GitHub Actions 工作流程

- [x] 建立 `.github/workflows/cloudflare-deploy.yml`
- [x] 配置 checkout、setup-node、install pnpm 步驟
- [x] 加入 lint 和 type check 步驟
- [x] 配置 build 步驟
- [x] 設定 PR 預覽部署（使用 cloudflare/wrangler-action@v3）
- [x] 設定 main 分支生產部署
- [ ] **驗證**：建立測試 PR，確認自動部署觸發

### 2. 配置 GitHub Secrets

- [x] 前往 GitHub Repository → Settings → Secrets and variables → Actions
- [x] 新增 `CLOUDFLARE_API_TOKEN`（從 Cloudflare Dashboard → API Tokens 建立）
- [x] 新增 `CLOUDFLARE_ACCOUNT_ID`（從 Cloudflare Dashboard 複製）
- [ ] **驗證**：在 GitHub Actions 工作流程中確認 secrets 可正常讀取

### 3. 設定 Cloudflare Secrets

使用 `wrangler secret` 指令設定以下環境變數：

```bash
# Supabase 配置
pnpm exec wrangler secret put NEXT_PUBLIC_SUPABASE_URL --name quotation-system
pnpm exec wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --name quotation-system
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name quotation-system
pnpm exec wrangler secret put SUPABASE_POOLER_URL --name quotation-system

# 應用配置
pnpm exec wrangler secret put EXCHANGE_RATE_API_KEY --name quotation-system
pnpm exec wrangler secret put CRON_SECRET --name quotation-system
pnpm exec wrangler secret put CSRF_SECRET --name quotation-system
pnpm exec wrangler secret put COMPANY_NAME --name quotation-system
pnpm exec wrangler secret put NEXT_PUBLIC_APP_URL --name quotation-system

# Resend API
pnpm exec wrangler secret put RESEND_API_KEY --name quotation-system
```

- [ ] 設定所有必要的 Cloudflare Secrets
- [ ] **驗證**：執行 `pnpm exec wrangler secret list --name quotation-system` 確認設定完成

### 4. 建立 .dev.vars 本地環境變數

- [x] 建立 `.dev.vars` 檔案（已在 `.gitignore`）
- [x] 複製所有必要環境變數（參考 CLOUDFLARE_DEPLOYMENT.md）
- [x] 確認 `.dev.vars` 已加入 `.gitignore`
- [ ] **驗證**：執行 `pnpm run preview:cf` 確認本地環境變數載入成功

### 5. 更新 wrangler.jsonc

- [x] 加入 Cron Triggers 配置（每日午夜 UTC 同步匯率）
- [x] 加入 Workers Analytics 配置
- [x] 加入 KV Namespace 配置（預留 id）
- [ ] 加入 Queues 配置（選用）
- [ ] **驗證**：執行 `pnpm run build` 確認配置無錯誤

### 6. 建立 KV Namespace

```bash
# 生產環境
pnpm exec wrangler kv:namespace create "KV"

# 預覽環境
pnpm exec wrangler kv:namespace create "KV" --preview
```

- [ ] 建立生產和預覽 KV Namespace
- [ ] 複製產生的 ID 到 `wrangler.jsonc`
- [ ] **驗證**：執行 `pnpm exec wrangler kv:namespace list` 確認建立成功

---

## 階段二：認證系統改造（1-2 小時）

### 7. 設定 Supabase Email 認證

- [ ] 前往 Supabase Dashboard → Authentication → Providers → Email
- [ ] 啟用 **Enable Email provider**
- [ ] 配置 Email Templates（確認、重設密碼、邀請）
- [ ] 設定 Redirect URLs：
  ```
  https://quotation-system.pages.dev/auth/callback
  https://quotation-system.pages.dev/*
  ```
- [ ] **驗證**：在 Supabase Dashboard 測試寄送驗證郵件

### 8. 整合 Resend 作為 SMTP 服務

- [ ] 前往 [Resend.com](https://resend.com) 註冊
- [ ] 建立 API Key
- [ ] 在 Supabase Dashboard → Settings → Auth → SMTP Settings 配置 Resend
- [ ] **驗證**：測試寄送郵件，確認送達率

### 9. 設定 Google OAuth

- [ ] 前往 [Google Cloud Console](https://console.cloud.google.com)
- [ ] 建立或選擇專案
- [ ] 啟用 Google+ API
- [ ] 建立 OAuth 2.0 Client ID（Web application）
- [ ] 設定 Authorized redirect URIs：`https://[your-project-id].supabase.co/auth/v1/callback`
- [ ] 複製 Client ID 和 Client Secret
- [ ] 在 Supabase Dashboard → Authentication → Providers → Google 啟用並貼上
- [ ] **驗證**：測試 Google OAuth 登入流程

### 10. 設定 GitHub OAuth

- [ ] 前往 GitHub → Settings → Developer settings → OAuth Apps
- [ ] 建立 New OAuth App
- [ ] 設定 Authorization callback URL：`https://[your-project-id].supabase.co/auth/v1/callback`
- [ ] 複製 Client ID 和生成 Client Secret
- [ ] 在 Supabase Dashboard → Authentication → Providers → GitHub 啟用並貼上
- [ ] **驗證**：測試 GitHub OAuth 登入流程

### 11. 修改註冊流程使用 Supabase Auth

- [ ] 修改 `app/[locale]/register/page.tsx`
- [ ] 使用 `supabase.auth.signUp()` 取代現有註冊邏輯
- [ ] 加入 `emailRedirectTo` 設定
- [ ] 處理錯誤訊息顯示
- [ ] **驗證**：測試註冊流程，確認收到驗證郵件

### 12. 修改登入流程使用 Supabase Auth

- [ ] 修改 `app/[locale]/login/page.tsx`
- [ ] 使用 `supabase.auth.signInWithPassword()` 取代現有登入邏輯
- [ ] 處理登入成功重定向
- [ ] 處理錯誤訊息顯示
- [ ] **驗證**：測試登入流程

### 13. 建立 OAuth 登入按鈕組件

- [ ] 建立 `components/OAuthButtons.tsx`
- [ ] 實作 Google 登入按鈕
- [ ] 實作 GitHub 登入按鈕
- [ ] 處理 OAuth callback
- [ ] **驗證**：測試 OAuth 登入流程

### 14. 更新 Auth Callback 處理

- [ ] 檢查 `app/auth/callback/route.ts` 是否正確處理 OAuth callback
- [ ] 確認 `exchangeCodeForSession()` 正確執行
- [ ] 設定登入後重定向到 `/dashboard`
- [ ] **驗證**：測試 OAuth callback 流程

### 15. 移除 Nodemailer 和 Gmail SMTP

- [ ] 刪除或註解 `lib/services/email.ts` 中的 Nodemailer 程式碼
- [ ] 從 `.env.local` 移除 `GMAIL_USER` 和 `GMAIL_APP_PASSWORD`
- [ ] 從 `.dev.vars` 移除 Gmail 環境變數
- [ ] 從 Cloudflare Secrets 移除 Gmail 相關變數（如已設定）
- [ ] **驗證**：確認專案不再依賴 Nodemailer

---

## 階段三：Cloudflare 工具整合（2-3 小時）

### 16. 建立 KV Helper

- [x] 建立 `lib/cloudflare/kv.ts`
- [x] 定義 `KVNamespace` interface
- [x] 實作 `KVCache` class
- [x] 加入 `getExchangeRates()` 和 `setExchangeRates()` 方法
- [x] 加入 Rate Limiting 方法（`getRateLimit()`, `incrementRateLimit()`）
- [ ] **驗證**：撰寫單元測試驗證 KV Helper 功能

### 17. 實作 KV 快取匯率

- [ ] 修改 `app/api/cron/exchange-rates/route.ts`
- [ ] 在取得匯率前先檢查 KV 快取
- [ ] 將取得的匯率儲存到 KV（TTL: 24 小時）
- [ ] 處理快取失敗的 fallback 邏輯
- [ ] **驗證**：測試匯率 API，確認快取運作正常

### 18. 建立 Analytics Helper

- [x] 建立 `lib/cloudflare/analytics.ts`
- [x] 定義 `AnalyticsEngine` interface
- [x] 實作 `Analytics` class
- [x] 加入 `trackQuotationCreated()` 方法
- [x] 加入 `trackEmailSent()` 方法
- [x] 加入 `trackAPIRequest()` 方法
- [ ] **驗證**：撰寫單元測試驗證 Analytics Helper 功能

### 19. 在 API 中整合 Workers Analytics

- [ ] 在報價單建立 API 中加入 Analytics 追蹤
- [ ] 在郵件寄送 API 中加入 Analytics 追蹤
- [ ] 在所有主要 API endpoints 加入請求時間追蹤
- [ ] **驗證**：執行 API 請求後，在 Cloudflare Dashboard 確認 Analytics 數據

### 20. （選用）配置 Queues

- [ ] 建立 email-queue：`pnpm exec wrangler queues create email-queue`
- [ ] 建立 `workers/email-consumer.ts`
- [ ] 實作 Queue Consumer 處理郵件寄送
- [ ] 在報價單 API 中推送郵件任務到 Queue
- [ ] **驗證**：測試郵件寄送，確認 Queue 正常運作

### 21. 建立 Resend 郵件服務

- [x] 建立 `lib/services/resend.ts`
- [x] 實作 `sendEmail()` 函式
- [x] 使用 Resend API 寄送郵件
- [x] 實作 `sendBulkEmails()` 函式
- [x] 處理寄送失敗的錯誤
- [ ] **驗證**：測試報價單郵件寄送

---

## 階段四：測試與部署（1 天）

### 22. 本地預覽測試

```bash
pnpm run preview:cf
```

- [ ] 執行本地預覽
- [ ] 測試 Email/密碼註冊（確認收到驗證郵件）
- [ ] 測試 Email/密碼登入
- [ ] 測試 Google OAuth 登入
- [ ] 測試 GitHub OAuth 登入
- [ ] 測試忘記密碼流程
- [ ] 測試登出功能
- [ ] **驗證**：所有認證流程無錯誤

### 23. 測試 CRUD 功能

- [ ] 測試建立報價單
- [ ] 測試編輯報價單
- [ ] 測試刪除報價單
- [ ] 測試查看報價單列表
- [ ] 測試客戶管理
- [ ] 測試產品管理
- [ ] **驗證**：所有 CRUD 操作正常

### 24. 測試資料庫操作

- [ ] 測試查詢速度
- [ ] 測試寫入成功
- [ ] 測試權限控制（RBAC）
- [ ] 測試多公司隔離
- [ ] **驗證**：資料庫操作符合預期

### 25. 測試整合功能

- [ ] 測試匯率同步 Cron Trigger
- [ ] 測試 KV 快取運作
- [ ] 測試 Workers Analytics 追蹤
- [ ] 測試 Queue 處理（如有）
- [ ] **驗證**：所有整合功能正常

### 26. 使用 Chrome DevTools 檢查前端

- [ ] 開啟 Chrome DevTools
- [ ] 檢查 Console（確認無錯誤）
- [ ] 檢查 Network（確認無 404/500）
- [ ] 檢查頁面載入速度
- [ ] 檢查響應式設計
- [ ] **驗證**：前端無任何錯誤

### 27. 執行部署到 Cloudflare

```bash
pnpm run deploy:cf
```

- [ ] 執行部署指令
- [ ] 觀察部署日誌
- [ ] 確認部署成功
- [ ] **驗證**：部署無錯誤

### 28. 驗證部署結果

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

- [ ] 測試首頁
- [ ] 測試所有主要路由
- [ ] 測試 API endpoints
- [ ] **驗證**：所有路由和 API 正常回應

### 29. 測試生產環境認證流程

- [ ] 前往 `https://quotation-system.pages.dev/zh/register`
- [ ] 註冊新帳號
- [ ] 檢查信箱收到驗證郵件
- [ ] 點擊驗證連結
- [ ] 測試登入
- [ ] 測試 OAuth 登入（Google、GitHub）
- [ ] **驗證**：生產環境認證流程正常

### 30. 監控部署狀態

- [ ] 前往 Cloudflare Dashboard → Workers & Pages → quotation-system
- [ ] 查看 **Logs** 標籤
- [ ] 使用 `pnpm exec wrangler tail quotation-system --format pretty` 即時查看日誌
- [ ] 查看 **Analytics** 標籤
- [ ] **驗證**：無錯誤日誌，Analytics 數據正常

### 31. 檢查 Workers Analytics 數據

- [ ] 在 Cloudflare Dashboard 確認 Analytics 數據
- [ ] 確認 API 請求追蹤正常
- [ ] 確認錯誤率追蹤正常
- [ ] **驗證**：Analytics 數據符合預期

### 32. 更新文件

- [ ] 更新 README.md（加入 Cloudflare 部署說明）
- [ ] 記錄部署流程（`.github/workflows/cloudflare-deploy.yml`）
- [ ] 記錄環境變數設定方式
- [ ] 記錄疑難排解步驟
- [ ] **驗證**：文件完整且準確

---

## 驗證檢查清單

### 認證流程

- [ ] Email/密碼註冊成功
- [ ] 收到驗證郵件
- [ ] Email/密碼登入成功
- [ ] Google OAuth 登入成功
- [ ] GitHub OAuth 登入成功
- [ ] 忘記密碼流程正常
- [ ] 登出功能正常

### CRUD 功能

- [ ] 建立報價單成功
- [ ] 編輯報價單成功
- [ ] 刪除報價單成功
- [ ] 查看報價單列表正常
- [ ] 客戶管理正常
- [ ] 產品管理正常

### 資料庫操作

- [ ] 查詢速度正常
- [ ] 寫入成功
- [ ] 權限控制（RBAC）正常
- [ ] 多公司隔離正常

### 整合功能

- [ ] 匯率同步 Cron 正常
- [ ] KV 快取運作正常
- [ ] Workers Analytics 追蹤正常
- [ ] Queue 處理正常（如有）

### 前端檢查

- [ ] Chrome DevTools Console 無錯誤
- [ ] 網路請求正常（無 404/500）
- [ ] 頁面載入速度正常
- [ ] 響應式設計正常

### 部署驗證

- [ ] 部署成功
- [ ] 所有路由正常
- [ ] API endpoints 正常
- [ ] 生產環境認證流程正常
- [ ] 無錯誤日誌
- [ ] Analytics 數據正常
