# Cloudflare 部署計畫

## 專案概述

本專案為 Next.js 報價系統，已配置 OpenNext 適配器，可直接部署到 Cloudflare Workers。

**相容性評估：** ✅ 95% 準備就緒

## 階段一：基礎設定與 CI/CD（2-3 小時）

### 1. 建立 GitHub Actions 工作流程

建立 `.github/workflows/cloudflare-deploy.yml`：

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # 1. Checkout
      - uses: actions/checkout@v4

      # 2. Setup Node.js
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      # 3. Install pnpm
      - uses: pnpm/action-setup@v2
        with:
          version: 8

      # 4. Install dependencies
      - run: pnpm install --frozen-lockfile

      # 5. Lint & Type Check
      - run: pnpm run lint
      - run: tsc --noEmit

      # 6. Build
      - run: pnpm run build

      # 7. Preview (PR only)
      - if: github.event_name == 'pull_request'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy .open-next --project-name=quotation-system --branch=${{ github.head_ref }}

      # 8. Production Deploy (main branch)
      - if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy .open-next --project-name=quotation-system --branch=main
```

### 2. 配置環境變數

#### GitHub Secrets 設定

在 GitHub Repository → Settings → Secrets and variables → Actions 新增：

```bash
CLOUDFLARE_API_TOKEN       # 從 Cloudflare Dashboard → API Tokens 建立
CLOUDFLARE_ACCOUNT_ID      # 從 Cloudflare Dashboard → Account ID
```

#### Cloudflare Secrets 設定

使用 `wrangler secret` 指令設定生產環境變數：

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

# Resend API（報價單郵件寄送）
pnpm exec wrangler secret put RESEND_API_KEY --name quotation-system
```

#### 本地開發環境變數

建立 `.dev.vars`（已在 `.gitignore`）：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_POOLER_URL=your_pooler_url

# API Keys
EXCHANGE_RATE_API_KEY=your_exchange_rate_key
CRON_SECRET=your_cron_secret
CSRF_SECRET=your_csrf_secret

# Resend
RESEND_API_KEY=your_resend_key

# App Config
COMPANY_NAME=Your Company
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. 修改 wrangler.jsonc

更新現有的 `wrangler.jsonc`：

```jsonc
{
  "name": "quotation-system",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-03-25",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },

  // 新增：Cron Triggers
  "triggers": {
    "crons": ["0 0 * * *"]  // 每日午夜 UTC 同步匯率
  },

  // 新增：Workers Analytics
  "analytics_engine_datasets": [
    {
      "binding": "ANALYTICS"
    }
  ],

  // 新增：KV Namespace
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "your_kv_namespace_id",
      "preview_id": "your_preview_kv_namespace_id"
    }
  ],

  // 新增：Queues（選用）
  "queues": {
    "producers": [
      {
        "binding": "EMAIL_QUEUE",
        "queue": "email-queue"
      }
    ]
  }
}
```

**建立 KV Namespace：**

```bash
# 生產環境
pnpm exec wrangler kv:namespace create "KV"

# 預覽環境
pnpm exec wrangler kv:namespace create "KV" --preview
```

複製產生的 ID 到 `wrangler.jsonc` 的 `kv_namespaces` 區塊。

---

## 階段二：移除 Gmail SMTP，改用 Supabase Auth（1-2 小時）

### 4. 設定 Supabase Email 認證

#### 在 Supabase Dashboard：

1. 前往 **Authentication** → **Providers** → **Email**
2. 啟用 **Enable Email provider**
3. 配置 **Email Templates**：
   - 確認郵件（Confirm signup）
   - 重設密碼（Reset password）
   - 邀請郵件（Invite user）
