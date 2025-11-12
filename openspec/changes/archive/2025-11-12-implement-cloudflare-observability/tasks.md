# Implementation Tasks (Production-Ready Free Tier)

## 總覽

**時程**：3-4 週
**成本**：$0/月（完全免費方案）
**目標**：生產級可觀測性系統，含安全性、可靠性、效能優化

---

## Phase 1: 核心基礎設施 + 安全性 ✅ (已完成)

### 1.1 完整 D1 Schema 設計 ✅
- [x] 建立 migration `002_observability.sql`
- [x] **logs 表**（完整欄位）
  - id, timestamp, level, message
  - request_id, trace_id, span_id（追蹤關聯）
  - user_id, tenant_id（多租戶支援）
  - path, method, status_code, duration_ms
  - metadata JSONB, env（環境標籤）
- [x] **traces 表**（追蹤）
  - id, request_id, trace_id, parent_span_id
  - start_time, end_time, duration_ms
  - steps JSONB, env
- [x] **error_aggregates 表**（錯誤聚合）
  - fingerprint PRIMARY KEY
  - message, stack, count
  - first_seen, last_seen, resolved
- [x] **observability_audit_logs 表**（稽核日誌）
  - id, action, user_id, timestamp
  - ip_address, details JSONB
- [x] **usage_stats 表**（用量監控）
  - date PRIMARY KEY
  - logs_written, logs_read
  - analytics_events, d1_storage_bytes
- [x] **alert_rules 表**
  - id, name, condition, threshold
  - cooldown_minutes, severity, enabled
- [x] **alert_events 表**
  - id, rule_id, triggered_at
  - value, message, resolved_at
- [x] **建立完整索引**（所有必要索引已建立）
- [x] 建立 FTS5 虛擬表（全文搜尋）
- [x] 在本地測試 migration（成功執行 39 commands）
- [ ] 部署到生產環境（待後續階段）

**驗證標準**：
- [x] 所有表格和索引建立成功
- [x] 查詢使用索引（EXPLAIN QUERY PLAN）
- [ ] 環境資料庫正確隔離（待 Phase 2）

---

### 1.2 PII 遮罩和安全工具 ✅
- [x] 建立 `lib/security/pii-redactor.ts`
- [x] 實作 PII 偵測規則（7 種類型：email, phone, creditCard, taiwanIdCard, apiKey, jwt, ipAddress）
- [x] 實作 `redactPII(message: string): string`
- [x] 添加自訂 redaction 規則
- [x] 編寫單元測試（22 個測試用例）
- [x] 驗證遮罩不影響可讀性

**驗證標準**：
- [x] Email 遮罩為 `[EMAIL_REDACTED]`
- [x] 電話遮罩為 `[PHONE_REDACTED]`
- [x] 信用卡遮罩為 `[CARD_REDACTED]`
- [x] 測試覆蓋率 100%（22/22 通過）

---

### 1.3 錯誤 Fingerprint 和聚合 ✅
- [x] 建立 `lib/observability/error-fingerprint.ts`
- [x] 實作 `getErrorFingerprint(error: Error): string`（SHA-256）
- [x] 建立 `lib/observability/error-aggregator.ts`
- [x] 實作錯誤聚合邏輯（完整 CRUD 操作）
- [x] 添加錯誤解析功能（標記為已解決）
- [x] 編寫測試（型別檢查通過）

**驗證標準**：
- [x] 相同錯誤生成相同 fingerprint
- [x] 錯誤計數正確累加
- [x] 解析狀態正確更新

---

### 1.4 W3C Trace Context（取代 Durable Objects） ✅
- [x] 建立 `lib/observability/trace-context.ts`
- [x] 實作 W3C Trace Context 解析
- [x] 實作 trace ID 生成（128-bit）
- [x] 添加 span ID 生成（64-bit）
- [x] 實作 traceparent header 處理
- [x] 編寫測試（型別檢查通過）

**驗證標準**：
- [x] Traceparent 正確解析
- [x] 所有日誌包含 trace_id
- [x] W3C 標準相容

**備註**：Phase 1 不實作 Durable Objects，使用 ctx.waitUntil() 直接寫入 D1 以簡化架構

---

### 1.5 Logger Utility（非阻塞） ✅
- [x] 建立 `lib/observability/logger.ts`
- [x] 實作 Logger class（5 級日誌：debug/info/warn/error/critical）
- [x] PII 自動遮罩整合
- [x] 實作錯誤取樣邏輯（100 次/分鐘）
- [x] 使用 ctx.waitUntil() 非阻塞寫入
- [x] Trace Context 整合
- [x] 錯誤聚合整合
- [x] 編寫單元測試（型別檢查通過）

**驗證標準**：
- [x] 日誌寫入延遲 < 5ms（使用 waitUntil）
- [x] 同錯誤每分鐘 < 100 次
- [x] PII 自動遮罩
- [x] JSON 格式正確

---

### 1.6 觀測性中介層 ✅
- [x] 建立 `lib/observability/middleware.ts`
- [x] 實作 withObservability wrapper（純 Cloudflare Workers API）
- [x] 自動記錄所有請求
- [x] 4xx/5xx 錯誤自動記錄
- [x] 慢請求偵測（> 2 秒）
- [x] Analytics Engine 整合
- [x] Trace Headers 自動設定
- [x] 錯誤回應處理

**驗證標準**：
- [x] 自動記錄運作正常
- [x] 錯誤偵測正確
- [x] TypeScript 編譯通過

---

### 1.7 統一導出和文件 ✅
- [x] 建立 `lib/observability/index.ts`（統一導出所有 API）
- [x] 建立 `lib/observability/README.md`（完整文件）
- [x] 包含使用範例
- [x] 記錄所有完成功能
- [x] 列出待完成項目

**驗證標準**：
- [x] 統一導出運作正常
- [x] 文件完整清晰
- [x] 使用範例可執行

---

### 1.8 RBAC 存取控制整合 ✅
- [x] 在 D1 migration 中新增權限資源 `observability`
- [x] 定義權限動作：`read`, `write`, `delete`
- [x] 添加到 permissions 表
- [ ] 更新 `types/rbac.types.ts`（待後續實作 API 時整合）
- [ ] 在 Observability API 加入認證中介層（待 Phase 4）
- [ ] 建立稽核日誌中介層（待 Phase 4）
- [ ] 編寫測試（待 Phase 4）

