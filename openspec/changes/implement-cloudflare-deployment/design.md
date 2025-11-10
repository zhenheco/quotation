# Design Document: Cloudflare Deployment

## Architecture Overview

### 當前架構

```
User → Vercel Edge → Next.js App → Supabase PostgreSQL
                      ↓
                  Gmail SMTP (認證郵件)
                      ↓
                  External Exchange Rate API
```

### 目標架構

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
       ├─ Cron Triggers (每日同步匯率)
       └─ Queues (非同步郵件寄送)
```

---

## 核心設計決策

### 1. 部署平台：Cloudflare Workers vs Vercel

#### 決策：選擇 Cloudflare Workers

**理由**：

1. **成本優勢**：
   - Cloudflare 免費方案：100K 請求/日，完全免費
   - Vercel Pro：$20/月，且請求限制較嚴格
   - 對於中小型專案，Cloudflare 可節省 $240/年

2. **全球效能**：
   - Cloudflare：300+ 全球節點
   - Vercel：節點數較少
   - Cloudflare 在亞太地區覆蓋率更好

3. **整合工具**：
   - KV（快取）、Analytics（監控）、Queues（非同步任務）全部免費
   - Vercel 類似功能需付費或另外整合

**Trade-offs**：

- ✅ 節省成本
- ✅ 更好的全球覆蓋
- ✅ 免費整合工具
- ⚠️ 需要遷移現有配置
- ⚠️ Workers CPU 時間限制（免費版 10ms）

---

### 2. 認證策略：Supabase Auth vs 自建 + Gmail SMTP

#### 決策：100% 使用 Supabase Auth + Resend

**理由**：

1. **專業性**：
   - Supabase Auth：專業認證服務，內建 Email 驗證、OAuth、密碼重設
   - Gmail SMTP：個人郵件服務，不適合生產環境

2. **可靠性**：
   - Supabase + Resend：專業郵件送達率（99%+）
   - Gmail SMTP：每日限制 100 封，容易被標記為垃圾郵件

3. **OAuth 整合**：
   - Supabase Auth 原生支援 Google、GitHub、Facebook 等 OAuth
   - 自建需要額外開發和維護

4. **安全性**：
   - Supabase Auth：內建防暴力破解、Rate Limiting、Email 驗證
   - 自建：需要手動實作所有安全機制

**實作細節**：

| 功能 | 實作方式 |
|------|---------|
| Email/密碼註冊 | `supabase.auth.signUp()` |
| Email 驗證 | Supabase 自動寄送（使用 Resend SMTP） |
| 登入 | `supabase.auth.signInWithPassword()` |
| OAuth（Google、GitHub） | `supabase.auth.signInWithOAuth()` |
| 密碼重設 | `supabase.auth.resetPasswordForEmail()` |
| Session 管理 | Supabase SSR cookies |

**Trade-offs**：

- ✅ 專業且可靠
- ✅ 內建 OAuth 支援
- ✅ 更高的郵件送達率
- ✅ 節省開發時間
- ⚠️ 需要設定 Resend（但免費方案足夠）
- ❌ 移除 Nodemailer 和 Gmail SMTP

---

### 3. 報價單郵件：Resend API vs Queues + Nodemailer

#### 決策：使用 Resend API（可選：整合 Queues）

**理由**：

1. **簡化架構**：
   - Resend API：直接呼叫 HTTP API，無需額外基礎設施
   - Queues + Nodemailer：需要設定 Consumer Worker，複雜度較高

2. **專業服務**：
   - Resend：專業郵件服務，提供詳細的寄送統計、錯誤追蹤
   - Nodemailer：底層郵件庫，需要自行處理重試、錯誤

3. **成本**：
   - Resend 免費方案：每月 3000 封（足夠使用）
   - Cloudflare Queues：免費（如需要非同步處理）

**實作方式**：

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

**選用：整合 Queues**

如果未來報價單寄送量增加，可整合 Cloudflare Queues：

```typescript
// 在 API 中推送到 Queue
await env.EMAIL_QUEUE.send({
  type: 'send_quotation',
  data: { quotationId, recipientEmail }
})