4. 設定 **SMTP**（選擇以下之一）：
   - **選項 A**：使用 Supabase 內建 SMTP（簡單但有限制）
   - **選項 B**：整合 Resend（推薦，專業級郵件服務）

   **使用 Resend（推薦）：**
   - 前往 [Resend.com](https://resend.com)，註冊並取得 API Key
   - Supabase → Settings → Auth → SMTP Settings
   - 配置 Resend SMTP（或使用 Supabase Edge Functions + Resend）

5. 配置 **Redirect URLs**：
   ```
   https://your-project.pages.dev/auth/callback
   https://your-project.pages.dev/*
   ```

### 5. 設定 OAuth Providers（Supabase）

#### Google OAuth

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立專案（或選擇現有專案）
3. 啟用 **Google+ API**
4. 前往 **APIs & Services** → **Credentials**
5. 建立 **OAuth 2.0 Client ID**：
   - Application type: **Web application**
   - Authorized redirect URIs:
     ```
     https://your-project-id.supabase.co/auth/v1/callback
     ```
6. 複製 **Client ID** 和 **Client Secret**
7. 在 Supabase Dashboard：
   - Authentication → Providers → Google
   - 啟用並貼上 Client ID 和 Secret

#### GitHub OAuth

1. 前往 GitHub → Settings → Developer settings → OAuth Apps
2. 建立 **New OAuth App**：
   - Application name: `Quotation System`
   - Homepage URL: `https://your-project.pages.dev`
   - Authorization callback URL:
     ```
     https://your-project-id.supabase.co/auth/v1/callback
     ```
3. 複製 **Client ID** 和生成 **Client Secret**
4. 在 Supabase Dashboard：
   - Authentication → Providers → GitHub
   - 啟用並貼上 Client ID 和 Secret

### 6. 修改程式碼以使用 Supabase Auth

#### 移除 Nodemailer

刪除或註解 `lib/services/email.ts` 中的所有 Nodemailer 程式碼。

#### 更新註冊流程

修改註冊頁面使用 `supabase.auth.signUp()`：

```typescript
// app/[locale]/register/page.tsx
const { data, error } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    data: {
      full_name: formData.fullName,
      company_name: formData.companyName,
    }
  }
})

if (error) {
  // 處理錯誤
} else {
  // 顯示「請檢查您的信箱以驗證帳號」訊息
}
```

#### 更新登入流程

修改登入頁面使用 `supabase.auth.signInWithPassword()`：

```typescript
// app/[locale]/login/page.tsx
const { data, error } = await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password,
})

if (error) {
  // 處理錯誤
} else {
  // 重定向到儀表板
  router.push('/dashboard')
}
```

#### 加入 OAuth 登入按鈕

在登入/註冊頁面加入 OAuth 按鈕：

```typescript
// components/OAuthButtons.tsx
'use client'

import { createClient } from '@/lib/supabase/client'

export function OAuthButtons() {
  const supabase = createClient()

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    })
  }

  return (
    <div className="space-y-2">
      <button onClick={() => handleOAuthLogin('google')}>
        使用 Google 登入
      </button>
      <button onClick={() => handleOAuthLogin('github')}>
        使用 GitHub 登入
      </button>
    </div>
  )
}
```

#### 建立 Auth Callback 處理

確保 `app/auth/callback/route.ts` 正確處理 OAuth callback：

```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

#### 移除環境變數

從 `.env.local`、`.dev.vars` 和 Cloudflare Secrets 中移除：
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

---

## 階段三：整合免費 Cloudflare 工具（2-3 小時）

### 7. 設定 KV 快取

#### 建立 KV Helper

建立 `lib/cloudflare/kv.ts`：

```typescript
export interface KVNamespace {
  get(key: string, options?: { type: 'text' }): Promise<string | null>
  get(key: string, options: { type: 'json' }): Promise<any | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

export class KVCache {
  constructor(private kv: KVNamespace) {}

  async getExchangeRates(currency: string, date: string) {
    const key = `rates:${currency}:${date}`
    return await this.kv.get(key, { type: 'json' })
  }

  async setExchangeRates(currency: string, date: string, rates: any) {
    const key = `rates:${currency}:${date}`
    await this.kv.put(key, JSON.stringify(rates), {
      expirationTtl: 86400 // 24 小時
    })
  }

  async getRateLimit(ip: string): Promise<number> {
    const key = `ratelimit:${ip}`
    const count = await this.kv.get(key, { type: 'text' })
    return count ? parseInt(count) : 0
  }

  async incrementRateLimit(ip: string): Promise<void> {
    const key = `ratelimit:${ip}`
    const count = await this.getRateLimit(ip)
    await this.kv.put(key, String(count + 1), {
      expirationTtl: 60 // 1 分鐘
    })
  }
}
```

#### 使用 KV 快取匯率

修改 `app/api/cron/exchange-rates/route.ts`：

```typescript
import { KVCache } from '@/lib/cloudflare/kv'

export async function GET(request: Request) {
  const kv = new KVCache(process.env.KV as any)

  // 檢查快取
  const today = new Date().toISOString().split('T')[0]
  const cached = await kv.getExchangeRates('USD', today)

  if (cached) {
    return Response.json(cached)
  }

  // 從 API 取得匯率
  const rates = await fetchExchangeRates()

  // 儲存到快取
  await kv.setExchangeRates('USD', today, rates)

  return Response.json(rates)
}
```

### 8. 啟用 Workers Analytics

#### 建立 Analytics Helper

建立 `lib/cloudflare/analytics.ts`：

```typescript
export interface AnalyticsEngine {
  writeDataPoint(event: {
    blobs?: string[]
    doubles?: number[]
    indexes?: string[]
  }): void
}

export class Analytics {
  constructor(private engine: AnalyticsEngine) {}

  trackQuotationCreated(userId: string, amount: number) {
    this.engine.writeDataPoint({
      blobs: ['quotation_created'],
      doubles: [amount],
      indexes: [userId],
    })
  }

  trackEmailSent(quotationId: string, status: 'success' | 'failed') {
    this.engine.writeDataPoint({
      blobs: ['email_sent', status],
      indexes: [quotationId],
    })
  }

  trackAPIRequest(endpoint: string, duration: number) {
    this.engine.writeDataPoint({
      blobs: ['api_request'],
      doubles: [duration],
      indexes: [endpoint],
    })
  }
}
```

#### 在 API 中使用 Analytics

```typescript
import { Analytics } from '@/lib/cloudflare/analytics'

export async function POST(request: Request) {
  const analytics = new Analytics(process.env.ANALYTICS as any)
  const start = Date.now()

  // 處理請求...
  const quotation = await createQuotation(data)

  // 追蹤事件
  analytics.trackQuotationCreated(userId, quotation.total)
  analytics.trackAPIRequest('/api/quotations', Date.now() - start)

  return Response.json(quotation)
}
```

### 9. 配置 Queues（選用）

#### 建立 Queue Producer

```bash
pnpm exec wrangler queues create email-queue
```

#### 建立 Queue Consumer

建立 `workers/email-consumer.ts`：

```typescript
export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { type, data } = message.body

      if (type === 'send_quotation') {
        await sendQuotationEmail(data.quotationId, data.recipientEmail, env)
      }

      message.ack()
    }
  },
}