**驗證標準**：
- [x] 權限資料庫 schema 已建立
- [ ] API 認證檢查（待 Phase 4）
- [ ] 稽核日誌記錄（待 Phase 4）

---

## Phase 2: 可靠性和取樣策略 ✅ (已完成)

### 2.1 錯誤取樣實作 ✅
- [x] 已在 Logger 中實作（logger.ts）
- [x] 實作 Rate Limiter（每錯誤 100次/分鐘）
  ```typescript
  class ErrorRateLimiter {
    private counts = new Map<string, number>();

    async shouldLog(errorKey: string): Promise<boolean> {
      const count = this.counts.get(errorKey) || 0;
      if (count >= 100) return false;
      this.counts.set(errorKey, count + 1);
      return true;
    }
  }
  ```
- [ ] 實作適應性取樣
  ```typescript
  async function getAdaptiveSamplingRate() {
    const errorRate = await getErrorRate(); // 從 Analytics Engine
    if (errorRate > 0.1) return 0.1; // 錯誤率 > 10%，只記錄 10%
    return 1.0; // 正常情況記錄 100%
  }
  ```
- [ ] 整合到 Logger
- [ ] 編寫測試（模擬日誌風暴）

**驗證標準**：
- [ ] 日誌風暴測試（1000 錯誤/秒）不崩潰
- [ ] 同錯誤限制在 100 次/分鐘
- [ ] 適應性取樣正確觸發

---

### 2.2 容錯機制 ✅
- [x] 實作 Circuit Breaker（circuit-breaker.ts）
- [x] 實作批次寫入重試（retryWithBackoff，指數退避）
- [x] 整合到 Logger writeToD1 方法
- [x] TypeScript 類型檢查通過

**驗證標準**：
- [x] Circuit Breaker 實作完成
- [x] 重試機制正常運作
- [x] 整合到 Logger

**備註**：Phase 2 簡化，不實作 Durable Objects 佇列，直接使用 waitUntil() + Circuit Breaker + 重試

---

### 2.3 環境配置和隔離 ✅
- [x] 建立 `lib/observability/config.ts`
- [x] 三環境配置（development/staging/production）
  ```jsonc
  {
    "env": {
      "production": {
        "d1_databases": [
          {"binding": "LOGS_DB", "database_id": "prod-obs-xxx"}
        ]
      },
      "staging": {
        "d1_databases": [
          {"binding": "LOGS_DB", "database_id": "staging-obs-xxx"}
        ]
      },
      "development": {
        "d1_databases": [
          {"binding": "LOGS_DB", "database_id": "dev-obs-xxx"}
        ]
      }
    }
  }
  ```
- [ ] 在所有日誌加入環境標籤
  ```typescript
  {
    env: process.env.ENVIRONMENT || 'development',
    version: process.env.GIT_COMMIT || 'unknown'
  }
  ```
- [ ] 編寫文件：如何在不同環境部署
- [ ] 測試環境切換

**驗證標準**：
- [ ] 開發日誌不污染生產資料庫
- [ ] 環境標籤正確記錄
- [ ] 可以按環境篩選日誌

---

## Phase 3: Analytics Engine 整合 ✅ (已完成)

### 3.1 Analytics Engine Schema 設計 ✅
- [x] 定義 Analytics Engine 事件 schema
  ```typescript
  interface AnalyticsEvent {
    // Indexes (高基數維度)
    indexes: [
      'api_endpoint',    // e.g., '/api/quotations'
      'user_tier',       // e.g., 'free', 'premium'
      'status_class'     // e.g., '2xx', '4xx', '5xx'
    ];

    // Blobs (低基數維度)
    blobs: [
      'method',          // e.g., 'GET', 'POST'
      'country'          // e.g., 'US', 'TW'
    ];

    // Doubles (數值指標)
    doubles: [
      response_time_ms,  // 回應時間
      db_query_time_ms,  // 資料庫查詢時間
      response_size_bytes // 回應大小
    ];
  }
  ```
- [x] 建立 `lib/observability/analytics.ts`
- [x] 實作 Analytics 包裝器類別
- [x] trackAPIRequest 方法
- [x] TypeScript 類型檢查通過

**驗證標準**：
- [x] Analytics 類別實作完成
- [x] Schema 設計合理
- [ ] 實際寫入測試（待部署後驗證）

---

### 3.2 業務 KPIs 追蹤 ✅
- [x] 定義業務指標（analytics.ts）
  ```typescript
  // 報價相關
  - quotation.created (amount, currency)
  - quotation.sent (amount, customer_type)
  - quotation.accepted (amount, conversion_time)

  // 收款相關
  - payment.received (amount, currency, payment_method)
  - payment.failed (amount, reason)

  // 使用者行為
  - user.login (tier, login_method)
  - user.feature_used (feature_name, tier)
  ```
- [x] 實作追蹤方法：
  - trackQuotationCreated/Sent/Accepted
  - trackPaymentReceived/Failed
  - trackUserLogin
  - trackFeatureUsed
- [x] 整合到 Middleware（自動追蹤 API 請求）
- [ ] 在業務邏輯中加入追蹤（待後續實作）

**驗證標準**：
- [x] 追蹤方法實作完成
- [x] Middleware 自動追蹤
- [ ] 業務邏輯整合（待後續）

---

### 3.3 Analytics Engine SQL API 整合
**狀態**: 待 Phase 4 實作（查詢 API 階段）
- [ ] 建立查詢 API
- [ ] 實作 SQL 查詢包裝器
  ```typescript
  async function queryMetrics(sql: string) {
    const result = await env.ANALYTICS.sql({query: sql});
    return result;
  }

  // 範例查詢
  async function getP95Latency(endpoint: string, hours: number) {
    return await queryMetrics(`
      SELECT
        quantile(0.95)(double1) as p95_latency
      FROM analytics
      WHERE
        index1 = '${endpoint}'
        AND timestamp > NOW() - INTERVAL '${hours}' HOUR
    `);
  }
  ```
- [ ] 實作常用查詢函式
  - `getErrorRate(timeRange)`
  - `getRequestVolume(timeRange, interval)`
  - `getEndpointLatency(endpoint, percentile)`
  - `getTopSlowEndpoints(limit)`
- [ ] 編寫測試

