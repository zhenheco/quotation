# Cloudflare Tools Integration

整合 Cloudflare 免費工具（KV、Workers Analytics、Cron Triggers）以提升效能和監控能力。

---

## ADDED Requirements

### Requirement: KV 快取匯率資料

系統 MUST 使用 Cloudflare KV 快取匯率資料，減少外部 API 呼叫。

#### Scenario: 首次查詢匯率（無快取）

**Given** KV 中沒有今日匯率快取
**When** API 請求今日匯率（如 `/api/cron/exchange-rates`）
**Then** 系統應該：
- 檢查 KV key `rates:USD:2025-01-10`（格式：`rates:{currency}:{date}`）
- 發現無快取，呼叫外部 Exchange Rate API
- 取得匯率資料後，儲存到 KV（TTL: 24 小時）
- 回傳匯率資料給客戶端

#### Scenario: 查詢已快取的匯率

**Given** KV 中已有今日匯率快取
**When** API 請求今日匯率
**Then** 系統應該：
- 檢查 KV key `rates:USD:2025-01-10`
- 發現有快取，直接回傳快取資料（< 5ms）
- 不呼叫外部 API
- 減少回應時間 95%+

#### Scenario: 快取過期自動更新

**Given** KV 快取已超過 24 小時
**When** API 請求匯率
**Then** 系統應該：
- 檢查 KV key，發現快取已過期
- 重新呼叫外部 API 取得最新匯率
- 更新 KV 快取（新的 TTL: 24 小時）
- 回傳最新匯率資料

---

### Requirement: Rate Limiting 使用 KV

系統 MUST 使用 KV 實作 API Rate Limiting，防止濫用。

#### Scenario: 限制 API 請求頻率

**Given** 使用者從 IP `192.168.1.1` 發送請求
**When** 呼叫受保護的 API endpoint
**Then** 系統應該：
- 檢查 KV key `ratelimit:192.168.1.1`
- 如果 1 分鐘內請求次數 < 60，允許請求並遞增計數
- 如果請求次數 >= 60，回傳 `429 Too Many Requests`
- 設定 KV TTL 為 60 秒（1 分鐘後自動重設）

---

### Requirement: Workers Analytics 追蹤 API 使用

系統 MUST 使用 Workers Analytics 追蹤關鍵事件和效能指標。

#### Scenario: 追蹤報價單建立事件

**Given** 使用者成功建立報價單
**When** API 回應成功
**Then** 系統應該：
- 呼叫 `analytics.trackQuotationCreated(userId, amount)`
- 使用 `writeDataPoint()` 記錄事件
- 資料包含：事件類型（`quotation_created`）、金額（`doubles`）、使用者 ID（`indexes`）
- 在 Cloudflare Dashboard → Analytics 中顯示數據

#### Scenario: 追蹤郵件寄送狀態

**Given** 系統嘗試寄送報價單郵件
**When** 郵件寄送完成（成功或失敗）
**Then** 系統應該：
- 呼叫 `analytics.trackEmailSent(quotationId, status)`
- 記錄郵件寄送狀態（`success` 或 `failed`）
- 在 Analytics 中追蹤郵件成功率

#### Scenario: 追蹤 API 回應時間

**Given** API 處理請求
**When** 請求完成
**Then** 系統應該：
- 計算請求處理時間（`Date.now() - start`）
- 呼叫 `analytics.trackAPIRequest(endpoint, duration)`
- 記錄 endpoint 和處理時間
- 在 Analytics 中分析 API 效能

---

### Requirement: Cron Triggers 自動同步匯率

系統 MUST 使用 Cloudflare Cron Triggers 每日自動同步匯率。

#### Scenario: 每日午夜 UTC 同步匯率

**Given** 設定 Cron Trigger 為 `"0 0 * * *"`（每日午夜 UTC）
**When** Cron Trigger 觸發
**Then** 系統應該：
- 執行 `/api/cron/exchange-rates` endpoint
- 呼叫外部 Exchange Rate API 取得最新匯率
- 更新 KV 快取
- 記錄 Analytics 事件（`exchange_rate_sync`）
- 如果失敗，在日誌中記錄錯誤

#### Scenario: Cron 請求需要授權

**Given** Cron endpoint 需要防止未授權存取
**When** 請求 `/api/cron/exchange-rates`
**Then** 系統應該：
- 檢查 `Authorization` header 是否包含 `CRON_SECRET`
- 如果驗證失敗，回傳 `401 Unauthorized`
- 如果驗證成功，執行同步邏輯

---

### Requirement: （選用）Queues 非同步處理郵件

系統 MUST 支援使用 Cloudflare Queues 處理郵件寄送（選用功能），避免阻塞 API 回應。

#### Scenario: 推送郵件任務到 Queue

**Given** 報價單建立成功
**When** 需要寄送報價單郵件
**Then** 系統應該：
- 呼叫 `env.EMAIL_QUEUE.send({ type: 'send_quotation', data: { quotationId, recipientEmail } })`
- 立即回傳成功回應給客戶端（不等待郵件寄送完成）
- Queue Consumer 在背景處理郵件寄送

#### Scenario: Queue Consumer 處理郵件

**Given** Queue 中有待處理的郵件任務
**When** Queue Consumer 被觸發
**Then** 系統應該：
- 從 Queue 中讀取訊息
- 呼叫 Resend API 寄送郵件
- 如果成功，呼叫 `message.ack()` 確認處理完成
- 如果失敗，允許 Queue 自動重試（最多 3 次）

---

## Implementation Notes

### KV Helper

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

### Analytics Helper

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

### wrangler.jsonc 配置

```jsonc
{
  "triggers": {
    "crons": ["0 0 * * *"]  // 每日午夜 UTC 同步匯率
  },
  "analytics_engine_datasets": [
    {
      "binding": "ANALYTICS"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "your_kv_namespace_id",
      "preview_id": "your_preview_kv_namespace_id"
    }
  ]
}
```

### 建立 KV Namespace

```bash
# 生產環境
pnpm exec wrangler kv:namespace create "KV"

# 預覽環境
pnpm exec wrangler kv:namespace create "KV" --preview
```

### 驗證方式

- 測試匯率 API，確認 KV 快取運作正常
- 在 Cloudflare Dashboard 查看 Workers Analytics 數據
- 驗證 Cron Trigger 每日執行（可手動觸發測試）
- 測試 Rate Limiting（快速發送多個請求）