async function sendQuotationEmail(quotationId: string, email: string, env: Env) {
  // 使用 Resend API 寄送郵件
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'quotations@yourdomain.com',
      to: email,
      subject: '您的報價單',
      html: '...',
    }),
  })
}
```

#### 在 API 中推送到 Queue

```typescript
export async function POST(request: Request) {
  // 建立報價單...

  // 推送到 Queue（非同步處理）
  await env.EMAIL_QUEUE.send({
    type: 'send_quotation',
    data: {
      quotationId: quotation.id,
      recipientEmail: customer.email,
    },
  })

  return Response.json({ success: true })
}
```

---

## 階段四：測試與部署（1 天）

### 10. 本地測試

#### 啟動本地預覽

```bash
pnpm run preview:cf
```

#### 測試檢查清單

- [ ] **認證流程**
  - [ ] Email/密碼註冊
  - [ ] 收到驗證郵件
  - [ ] Email/密碼登入
  - [ ] Google OAuth 登入
  - [ ] GitHub OAuth 登入
  - [ ] 忘記密碼流程
  - [ ] 登出功能

- [ ] **CRUD 功能**
  - [ ] 建立報價單
  - [ ] 編輯報價單
  - [ ] 刪除報價單
  - [ ] 查看報價單列表
  - [ ] 客戶管理
  - [ ] 產品管理

- [ ] **資料庫操作**
  - [ ] 查詢速度正常
  - [ ] 寫入成功
  - [ ] 權限控制（RBAC）正常
  - [ ] 多公司隔離正常

- [ ] **整合功能**
  - [ ] 匯率同步（Cron）
  - [ ] KV 快取運作
  - [ ] Analytics 追蹤
  - [ ] Queue 處理（如有）

- [ ] **前端檢查**
  - [ ] 使用 Chrome DevTools 檢查 Console（無錯誤）
  - [ ] 網路請求正常（無 404/500）
  - [ ] 頁面載入速度
  - [ ] 響應式設計正常

### 11. 部署到 Cloudflare

#### 執行部署

```bash
pnpm run deploy:cf
```

#### 驗證部署

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

#### 測試認證流程

1. 前往 `https://quotation-system.pages.dev/zh/register`
2. 註冊新帳號
3. 檢查信箱收到驗證郵件
4. 點擊驗證連結
5. 登入成功
6. 測試 OAuth 登入（Google、GitHub）