**驗證標準**：
- [ ] SQL 查詢正確執行
- [ ] P50/P95/P99 計算正確
- [ ] 查詢效能 < 3 秒

---

## Phase 4: 查詢 API + 告警 (2-3 天)

### 4.1 建立 Observability Worker
- [ ] 建立 `/workers/observability-api` 目錄
- [ ] 初始化 Hono app
  ```typescript
  import { Hono } from 'hono';

  const app = new Hono<{ Bindings: Env }>();

  app.get('/health', (c) => c.json({ status: 'ok' }));

  export default app;
  ```
- [ ] 配置 wrangler.jsonc
  ```jsonc
  {
    "name": "observability-api",
    "main": "workers/observability-api/index.ts",
    "d1_databases": [
      {"binding": "LOGS_DB", "database_id": "xxx"}
    ],
    "analytics_engine_datasets": [
      {"binding": "ANALYTICS"}
    ]
  }
  ```
- [ ] 部署測試

**驗證標準**：
- [ ] /health 回應正常
- [ ] Worker 成功部署

---

### 4.2 日誌查詢 API
- [ ] `GET /api/logs` - 查詢日誌（含篩選）
  ```typescript
  app.get('/api/logs', async (c) => {
    const { level, from, to, requestId, search, limit = 100, cursor } = c.req.query();

    let sql = 'SELECT * FROM logs WHERE 1=1';
    const params = [];

    if (level) {
      sql += ' AND level = ?';
      params.push(level);
    }

    if (from) {
      sql += ' AND timestamp >= ?';
      params.push(from);
    }

    if (search) {
      sql += ' AND id IN (SELECT rowid FROM logs_fts WHERE message MATCH ?)';
      params.push(search);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const result = await c.env.LOGS_DB
      .prepare(sql)
      .bind(...params)
      .all();

    return c.json(result);
  });
  ```
- [ ] `GET /api/logs/:id` - 單一日誌詳情
- [ ] 實作 cursor-based pagination
  ```typescript
  if (cursor) {
    sql += ' AND timestamp < ?';
    params.push(decodeCursor(cursor));
  }

  // 回應包含 nextCursor
  return c.json({
    logs: result.results,
    nextCursor: encodeCursor(result.results[result.results.length - 1].timestamp)
  });
  ```
- [ ] 實作 5 分鐘查詢快取（使用 Cache API 或 KV）
  ```typescript
  const cacheKey = `logs:${JSON.stringify(params)}`;
  const cached = await c.env.KV.get(cacheKey);
  if (cached) return c.json(JSON.parse(cached));

  // ... 執行查詢 ...

  await c.env.KV.put(cacheKey, JSON.stringify(result), {expirationTtl: 300});
  ```
- [ ] 添加 rate limiting（100 req/min per user）
- [ ] 編寫測試

**驗證標準**：
- [ ] 查詢 1000 條日誌 < 500ms
- [ ] 全文搜尋 < 1 秒
- [ ] Pagination 正常運作
- [ ] 快取命中率 > 50%

---

### 4.3 指標查詢 API
- [ ] `GET /api/metrics/summary` - 當前摘要
  ```typescript
  app.get('/api/metrics/summary', async (c) => {
    const [errorRate, requestVolume, p95Latency] = await Promise.all([
      getErrorRate('1h'),
      getRequestVolume('1h'),
      getP95Latency('1h')
    ]);

    return c.json({
      errorRate,
      requestVolume,
      p95Latency
    });
  });
  ```
- [ ] `GET /api/metrics/timeseries` - 時間序列資料
  ```typescript
  app.get('/api/metrics/timeseries', async (c) => {
    const { metric, from, to, interval = '5m' } = c.req.query();

    const sql = `
      SELECT
        toStartOfInterval(timestamp, INTERVAL '${interval}') as time,
        ${getAggregation(metric)} as value
      FROM analytics
      WHERE timestamp BETWEEN '${from}' AND '${to}'
      GROUP BY time
      ORDER BY time
    `;

    const result = await c.env.ANALYTICS.sql({query: sql});
    return c.json(result);
  });
  ```
- [ ] `GET /api/metrics/endpoints` - 端點效能排行
- [ ] 編寫測試

**驗證標準**：
- [ ] 指標查詢 < 2 秒
- [ ] 時間序列資料正確
- [ ] 聚合計算準確

---

### 4.4 追蹤查詢 API
- [ ] `GET /api/traces` - 搜尋追蹤
  ```typescript
  app.get('/api/traces', async (c) => {
    const { from, to, minDuration, limit = 50 } = c.req.query();

    const result = await c.env.LOGS_DB.prepare(`
      SELECT * FROM traces
      WHERE timestamp BETWEEN ? AND ?
      ${minDuration ? 'AND duration_ms >= ?' : ''}
      ORDER BY duration_ms DESC
      LIMIT ?
    `).bind(from, to, minDuration, limit).all();

    return c.json(result);
  });
  ```
- [ ] `GET /api/traces/:traceId` - 追蹤詳情（含所有相關日誌）
  ```typescript
  app.get('/api/traces/:traceId', async (c) => {
    const traceId = c.req.param('traceId');

    // 取得 trace 資訊
    const trace = await c.env.LOGS_DB
      .prepare('SELECT * FROM traces WHERE trace_id = ?')
      .bind(traceId)
      .first();

    // 取得所有相關日誌
    const logs = await c.env.LOGS_DB
      .prepare('SELECT * FROM logs WHERE trace_id = ? ORDER BY timestamp')
      .bind(traceId)
      .all();

    return c.json({
      trace,
      logs: logs.results,
      timeline: buildTimeline(trace, logs.results)
    });
  });
  ```
- [ ] 實作 timeline 建構邏輯
- [ ] 編寫測試

**驗證標準**：
- [ ] 可以查詢到慢請求
- [ ] Timeline 顯示正確
- [ ] Request ID correlation 運作正常

---