// workers/email-consumer.ts
export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      await sendQuotationEmail(message.body.data.quotationId, env)
      message.ack()
    }
  }
}
```

**Trade-offs**：

- ✅ 簡化實作（使用 Resend API）
- ✅ 專業郵件服務
- ✅ 免費額度足夠
- ⚠️ 需要整合 Queues 以處理大量寄送（選用）

---

### 4. 資料庫策略：Supabase PostgreSQL vs Cloudflare D1

#### 決策：保持 100% 使用 Supabase PostgreSQL

**理由**：

1. **功能完整性**：
   - Supabase PostgreSQL：完整的 PostgreSQL，支援 JSON、Full-Text Search、RLS
   - Cloudflare D1：SQLite，功能有限

2. **現有投資**：
   - 專案已完全依賴 Supabase（認證、資料庫、Row-Level Security）
   - 遷移到 D1 需要重寫所有查詢和 RLS 規則

3. **複雜度 vs 收益**：
   - 保持 Supabase：零額外開發成本
   - 遷移到 D1：需要數週開發，且功能受限

4. **連線最佳化**：
   - 使用 Supabase Pooler（Transaction Pooling）
   - 使用 `@neondatabase/serverless`（適合 Edge Runtime）

**實作細節**：

```typescript
// lib/supabase/server.ts
import { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.SUPABASE_POOLER_URL!)
```

**Trade-offs**：

- ✅ 保持現有功能和架構
- ✅ 零遷移成本
- ✅ 完整的 PostgreSQL 功能
- ⚠️ 依賴外部資料庫（但 Supabase 已是現有依賴）

---

### 5. 快取策略：KV vs R2 vs Workers Cache API

#### 決策：使用 Cloudflare KV

**理由**：

1. **用途匹配**：
   - KV：鍵值儲存，適合快取匯率、Session、Rate Limiting
   - R2：物件儲存，適合檔案（專案目前無需求）
   - Workers Cache API：HTTP 快取，適合靜態資源（Next.js 已處理）

2. **效能**：
   - KV：全球邊緣快取，讀取延遲 < 5ms
   - 適合高頻讀取、低頻寫入的資料（匯率每日更新）

3. **免費額度**：
   - KV 免費方案：每日 100K 讀取、1K 寫入（足夠使用）

**實作方式**：

```typescript
// lib/cloudflare/kv.ts
export class KVCache {
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
}
```

**快取流程**：

```
1. API 請求匯率
   ↓
2. 檢查 KV 快取（key: `rates:USD:2025-01-10`）
   ├─ 有快取 → 直接回傳（< 5ms）
   └─ 無快取 → 呼叫外部 API → 儲存到 KV → 回傳