#### 監控部署

1. 前往 Cloudflare Dashboard → Workers & Pages → quotation-system
2. 查看 **Logs** 標籤
3. 使用 `wrangler tail` 即時查看日誌：
   ```bash
   pnpm exec wrangler tail quotation-system --format pretty
   ```
4. 查看 **Analytics** 標籤（Workers Analytics 數據）

---

## 關鍵決策摘要

### 認證策略

**✅ 100% 使用 Supabase Auth**

| 功能 | 實作方式 |
|------|---------|
| Email/密碼認證 | `supabase.auth.signUp()` / `signInWithPassword()` |
| Email 驗證 | Supabase 自動寄送（使用內建或 Resend SMTP） |
| OAuth（Google、GitHub） | `supabase.auth.signInWithOAuth()` |
| 密碼重設 | Supabase `resetPasswordForEmail()` |
| Session 管理 | Supabase SSR cookies |

**❌ 移除的功能**
- Nodemailer（`lib/services/email.ts`）
- Gmail SMTP 環境變數
- 自建郵件寄送邏輯

### 報價單郵件寄送

**✅ 使用 Resend API**

```typescript
// lib/services/resend.ts
export async function sendQuotationEmail(to: string, quotation: Quotation) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'quotations@yourdomain.com',
      to,
      subject: `報價單 ${quotation.quotation_number}`,
      html: renderQuotationEmail(quotation),
    }),
  })

  return response.json()
}
```

### 資料庫策略

**✅ 保持 100% 使用 Supabase PostgreSQL**

- 認證資料：Supabase Auth
- 應用資料：Supabase PostgreSQL（透過 pooler）
- 不使用 D1（複雜度太高，收益低）

### Cloudflare 免費工具優先級

| 工具 | 優先級 | 用途 |
|------|-------|------|
| Workers Analytics | **高** | 追蹤 API 使用、錯誤率、效能 |
| KV | **中** | 快取匯率、Session、Rate Limiting |
| Queues | **中** | 非同步郵件寄送、避免 CPU 逾時 |
| Email Workers | **低** | 已使用 Resend，不需要 |
| R2 | **低** | 未來檔案上傳（目前無需求） |
| D1 | **不使用** | Supabase 更適合 |

---

## 預期成果