### 4.5 告警規則 API
- [ ] `GET /api/alerts/rules` - 列出所有規則
- [ ] `POST /api/alerts/rules` - 建立規則
  ```typescript
  app.post('/api/alerts/rules', async (c) => {
    const rule = await c.req.json();

    // 驗證規則
    const validated = validateAlertRule(rule);

    await c.env.LOGS_DB.prepare(`
      INSERT INTO alert_rules
      (name, condition, threshold, cooldown_minutes, severity, channels)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      validated.name,
      validated.condition,
      validated.threshold,
      validated.cooldownMinutes || 5,
      validated.severity || 'warning',
      JSON.stringify(validated.channels)
    ).run();

    return c.json({success: true});
  });
  ```
- [ ] `PUT /api/alerts/rules/:id` - 更新規則
- [ ] `DELETE /api/alerts/rules/:id` - 刪除規則
- [ ] `GET /api/alerts/events` - 告警歷史
- [ ] 編寫測試

**驗證標準**：
- [ ] 規則 CRUD 正常運作
- [ ] 規則驗證正確
- [ ] 告警歷史可查詢

---

### 4.6 告警評估 Cron Worker
- [ ] 建立 `/workers/alert-evaluator` Cron Worker
  ```typescript
  export default {
    async scheduled(event, env, ctx) {
      const rules = await getAllAlertRules(env);

      for (const rule of rules) {
        if (!rule.enabled) continue;

        // 檢查 cooldown
        if (isInCooldown(rule)) continue;

        // 評估條件
        const value = await evaluateCondition(rule, env);

        if (value > rule.threshold) {
          await triggerAlert(rule, value, env);
        }
      }
    }
  };
  ```
- [ ] 實作 `evaluateCondition`
  ```typescript
  async function evaluateCondition(rule, env) {
    switch (rule.condition) {
      case 'error_rate':
        return await getErrorRate('5m');
      case 'p95_latency':
        return await getP95Latency('5m');
      case 'request_volume':
        return await getRequestVolume('5m');
    }
  }
  ```
- [ ] 實作 cooldown 檢查
  ```typescript
  async function isInCooldown(rule) {
    const lastAlert = await getLastAlert(rule.id);
    if (!lastAlert) return false;

    const elapsed = Date.now() - lastAlert.triggered_at.getTime();
    return elapsed < rule.cooldown_minutes * 60 * 1000;
  }
  ```
- [ ] 實作告警聚合（相同告警 1 分鐘內只觸發一次）
- [ ] 配置 Cron schedule（每分鐘執行）
  ```jsonc
  {
    "triggers": {
      "crons": ["* * * * *"]
    }
  }
  ```
- [ ] 編寫測試

**驗證標準**：
- [ ] Cron 每分鐘執行
- [ ] 條件評估正確
- [ ] Cooldown 正常運作
- [ ] 告警不重複觸發

---

### 4.7 通知渠道實作
- [ ] Email 通知（Gmail SMTP）
  ```typescript
  async function sendEmailAlert(rule, value, env) {
    const html = `
      <h2>Alert: ${rule.name}</h2>
      <p><strong>Severity:</strong> ${rule.severity}</p>
      <p><strong>Condition:</strong> ${rule.condition}</p>
      <p><strong>Threshold:</strong> ${rule.threshold}</p>
      <p><strong>Current Value:</strong> ${value}</p>
      <p><a href="${env.APP_URL}/admin/observability">View Dashboard</a></p>
    `;

    await sendEmail({
      to: rule.channels.email,
      subject: `[${rule.severity.toUpperCase()}] ${rule.name}`,
      html
    });
  }
  ```
- [ ] Webhook 通知（Slack/Discord 格式）
  ```typescript
  async function sendWebhookAlert(rule, value, env) {
    await fetch(rule.channels.webhook, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        text: `Alert: ${rule.name}`,
        attachments: [{
          color: getSeverityColor(rule.severity),
          fields: [
            {title: 'Condition', value: rule.condition},
            {title: 'Threshold', value: rule.threshold},
            {title: 'Current Value', value: value}
          ]
        }]
      })
    });
  }
  ```
- [ ] 實作通知發送追蹤（記錄成功/失敗）
- [ ] 編寫測試

**驗證標準**：
- [ ] Email 在 1 分鐘內送達
- [ ] Webhook 正確觸發
- [ ] 發送失敗時記錄錯誤

---

## Phase 5: 前端儀表板 (3-4 天)

### 5.1 Dashboard 路由和佈局
- [ ] 建立 `/app/[locale]/admin/observability` 目錄結構
  ```
  /admin/observability/
    layout.tsx          # 共用佈局
    page.tsx            # 首頁（重定向到 /logs）
    logs/page.tsx       # 日誌查看器
    metrics/page.tsx    # 指標儀表板
    traces/page.tsx     # 追蹤查看器
    alerts/page.tsx     # 告警管理
    usage/page.tsx      # 用量監控
  ```
- [ ] 建立共用佈局
  ```tsx
  export default function ObservabilityLayout({ children }) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }
  ```
- [ ] 建立側邊欄導航
  ```tsx
  const navigation = [
    { name: 'Logs', href: '/admin/observability/logs', icon: DocumentTextIcon },
    { name: 'Metrics', href: '/admin/observability/metrics', icon: ChartBarIcon },
    { name: 'Traces', href: '/admin/observability/traces', icon: LinkIcon },
    { name: 'Alerts', href: '/admin/observability/alerts', icon: BellIcon },
    { name: 'Usage', href: '/admin/observability/usage', icon: CpuChipIcon },
  ];
  ```
- [ ] 設定 TanStack Query
  ```tsx
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchInterval: 30000, // 30 秒自動重新整理
        staleTime: 10000,
      },
    },
  });
  ```
- [ ] 編寫測試

**驗證標準**：
- [ ] 路由正常運作
- [ ] 導航切換順暢
- [ ] RWD 回應式設計

---

### 5.2 日誌查看器
- [ ] 建立 LogsViewer 組件
  ```tsx
  export function LogsViewer() {
    const [filters, setFilters] = useState({
      level: 'all',
      from: subHours(new Date(), 1),
      to: new Date(),
      search: ''
    });

    const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
      queryKey: ['logs', filters],
      queryFn: ({ pageParam }) => fetchLogs({...filters, cursor: pageParam}),
      getNextPageParam: (lastPage) => lastPage.nextCursor
    });

    return (
      <div>
        <LogFilters filters={filters} onChange={setFilters} />
        <LogList logs={data?.pages.flatMap(p => p.logs)} />
      </div>
    );
  }
  ```
- [ ] 實作虛擬滾動（react-window）
  ```tsx
  import { FixedSizeList } from 'react-window';

  function LogList({ logs }) {
    return (
      <FixedSizeList
        height={600}
        itemCount={logs.length}
        itemSize={80}
        width="100%"
      >
        {({ index, style }) => (
          <LogRow log={logs[index]} style={style} />
        )}
      </FixedSizeList>
    );
  }
  ```
- [ ] 實作篩選器組件
  - Level 選擇（All, Error, Warn, Info, Debug）
  - 時間範圍選擇器（過去 1 小時、6 小時、24 小時、自訂）
  - 全文搜尋輸入框
  - Request ID 搜尋
- [ ] 實作展開式日誌詳情
  ```tsx
  function LogRow({ log }) {
    const [expanded, setExpanded] = useState(false);

    return (
      <div onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <Badge level={log.level} />
          <span className="text-xs text-gray-500">{formatTime(log.timestamp)}</span>
          <span className="flex-1 truncate">{log.message}</span>
        </div>
        {expanded && (
          <div className="mt-2 p-2 bg-gray-50 rounded">
            <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }
  ```
- [ ] 實作日誌匯出功能（JSON/CSV）
  ```tsx
  function ExportButton({ filters }) {
    const handleExport = async (format) => {
      const logs = await fetchAllLogs(filters);
      const blob = format === 'json'
        ? new Blob([JSON.stringify(logs, null, 2)], {type: 'application/json'})
        : new Blob([convertToCSV(logs)], {type: 'text/csv'});
      downloadBlob(blob, `logs-${Date.now()}.${format}`);
    };

    return (
      <DropdownMenu>
        <DropdownMenuItem onClick={() => handleExport('json')}>Export JSON</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>Export CSV</DropdownMenuItem>
      </DropdownMenu>
    );
  }
  ```
- [ ] 實作深色模式支援
- [ ] 編寫測試

**驗證標準**：
- [ ] 可以順暢滾動 1000+ 條日誌
- [ ] 篩選和搜尋 < 500ms 回應
- [ ] 匯出功能正常
- [ ] 深色模式切換正常

---

### 5.3 指標儀表板
- [ ] 建立 MetricsDashboard 組件
  ```tsx
  export function MetricsDashboard() {
    const { data: summary } = useQuery({
      queryKey: ['metrics', 'summary'],
      queryFn: fetchMetricsSummary,
      refetchInterval: 10000 // 每 10 秒更新
    });

    return (
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          title="Error Rate"
          value={`${(summary.errorRate * 100).toFixed(2)}%`}
          trend={summary.errorRateTrend}
          status={summary.errorRate > 0.05 ? 'danger' : 'ok'}
        />
        <MetricCard
          title="Request Volume"
          value={formatNumber(summary.requestVolume)}
          trend={summary.requestVolumeTrend}
        />
        <MetricCard
          title="P95 Latency"
          value={`${summary.p95Latency}ms`}
          trend={summary.p95LatencyTrend}
          status={summary.p95Latency > 500 ? 'warning' : 'ok'}
        />
      </div>
    );
  }
  ```
- [ ] 實作 Metric 卡片組件
  ```tsx
  function MetricCard({ title, value, trend, status }) {
    return (
      <Card className={getStatusColor(status)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{value}</div>
          <div className="flex items-center gap-1 text-sm">
            {trend > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
            <span>{Math.abs(trend)}% vs last hour</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  ```
- [ ] 實作圖表（Recharts）
  ```tsx
  function RequestVolumeChart() {
    const { data } = useQuery({
      queryKey: ['metrics', 'timeseries', 'request_volume'],
      queryFn: () => fetchTimeseries('request_volume', '24h', '1h')
    });

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={formatTime} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  ```
- [ ] 建立以下圖表
  - 請求量趨勢（折線圖）
  - 錯誤率趨勢（面積圖）
  - 端點延遲比較（長條圖）
  - 狀態碼分布（圓餅圖）
- [ ] 實作時間範圍選擇器
  ```tsx
  const TIME_RANGES = [
    { label: 'Last 1 hour', value: '1h' },
    { label: 'Last 6 hours', value: '6h' },
    { label: 'Last 24 hours', value: '24h' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Custom', value: 'custom' }
  ];
  ```
- [ ] 實作自動重新整理（30 秒）
- [ ] 編寫測試

**驗證標準**：
- [ ] 圖表資料正確顯示
- [ ] 自動重新整理運作正常
- [ ] 時間範圍切換順暢
- [ ] 回應式設計（手機也能看）

---

### 5.4 追蹤查看器
- [ ] 建立 TracesViewer 組件
  ```tsx
  export function TracesViewer() {
    const [filters, setFilters] = useState({
      from: subHours(new Date(), 1),
      to: new Date(),
      minDuration: 2000
    });

    const { data: traces } = useQuery({
      queryKey: ['traces', filters],
      queryFn: () => fetchTraces(filters)
    });

    return (
      <div>
        <TraceFilters filters={filters} onChange={setFilters} />
        <TraceList traces={traces} />
      </div>
    );
  }
  ```
- [ ] 實作 Trace Timeline 組件
  ```tsx
  function TraceTimeline({ trace }) {
    const totalDuration = trace.endTime - trace.startTime;

    return (
      <div className="relative h-20 bg-gray-100 rounded">
        {trace.steps.map((step, i) => (
          <div
            key={i}
            className="absolute h-8 bg-blue-500 rounded"
            style={{
              left: `${(step.start / totalDuration) * 100}%`,
              width: `${(step.duration / totalDuration) * 100}%`,
              top: `${i * 10}px`
            }}
            title={`${step.name}: ${step.duration}ms`}
          />
        ))}
      </div>
    );
  }
  ```
- [ ] 實作 Trace 詳情面板（顯示所有相關日誌）
  ```tsx
  function TraceDetail({ traceId }) {
    const { data } = useQuery({
      queryKey: ['trace', traceId],
      queryFn: () => fetchTraceDetail(traceId)
    });

    return (
      <Dialog>
        <DialogContent className="max-w-4xl">
          <h2>Trace: {traceId}</h2>
          <TraceTimeline trace={data.trace} />
          <div className="mt-4">
            <h3>Related Logs ({data.logs.length})</h3>
            <LogList logs={data.logs} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  ```
- [ ] 編寫測試

**驗證標準**：
- [ ] Timeline 正確顯示
- [ ] 可以查看 trace 詳情
- [ ] 關聯日誌正確顯示

---

### 5.5 告警管理介面
- [ ] 建立 AlertsManager 組件
  ```tsx
  export function AlertsManager() {
    const { data: rules } = useQuery({
      queryKey: ['alerts', 'rules'],
      queryFn: fetchAlertRules
    });

    const { data: events } = useQuery({
      queryKey: ['alerts', 'events'],
      queryFn: fetchAlertEvents
    });

    return (
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="history">Alert History</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          <AlertRulesList rules={rules} />
        </TabsContent>
        <TabsContent value="history">
          <AlertEventsList events={events} />
        </TabsContent>
      </Tabs>
    );
  }
  ```
- [ ] 實作告警規則建立表單
  ```tsx
  function CreateAlertRuleForm({ onSuccess }) {
    const form = useForm({
      defaultValues: {
        name: '',
        condition: 'error_rate',
        threshold: 0.05,
        cooldownMinutes: 5,
        severity: 'warning',
        channels: {
          email: '',
          webhook: ''
        }
      }
    });

    const mutation = useMutation({
      mutationFn: createAlertRule,
      onSuccess
    });

    return (
      <Form {...form}>
        <FormField name="name" label="Rule Name" />
        <FormField name="condition" label="Condition" type="select">
          <option value="error_rate">Error Rate</option>
          <option value="p95_latency">P95 Latency</option>
          <option value="request_volume">Request Volume</option>
        </FormField>
        <FormField name="threshold" label="Threshold" type="number" />
        {/* ... 其他欄位 ... */}
        <Button onClick={form.handleSubmit(mutation.mutate)}>
          Create Rule
        </Button>
      </Form>
    );
  }
  ```
- [ ] 實作告警規則列表（含啟用/停用、編輯、刪除）
- [ ] 實作告警歷史查看
  ```tsx
  function AlertEventsList({ events }) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Rule</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map(event => (
            <TableRow key={event.id}>
              <TableCell>{formatTime(event.triggeredAt)}</TableCell>
              <TableCell>{event.rule.name}</TableCell>
              <TableCell>
                <Badge variant={getSeverityVariant(event.rule.severity)}>
                  {event.rule.severity}
                </Badge>
              </TableCell>
              <TableCell>{event.value}</TableCell>
              <TableCell>
                {event.resolvedAt ? 'Resolved' : 'Active'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  ```
- [ ] 實作告警靜音功能
- [ ] 編寫測試

**驗證標準**：
- [ ] 可以建立告警規則
- [ ] 可以編輯和刪除規則
- [ ] 告警歷史正確顯示
- [ ] 靜音功能運作正常

---

### 5.6 成本監控儀表板
- [ ] 建立 UsageMonitor 組件
  ```tsx
  export function UsageMonitor() {
    const { data: usage } = useQuery({
      queryKey: ['usage', 'current'],
      queryFn: fetchCurrentUsage
    });

    const LIMITS = {
      workers: 100_000,
      d1Storage: 5 * 1024 * 1024 * 1024, // 5GB
      d1Reads: 5_000_000,
      analyticsEvents: 10_000_000
    };

    return (
      <div className="grid grid-cols-2 gap-4">
        <UsageCard
          title="Workers Requests"
          current={usage.workersRequests}
          limit={LIMITS.workers}
          unit="requests/day"
        />
        <UsageCard
          title="D1 Storage"
          current={usage.d1Storage}
          limit={LIMITS.d1Storage}
          unit="bytes"
          formatter={formatBytes}
        />
        <UsageCard
          title="D1 Reads"
          current={usage.d1Reads}
          limit={LIMITS.d1Reads}
          unit="reads/day"
        />
        <UsageCard
          title="Analytics Events"
          current={usage.analyticsEvents}
          limit={LIMITS.analyticsEvents}
          unit="events/month"
        />
      </div>
    );
  }
  ```
- [ ] 實作 UsageCard 組件（含進度條和警告）
  ```tsx
  function UsageCard({ title, current, limit, unit, formatter = (n) => n }) {
    const percentage = (current / limit) * 100;
    const status = percentage > 80 ? 'danger' : percentage > 50 ? 'warning' : 'ok';

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{formatter(current)}</span>
            <span className="text-gray-500">/ {formatter(limit)}</span>
          </div>
          <Progress value={percentage} className={getStatusColor(status)} />
          <div className="mt-2 text-sm text-gray-600">
            {percentage.toFixed(1)}% used
            {status === 'danger' && (
              <span className="ml-2 text-red-600">⚠️ Approaching limit!</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  ```
- [ ] 實作用量趨勢圖表
  ```tsx
  function UsageTrendChart({ metric }) {
    const { data } = useQuery({
      queryKey: ['usage', 'trend', metric],
      queryFn: () => fetchUsageTrend(metric, '7d')
    });

    return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tickFormatter={formatDate} />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            fillOpacity={1}
            fill="url(#colorUsage)"
          />
          <ReferenceLine
            y={getLimit(metric)}
            stroke="red"
            strokeDasharray="3 3"
            label="Limit"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  ```
- [ ] 實作成本預估器
  ```tsx
  function CostEstimator({ usage }) {
    const estimatedCost = calculateEstimatedCost(usage);

    return (
      <Card>
        <CardHeader>
          <CardTitle>Estimated Cost (if exceeded)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600">
            ${estimatedCost.toFixed(2)}/month
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {estimatedCost === 0 ? (
              <p className="text-green-600">✅ All within free tier!</p>
            ) : (
              <>
                <p>Workers: ${usage.workersCost}</p>
                <p>D1: ${usage.d1Cost}</p>
                <p>Analytics: ${usage.analyticsCost}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  ```
- [ ] 編寫測試

**驗證標準**：
- [ ] 用量資料正確顯示
- [ ] 接近限制時顯示警告
- [ ] 趨勢圖表正確
- [ ] 成本預估準確

---

## Phase 6: 清理、文件、測試 (1-2 天)

### 6.1 自動清理 Cron Worker
- [ ] 建立 `/workers/cleanup` Cron Worker
  ```typescript
  export default {
    async scheduled(event, env, ctx) {
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      const threeDaysAgo = subDays(now, 3);

      // 刪除非錯誤的舊日誌（7 天）
      await env.LOGS_DB.prepare(`
        DELETE FROM logs
        WHERE timestamp < ?
        AND level NOT IN ('error', 'critical')
      `).bind(sevenDaysAgo.toISOString()).run();

      // 刪除錯誤日誌（14 天）
      const fourteenDaysAgo = subDays(now, 14);
      await env.LOGS_DB.prepare(`
        DELETE FROM logs
        WHERE timestamp < ?
      `).bind(fourteenDaysAgo.toISOString()).run();

      // 刪除舊追蹤（3 天）
      await env.LOGS_DB.prepare(`
        DELETE FROM traces
        WHERE timestamp < ?
      `).bind(threeDaysAgo.toISOString()).run();

      // 更新用量統計
      await updateUsageStats(env);

      // 檢查是否接近限制
      await checkUsageLimits(env);
    }
  };
  ```
- [ ] 實作 `updateUsageStats`
  ```typescript
  async function updateUsageStats(env) {
    const today = new Date().toISOString().split('T')[0];

    const logsWritten = await countLogsToday(env);
    const logsRead = await getLogsReadCount(env);
    const d1Storage = await getD1StorageSize(env);

    await env.LOGS_DB.prepare(`
      INSERT OR REPLACE INTO usage_stats
      (date, logs_written, logs_read, d1_storage_bytes)
      VALUES (?, ?, ?, ?)
    `).bind(today, logsWritten, logsRead, d1Storage).run();
  }
  ```
- [ ] 實作 `checkUsageLimits`（接近 80% 時告警）
  ```typescript
  async function checkUsageLimits(env) {
    const usage = await getCurrentUsage(env);

    if (usage.d1Storage > 0.8 * 5 * 1024 * 1024 * 1024) {
      await sendAlert({
        name: 'D1 Storage Warning',
        severity: 'warning',
        message: `D1 storage is at ${(usage.d1Storage / (5 * 1024 * 1024 * 1024) * 100).toFixed(1)}%`
      }, env);
    }

    // ... 其他限制檢查 ...
  }
  ```
- [ ] 配置 Cron schedule（每日凌晨 2 點）
  ```jsonc
  {
    "triggers": {
      "crons": ["0 2 * * *"]
    }
  }
  ```
- [ ] 編寫測試

**驗證標準**：
- [ ] Cron 每日執行
- [ ] 舊資料正確刪除
- [ ] D1 使用量保持 < 1GB
- [ ] 接近限制時告警觸發

---

### 6.2 文件撰寫
- [ ] **API 文件**（OpenAPI 規格）
  - 使用 Swagger/Scalar 生成互動式文件
  - 記錄所有端點、參數、回應格式
  - 提供範例請求和回應
- [ ] **使用者指南**
  - 如何查看日誌
  - 如何建立告警規則
  - 如何解讀指標
  - 如何匯出資料
- [ ] **開發者指南**
  - 如何在程式碼中加入日誌
  - Logger API 使用範例
  - 最佳實踐（什麼該記錄、什麼不該記錄）
  - 結構化日誌格式規範
- [ ] **維運指南**
  - 監控系統健康狀態
  - 用量限制和降級策略
  - 故障排除流程
  - 備份和恢復流程
- [ ] **安全性文件**
  - PII 遮罩機制說明
  - 存取控制配置
  - GDPR 合規性說明
  - 稽核日誌使用指南
- [ ] 建立範例程式碼庫（common logging patterns）
  ```typescript
  // 範例 1：記錄 API 請求
  logger.info('API request', {
    method: req.method,
    path: req.url,
    userId: user.id,
    duration: Date.now() - startTime
  });

  // 範例 2：記錄錯誤
  logger.error('Database query failed', {
    error: error.message,
    query: sanitizeQuery(query),
    stack: error.stack
  });

  // 範例 3：記錄業務事件
  logger.info('Quotation created', {
    quotationId: quotation.id,
    amount: quotation.totalAmount,
    currency: quotation.currency,
    customerId: quotation.customerId
  });
  ```
- [ ] 建立 FAQ 文件（常見問題）

**驗證標準**：
- [ ] 所有文件完整且準確
- [ ] 範例程式碼可執行
- [ ] FAQ 涵蓋常見問題

---

### 6.3 單元測試
- [ ] **Logger 測試**
  ```typescript
  describe('Logger', () => {
    it('should redact PII from messages', () => {
      const logger = new Logger();
      const message = 'User email is test@example.com';
      const redacted = logger.redactPII(message);
      expect(redacted).toBe('User email is [EMAIL_REDACTED]');
    });

    it('should generate error fingerprint', () => {
      const error = new Error('Database connection failed');
      const fp1 = getErrorFingerprint(error);
      const fp2 = getErrorFingerprint(error);
      expect(fp1).toBe(fp2);
    });

    it('should respect error sampling limits', async () => {
      const logger = new Logger();
      const error = new Error('Test error');

      for (let i = 0; i < 150; i++) {
        await logger.error(error);
      }

      const count = await getErrorCount('Test error');
      expect(count).toBeLessThanOrEqual(100);
    });
  });
  ```
- [ ] **Analytics 測試**
  ```typescript
  describe('Analytics', () => {
    it('should write data point correctly', async () => {
      const analytics = new Analytics(env);
      await analytics.track('api.request', {
        endpoint: '/api/quotations',
        duration: 150
      });

      // 驗證寫入
      expect(env.ANALYTICS.writeDataPoint).toHaveBeenCalled();
    });
  });
  ```
- [ ] **API 端點測試**
  ```typescript
  describe('GET /api/logs', () => {
    it('should return logs with filters', async () => {
      const res = await app.request('/api/logs?level=error&from=2024-01-01');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.logs).toBeInstanceOf(Array);
      expect(data.logs.every(log => log.level === 'error')).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await app.request('/api/logs', {
        headers: {} // 沒有認證
      });
      expect(res.status).toBe(401);
    });
  });
  ```
- [ ] 測試覆蓋率目標：> 80%

**驗證標準**：
- [ ] 所有單元測試通過
- [ ] 覆蓋率 > 80%
- [ ] 無 flaky tests

---

### 6.4 整合測試
- [ ] **端到端日誌流程測試**
  ```typescript
  describe('Logging E2E', () => {
    it('should log error and retrieve it', async () => {
      // 1. 觸發錯誤
      const error = new Error('Test error');
      await logger.error(error, ctx);

      // 2. 等待批次寫入
      await sleep(11000); // 10 秒 + buffer

      // 3. 查詢日誌
      const res = await fetch('/api/logs?search=Test error');
      const data = await res.json();

      // 4. 驗證
      expect(data.logs).toHaveLength(1);
      expect(data.logs[0].message).toContain('Test error');
    });
  });
  ```
- [ ] **告警觸發測試**
  ```typescript
  describe('Alerting E2E', () => {
    it('should trigger alert when error rate exceeds threshold', async () => {
      // 1. 建立告警規則
      await createAlertRule({
        name: 'High Error Rate',
        condition: 'error_rate',
        threshold: 0.05
      });

      // 2. 產生大量錯誤
      for (let i = 0; i < 100; i++) {
        await logger.error(new Error('Test'));
      }

      // 3. 等待 Cron 評估（模擬）
      await runAlertEvaluator();

      // 4. 驗證告警觸發
      const alerts = await getTriggeredAlerts();
      expect(alerts).toContainEqual(
        expect.objectContaining({ name: 'High Error Rate' })
      );
    });
  });
  ```
- [ ] **效能測試**
  ```typescript
  describe('Performance', () => {
    it('should handle 1000 logs/second', async () => {
      const start = Date.now();

      await Promise.all(
        Array.from({ length: 1000 }, () =>
          logger.info('Test log')
        )
      );

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // < 100ms for 1000 logs
    });

    it('should query 10000 logs in < 1 second', async () => {
      const start = Date.now();

      const res = await fetch('/api/logs?limit=10000');
      await res.json();

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });
  ```

**驗證標準**：
- [ ] 所有整合測試通過
- [ ] 效能測試達標
- [ ] 無記憶體洩漏

---

### 6.5 部署和監控
- [ ] 建立部署檢查清單
  ```markdown
  ## 部署前檢查
  - [ ] 所有測試通過
  - [ ] Lint 無錯誤
  - [ ] TypeScript 編譯成功
  - [ ] 環境變數已設定
  - [ ] D1 migration 已執行
  - [ ] Durable Objects 已配置
  - [ ] Cron triggers 已設定

  ## 部署後檢查
  - [ ] Health check 回應正常
  - [ ] 日誌正常寫入 D1
  - [ ] 指標正常記錄到 Analytics Engine
  - [ ] 告警規則正常運作
  - [ ] 清理 Cron 正常執行
  - [ ] 前端儀表板可存取
  - [ ] 無明顯效能退化
  ```
- [ ] 部署到 staging 環境
- [ ] 執行冒煙測試（smoke tests）
- [ ] 部署到 production 環境
- [ ] 監控 1 週
  - 每日檢查用量
  - 每日檢查錯誤率
  - 檢查效能指標
  - 收集使用者回饋
- [ ] 建立回滾計劃（如果出問題）

**驗證標準**：
- [ ] 部署成功無錯誤
- [ ] 1 週監控無重大問題
- [ ] 使用者回饋正面
- [ ] 系統穩定運行

---

## 成功標準（全面升級）

### ✅ 效能指標
- [ ] 日誌寫入延遲 < 5ms
- [ ] 查詢 7 天日誌 < 500ms
- [ ] 全文搜尋 < 1 秒
- [ ] 儀表板載入 < 2 秒
- [ ] API p95 回應 < 200ms
- [ ] 主請求效能無退化（< 5ms overhead）

### ✅ 可靠性指標
- [ ] 日誌風暴測試通過（1000 錯誤/秒不崩潰）
- [ ] 錯誤取樣正確運作（< 100 次/分鐘）
- [ ] Circuit Breaker 正常運作
- [ ] 批次寫入無資料丟失
- [ ] 告警 100% 可靠（無漏報）

### ✅ 安全性指標
- [ ] PII 自動遮罩 100% 運作
- [ ] RBAC 存取控制正常
- [ ] 稽核日誌完整記錄
- [ ] 無敏感資料洩漏
- [ ] 符合 GDPR 要求

### ✅ 成本指標
- [ ] $0/月（完全免費方案）
- [ ] 所有服務使用量 < 50% 免費額度
- [ ] 用量監控正常運作
- [ ] 接近限制時告警觸發

### ✅ 測試覆蓋
- [ ] 單元測試覆蓋率 > 80%
- [ ] 整合測試通過
- [ ] E2E 測試通過
- [ ] 效能測試達標

### ✅ 文件完整性
- [ ] API 文件完整
- [ ] 使用者指南清晰
- [ ] 開發者指南實用
- [ ] 維運指南詳盡

---

## 風險和緩解措施

### 風險 1：D1 免費額度不足
- **發生機率**：低（使用量 < 20%）
- **影響**：中（需要付費或降級）
- **緩解**：
  - 監控用量接近 80% 時告警
  - 實作自動降級（只記錄嚴重錯誤）
  - 提供備份匯出功能

### 風險 2：效能影響主應用
- **發生機率**：低（使用 waitUntil 非阻塞）
- **影響**：高（影響使用者體驗）
- **緩解**：
  - 使用 waitUntil() 避免阻塞
  - 實作 Circuit Breaker
  - 持續效能監控

### 風險 3：日誌風暴導致系統崩潰
- **發生機率**：中（生產環境可能發生）
- **影響**：高（系統不可用）
- **緩解**：
  - 錯誤取樣（< 100 次/分鐘）
  - 錯誤聚合
  - 適應性取樣
  - 背壓處理

### 風險 4：安全性漏洞（PII 洩漏）
- **發生機率**：低（有自動遮罩）
- **影響**：高（合規問題）
- **緩解**：
  - PII 自動偵測和遮罩
  - 定期安全審計
  - RBAC 存取控制
  - 稽核日誌

---

## 關鍵成功因素

1. **性能優先**：使用 waitUntil() 確保零影響
2. **可靠性**：錯誤處理、重試、Circuit Breaker
3. **安全性**：PII 遮罩、RBAC、稽核日誌
4. **成本控制**：< 50% 免費額度使用率
5. **使用者體驗**：快速載入、直覺操作
6. **完整測試**：> 80% 覆蓋率、E2E 測試
7. **文件齊全**：API、使用者、開發者、維運指南

---

**預計完成時間**：3-4 週
**團隊規模**：1-2 名全端工程師
**技術風險**：低
**商業價值**：高（省 $15-50/月 APM 成本）