```

**Trade-offs**：

- ✅ 減少外部 API 呼叫（節省成本和延遲）
- ✅ 全球邊緣快取（低延遲）
- ✅ 免費額度充足
- ⚠️ 需要處理快取失效和更新

---

### 6. 監控策略：Workers Analytics vs 第三方服務

#### 決策：使用 Cloudflare Workers Analytics

**理由**：

1. **原生整合**：
   - Workers Analytics：無需額外設定，直接在 Cloudflare Dashboard 查看
   - 第三方服務（如 Sentry、Datadog）：需要額外配置和成本

2. **免費且強大**：
   - Workers Analytics：完全免費，提供詳細的 CPU 時間、錯誤率、請求統計
   - 第三方服務：通常需要付費

3. **低開銷**：
   - Workers Analytics：使用 `writeDataPoint()`，不影響 CPU 時間
   - 第三方服務：可能增加請求延遲

**實作方式**：

```typescript
// lib/cloudflare/analytics.ts
export class Analytics {
  trackQuotationCreated(userId: string, amount: number) {
    this.engine.writeDataPoint({
      blobs: ['quotation_created'],
      doubles: [amount],
      indexes: [userId],
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

**Trade-offs**：

- ✅ 完全免費
- ✅ 原生整合，無需額外配置
- ✅ 低開銷
- ⚠️ 功能較第三方服務簡單（但足夠使用）

---

## CI/CD Pipeline

### GitHub Actions 工作流程

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    - checkout
    - setup-node (Node 20)
    - install pnpm
    - pnpm install --frozen-lockfile
    - pnpm run lint
    - tsc --noEmit
    - pnpm run build
    - [PR] cloudflare/wrangler-action@v3 (preview)
    - [main] cloudflare/wrangler-action@v3 (production)
```

**關鍵點**：

1. **PR 預覽環境**：每個 PR 自動建立預覽環境，測試無誤後再合併
2. **自動化測試**：Lint + Type Check 確保程式碼品質
3. **快速部署**：從 push 到部署完成約 3-5 分鐘

---

## Security Considerations

### 1. 環境變數管理

| 類型 | 儲存位置 | 用途 |
|------|---------|------|
| GitHub Secrets | GitHub Repository Settings | CI/CD 使用（CLOUDFLARE_API_TOKEN） |
| Cloudflare Secrets | wrangler secret | 生產環境變數（DATABASE_URL、RESEND_API_KEY） |
| .dev.vars | 本地（.gitignore） | 本地開發環境變數 |

**安全措施**：

- ✅ 所有敏感資料使用環境變數，絕不 commit 到 Git
- ✅ `.dev.vars` 已加入 `.gitignore`
- ✅ 使用 `wrangler secret` 加密儲存生產環境變數

### 2. 認證安全

| 機制 | 實作方式 |
|------|---------|
| Email 驗證 | Supabase Auth 強制 Email 驗證 |
| 密碼強度 | Supabase Auth 內建密碼強度檢查 |
| Rate Limiting | KV 實作登入 Rate Limiting |
| Session 管理 | Supabase SSR cookies（HttpOnly、Secure） |
| OAuth | Supabase Auth 原生支援 |

### 3. 資料庫安全

- ✅ Supabase Row-Level Security (RLS) 確保資料隔離
- ✅ 使用 Pooler 避免直連資料庫
- ✅ 所有查詢使用參數化查詢（防 SQL Injection）

---

## Performance Optimization

### 1. 全球 CDN

- Cloudflare 300+ 節點
- 自動選擇最近的節點
- 預期 TTFB（Time to First Byte）< 100ms

### 2. KV 快取

- 匯率資料快取 24 小時
- 減少外部 API 呼叫 95%+
- 讀取延遲 < 5ms

### 3. Edge Runtime

- Next.js SSR 在邊緣執行
- 減少 Origin Server 負載
- 預期回應時間 < 200ms

---

## Cost Analysis

| 項目 | Vercel Pro | Cloudflare 免費 | 節省 |
|------|-----------|----------------|------|
| 基礎費用 | $20/月 | $0 | $20/月 |
| 請求數 | 100K/月（含） | 100K/日（免費） | - |
| Email 寄送 | 需整合第三方 | Resend 3000 封/月（免費） | - |
| 快取 | 需付費 | KV 免費 | - |
| Analytics | 需付費 | Workers Analytics 免費 | - |
| **總計** | **$20/月** | **$0/月** | **$240/年** |

---

## Rollback Strategy

### 如果需要回滾：

1. **Cloudflare Dashboard**：
   - 前往 Workers & Pages → quotation-system → Deployments
   - 選擇先前的部署版本
   - 點擊 "Rollback to this deployment"

2. **Wrangler CLI**：
   ```bash
   pnpm exec wrangler deployments list --name quotation-system
   pnpm exec wrangler rollback --version-id <version-id> --name quotation-system
   ```

3. **Git Revert**：
   ```bash
   git revert <commit-hash>
   git push origin main
   # GitHub Actions 自動部署舊版本
   ```

---

## Future Enhancements

### 短期（1 個月內）

- 自訂域名（Cloudflare DNS）
- WAF 規則（防 DDoS）
- 完整 Rate Limiting

### 中期（3 個月內）

- R2 檔案儲存（客戶簽名、附件）
- Cloudflare Images（圖片最佳化）
- 監控儀表板

### 長期（6 個月內）

- 多區域部署
- A/B Testing
- 進階快取策略（Stale-While-Revalidate）