### 效能提升

- ✅ 全球 CDN 加速（Cloudflare 300+ 節點）
- ✅ Edge Runtime（低延遲）
- ✅ KV 快取（減少資料庫查詢）
- ✅ Queue 非同步處理（避免阻塞）

### 成本節省

| 項目 | Vercel | Cloudflare | 節省 |
|------|--------|-----------|------|
| 基礎費用 | $20/月（Pro） | $0（免費） | $20 |
| 請求數 | 100K/月（含） | 100K/日（免費） | - |
| 總計 | $20/月 | **$0/月** | **$20/月** |

### 開發體驗

- ✅ 自動化 CI/CD（GitHub → Cloudflare）
- ✅ PR 預覽環境（自動建立）
- ✅ 即時日誌（`wrangler tail`）
- ✅ 完整監控（Workers Analytics）
- ✅ 簡化架構（Supabase 統一認證）

### 安全性

- ✅ Supabase RLS（資料庫層級權限控制）
- ✅ 環境變數加密（Cloudflare Secrets）
- ✅ OAuth 整合（Google、GitHub）
- ✅ Email 驗證（Supabase Auth）
- ✅ Rate Limiting（KV 實作）

---

## 疑難排解

### 常見問題

#### 1. OAuth Redirect URI 不匹配

**錯誤訊息：** `redirect_uri_mismatch`

**解決方案：**
- 確認 Google/GitHub OAuth App 設定的 Callback URL 為：
  ```
  https://your-project-id.supabase.co/auth/v1/callback
  ```
- 確認 Supabase 的 Site URL 和 Redirect URLs 包含：
  ```
  https://quotation-system.pages.dev
  ```

#### 2. Email 未收到

**可能原因：**
- SMTP 設定錯誤
- Email 被視為垃圾郵件
- Supabase Email 限制（免費版每小時 4 封）

**解決方案：**
- 檢查 Supabase Dashboard → Settings → Auth → SMTP Settings
- 使用 Resend（推薦）取代內建 SMTP
- 檢查垃圾郵件資料夾

#### 3. 資料庫連線失敗

**錯誤訊息：** `Connection timeout`

**解決方案：**
- 確認使用 `SUPABASE_POOLER_URL` 而非直連 URL
- 檢查 Cloudflare Secrets 是否正確設定
- 驗證 `@neondatabase/serverless` 已安裝

#### 4. Workers Analytics 無數據

**解決方案：**
- 確認 `wrangler.jsonc` 中有 `analytics_engine_datasets`
- 重新部署後等待 5-10 分鐘
- 檢查程式碼中是否有呼叫 `writeDataPoint()`

---

## 後續優化

### 短期（1 個月內）

- [ ] 設定自訂域名（Cloudflare DNS）
- [ ] 啟用 SSL/TLS（自動，Cloudflare 提供）
- [ ] 配置 WAF 規則（防 DDoS）
- [ ] 實作完整的 Rate Limiting

### 中期（3 個月內）

- [ ] 加入 R2 檔案儲存（客戶簽名、附件）
- [ ] 實作 Image Optimization（Cloudflare Images）
- [ ] 建立 Cloudflare Workers 監控儀表板
- [ ] 設定告警通知（錯誤率過高時）

### 長期（6 個月內）

- [ ] 多區域部署（全球加速）
- [ ] A/B Testing（Cloudflare Workers）
- [ ] 進階快取策略（Stale-While-Revalidate）
- [ ] 自動擴展（Cloudflare 自動處理）

---

## 參考資源

- [OpenNext Cloudflare 文件](https://opennext.js.org/cloudflare)
- [Cloudflare Workers 文件](https://developers.cloudflare.com/workers/)
- [Supabase Auth 文件](https://supabase.com/docs/guides/auth)
- [Resend API 文件](https://resend.com/docs)
- [Wrangler CLI 文件](https://developers.cloudflare.com/workers/wrangler/)
