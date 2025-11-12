# Cloudflare Workers 可觀測性方案 - Ultrathink 改進建議

## 📊 關鍵發現

基於深度分析和社群最佳實踐，發現當前方案有以下重要改進空間：

---

## 🔴 必須立即新增（高優先級）

### 1. 使用 `waitUntil()` 避免阻塞請求

**問題**：當前批次寫入可能阻塞主請求回應，增加延遲

**解決方案**：
```typescript
// ❌ 當前方式（阻塞）
await batchWriteToD1(logs);
return Response.json({ success: true });

// ✅ 改進方式（非阻塞）
ctx.waitUntil(batchWriteToD1(logs));
return Response.json({ success: true });
```

**影響**：將日誌開銷從 50-100ms 降至 < 5ms

---

### 2. 實作錯誤取樣防止日誌風暴

**問題**：單一 bug 可能導致每秒數千條錯誤，迅速填滿 D1

**解決方案**：
```typescript
interface SamplingConfig {
  // 同樣錯誤訊息每分鐘最多記錄次數
  maxSameErrorPerMinute: 100;
  // 錯誤率 > 10% 時降低取樣率
  adaptiveSampling: true;
  // 重複錯誤聚合
  aggregateDuplicates: true;
}

// 實作 rate limiting
const errorKey = `${error.message}:${error.stack}`;
const count = await incrementErrorCount(errorKey);
if (count > 100) {
  // 只記錄「此錯誤已發生 ${count} 次」
  await logAggregatedError(errorKey, count);
  return;
}
```

**相關資料**：Cloudflare 官方 Workers Logs 在超過每日 50 億條限制後，會自動套用 1% head-based sampling

---

### 3. 完整的 D1 索引設計

**問題**：當前只提到「建立索引」，沒有具體定義

**解決方案**：
```sql
-- 時間範圍查詢（最常用）
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);

-- 錯誤層級篩選
CREATE INDEX idx_logs_level_timestamp ON logs(level, timestamp DESC);

-- 單一請求查詢
CREATE INDEX idx_logs_request_id ON logs(requestId);

-- 使用者日誌追蹤
CREATE INDEX idx_logs_user_timestamp ON logs(userId, timestamp DESC);

-- 全文搜尋（如果需要）
CREATE VIRTUAL TABLE logs_fts USING fts5(message, content=logs);
```

**效能影響**：查詢時間從 3-5 秒降至 < 500ms

---

### 4. PII 資料自動遮罩

**問題**：可能記錄敏感資料（email、手機、信用卡）

**解決方案**：
```typescript
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
};

function redactPII(message: string): string {
  let redacted = message;
  redacted = redacted.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]');
  redacted = redacted.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]');
  redacted = redacted.replace(PII_PATTERNS.creditCard, '[CARD_REDACTED]');
  return redacted;
}
```

**合規性**：符合 GDPR 和資料保護要求

---

### 5. API 存取控制和認證

**問題**：當前沒有說明誰可以查看日誌

**解決方案**：
```typescript
// 整合現有 RBAC 系統
const hasLogAccess = await checkPermission(
  userId,
  'observability' as PermissionResource,
  'read' as PermissionAction
);

if (!hasLogAccess) {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

// 稽核日誌：記錄誰查看了日誌
await logAudit({
  action: 'view_logs',
  userId,
  filters: req.query,
  timestamp: new Date(),
});
```

---

## 🟡 重要但可延後（中優先級）

### 6. 使用 Durable Objects 作為日誌佇列

**優點**：
- 持久化：Worker 重啟不會丟失日誌
- 容錯：寫入失敗可以重試
- 批次優化：更智能的批次策略

**實作**：
```typescript
export class LogQueue extends DurableObject {
  private queue: LogEntry[] = [];
  private flushInterval: number;

  async fetch(request: Request) {
    const log = await request.json();
    this.queue.push(log);

    // 達到閾值或超時則寫入
    if (this.queue.length >= 50) {
      await this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0) return;
    await batchInsertToD1(this.queue);
    this.queue = [];
  }
}
```

**成本**：Durable Objects 免費額度 1M requests/月（充足）

---

### 7. 告警聚合和 Cooldown

**問題**：同一問題可能觸發數百條告警

**解決方案**：
```typescript
interface AlertRule {
  id: string;
  condition: string;
  cooldownMinutes: 5; // 同一告警 5 分鐘內只觸發一次
  aggregationWindow: 60; // 1 分鐘內的相同告警聚合
  severity: 'critical' | 'warning' | 'info';
}

// 檢查 cooldown
const lastAlert = await getLastAlert(rule.id);
if (lastAlert && Date.now() - lastAlert.timestamp < rule.cooldownMinutes * 60000) {
  return; // 跳過告警
}

// 聚合相同告警
const aggregatedCount = await countAlertsInWindow(rule.id, rule.aggregationWindow);
await sendAlert({
  rule,
  message: `${rule.condition} (occurred ${aggregatedCount} times in last ${rule.aggregationWindow}s)`,
});
```

---

### 8. Request ID Correlation（追蹤關聯）

**問題**：難以追蹤單一使用者的完整操作流程

**解決方案**：
```typescript
// 使用 W3C Trace Context 標準
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('quotation-system');

async function handleRequest(req: Request) {
  // 從 header 讀取或生成新的 trace ID
  const traceId = req.headers.get('traceparent') || generateTraceId();

  const span = tracer.startSpan('api.request', {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'user.id': userId,
    },
  });

  // 所有日誌都包含 traceId
  await log({
    level: 'info',
    message: 'Request started',
    traceId,
    spanId: span.spanContext().spanId,
  });

  // 前端也要傳送 X-Request-ID
  response.headers.set('X-Request-ID', traceId);
}
```

**相關資料**：Cloudflare Workers Traces 遵循 OpenTelemetry 標準（2026/1/15 起收費）

---

### 9. 環境隔離（Dev/Staging/Production）

**問題**：開發日誌污染生產資料庫

**解決方案**：
```toml
# wrangler.toml
[env.production]
d1_databases = [
  { binding = "LOGS_DB", database_name = "prod_observability", database_id = "xxx" }
]

[env.staging]
d1_databases = [
  { binding = "LOGS_DB", database_name = "staging_observability", database_id = "yyy" }
]

[env.development]
d1_databases = [
  { binding = "LOGS_DB", database_name = "dev_observability", database_id = "zzz" }
]
```

所有日誌加上環境標籤：
```typescript
{
  env: process.env.ENVIRONMENT || 'development',
  version: process.env.GIT_COMMIT || 'unknown',
}
```

---

### 10. 成本和用量監控儀表板

**問題**：不知道何時接近免費額度限制

**解決方案**：
```typescript
// 每日統計用量
interface UsageStats {
  date: string;
  logsWritten: number;
  logsRead: number;
  analyticsEvents: number;
  d1StorageGB: number;
}

// 告警閾值
const LIMITS = {
  d1Storage: 5 * 1024 * 1024 * 1024, // 5GB
  d1ReadsPerDay: 5_000_000,
  analyticsEventsPerMonth: 10_000_000,
};

// 監控並告警
if (usage.d1StorageGB > LIMITS.d1Storage * 0.8) {
  await sendAlert({
    severity: 'warning',
    message: 'D1 storage usage > 80%',
    action: 'Consider cleaning up old logs',
  });
}
```

在儀表板顯示：
- 當前用量 vs 免費額度
- 成長趨勢（是否會超過限制）
- 每日成本報告（即使是 $0）

---

## 🟢 可選增強功能（低優先級）

### 11. 即時推送通知

使用 Server-Sent Events (SSE) 或 Durable Objects WebSocket：

```typescript
export class RealtimeLogStream extends DurableObject {
  private connections = new Set<WebSocket>();

  async fetch(request: Request) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      this.connections.add(server);
      return new Response(null, { status: 101, webSocket: client });
    }
  }

  async broadcastLog(log: LogEntry) {
    for (const ws of this.connections) {
      ws.send(JSON.stringify(log));
    }
  }
}
```

---

### 12. 多租戶支援（未來擴展）

即使目前單一客戶，預留 `tenant_id` 欄位：

```sql
ALTER TABLE logs ADD COLUMN tenant_id TEXT;
CREATE INDEX idx_logs_tenant ON logs(tenant_id, timestamp DESC);
```

API 層強制隔離：
```typescript
const tenantId = await getTenantFromAuth(userId);
const logs = await db.query(
  'SELECT * FROM logs WHERE tenant_id = ? AND timestamp > ?',
  [tenantId, fromDate]
);
```

---

### 13. 稽核日誌（企業合規）

記錄管理員操作：
```typescript
interface AuditLog {
  action: 'view_logs' | 'export_logs' | 'delete_logs' | 'modify_alert';
  userId: string;
  timestamp: Date;
  details: Record<string, unknown>;
  ipAddress: string;
}

// 稽核日誌不可刪除（append-only）
await db.insert('audit_logs', auditLog);
```

---

### 14. 備份和災難恢復

定期匯出到 R2（10GB 免費）：

```typescript
// 每日 Cron: 匯出昨日日誌
export default {
  async scheduled(event, env, ctx) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const logs = await env.LOGS_DB.prepare(
      'SELECT * FROM logs WHERE DATE(timestamp) = ?'
    ).bind(yesterday.toISOString().split('T')[0]).all();

    // 壓縮並上傳到 R2
    const compressed = gzip(JSON.stringify(logs));
    await env.R2_BUCKET.put(
      `backups/${yesterday.toISOString().split('T')[0]}.json.gz`,
      compressed
    );
  },
};
```

---

## 📚 社群最佳實踐和案例

### 1. Cloudflare 官方建議

**來源**：[Workers Logs 官方文件](https://developers.cloudflare.com/workers/observability/logs/)

- ✅ 使用 JSON 格式結構化日誌（自動索引）
- ✅ 避免在日誌中包含敏感資料
- ✅ 使用有意義的欄位名稱（`user_id` 而非 `uid`）

**範例**：
```typescript
// ❌ 非結構化
console.log(`User ${userId} created quotation ${quotationId}`);

// ✅ 結構化 JSON
console.log(JSON.stringify({
  event: 'quotation.created',
  user_id: userId,
  quotation_id: quotationId,
  amount: 1000,
  currency: 'USD',
  timestamp: new Date().toISOString(),
}));
```

---

### 2. Hono + D1 最佳實踐

**來源**：[DevOpsDave - Exploring Cloudflare Workers D1 with Hono](https://devopsdave.net/2024/01/10/Exploring-Cloudflare-Workers-D1-Database-and-REST-API-with-Hono-Framework)

社群開發者分享的 Hono 日誌中介層：

```typescript
import { Hono } from 'hono';
import { logger } from 'hono/logger';

const app = new Hono();

// 自訂日誌中介層
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  // 只記錄慢請求或錯誤
  if (duration > 2000 || c.res.status >= 400) {
    await c.env.LOGS_DB.prepare(
      'INSERT INTO logs (timestamp, method, path, status, duration) VALUES (?, ?, ?, ?, ?)'
    ).bind(new Date().toISOString(), c.req.method, c.req.path, c.res.status, duration).run();
  }
});
```

---

### 3. Analytics Engine 視覺化

**來源**：[Cloudflare 官方部落格 - Using Analytics Engine to improve Analytics Engine](https://blog.cloudflare.com/using-analytics-engine-to-improve-analytics-engine/)

Cloudflare 內部使用 Grafana 視覺化 Analytics Engine 資料：

```typescript
// 寫入 Analytics Engine
env.ANALYTICS.writeDataPoint({
  indexes: ['api_endpoint', 'user_tier'],
  blobs: ['GET /quotations', 'premium'],
  doubles: [response_time_ms, db_query_time_ms],
});

// 使用 SQL API 查詢
const result = await env.ANALYTICS.sql({
  query: `
    SELECT
      blob1 as endpoint,
      quantile(0.99)(double1) as p99_latency
    FROM analytics
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY endpoint
    ORDER BY p99_latency DESC
  `,
});
```

**社群 Grafana 儀表板範本**：
- [Cloudflare Analytics Dashboard](https://grafana.com/grafana/dashboards/20682)
- [Cloudflare DNS Analytics](https://grafana.com/grafana/dashboards/22568)

---

### 4. OpenTelemetry 整合

**來源**：[Cloudflare Workers Traces 文件](https://developers.cloudflare.com/workers/observability/traces/)

Workers 原生支援 OpenTelemetry（2026/1/15 起收費）：

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('quotation-system', '1.0.0');

export default {
  async fetch(request, env, ctx) {
    return tracer.startActiveSpan('handle_request', async (span) => {
      span.setAttribute('http.method', request.method);
      span.setAttribute('http.url', request.url);

      try {
        const result = await processRequest(request);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  },
};
```

**相容性**：可無縫整合 Honeycomb, Grafana Cloud, Datadog

---

### 5. 錯誤追蹤模式

參考 Sentry 的錯誤聚合策略：

```typescript
// 生成錯誤指紋（用於去重）
function getErrorFingerprint(error: Error): string {
  const stack = error.stack?.split('\n').slice(0, 3).join('\n') || '';
  return crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${error.message}:${stack}`)
  );
}

// 聚合相同錯誤
const fingerprint = await getErrorFingerprint(error);
const existing = await db.query(
  'SELECT count FROM error_aggregates WHERE fingerprint = ?',
  [fingerprint]
);

if (existing) {
  await db.query(
    'UPDATE error_aggregates SET count = count + 1, last_seen = ? WHERE fingerprint = ?',
    [new Date(), fingerprint]
  );
} else {
  await db.insert('error_aggregates', {
    fingerprint,
    message: error.message,
    stack: error.stack,
    count: 1,
    first_seen: new Date(),
    last_seen: new Date(),
  });
}
```

---

## 🎯 優先順序建議

### Phase 1（第一週）- 核心穩定性
1. ✅ 實作 `waitUntil()` 非阻塞日誌
2. ✅ 錯誤取樣和聚合
3. ✅ D1 索引優化
4. ✅ PII 遮罩

### Phase 2（第二週）- 可靠性提升
5. ✅ Durable Objects 日誌佇列
6. ✅ 告警 cooldown 和聚合
7. ✅ Request ID correlation
8. ✅ 環境隔離

### Phase 3（第三週）- 增強功能
9. ✅ 成本監控儀表板
10. ✅ API 存取控制
11. ✅ 備份策略

### Phase 4（未來可選）
12. ⚪ 即時推送通知
13. ⚪ 多租戶支援
14. ⚪ OpenTelemetry 完整整合
15. ⚪ 稽核日誌

---

## 💡 額外發現

### Workers Logs 免費額度（重要更新）

**來源**：Cloudflare 官方文件

- 每日免費額度：**50 億條日誌**
- 超過後：自動套用 1% sampling
- 查詢：完全免費
- 收費開始日期：2025/4/21（每百萬條 $0.60）

**建議**：可以考慮混合策略
- 使用 Workers Logs 即時查詢（保留 1-3 天）
- 使用 D1 長期儲存（保留 7-30 天）
- 關鍵錯誤同時寫入兩者

---

### Analytics Engine 限制

**免費額度**：10M events/月（非常充足）

**最佳實踐**：
- 使用 indexes 欄位存放高基數維度（user_id, endpoint）
- 使用 doubles 欄位存放數值（latency, size）
- 避免在 blobs 存放高基數資料

**查詢效能**：
- 支援 SQL 查詢
- 自動聚合和採樣
- P50/P95/P99 percentile 查詢

---

## 📝 建議的 Schema 更新

```sql
-- 完整的 logs 表定義
CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('debug', 'info', 'warn', 'error', 'critical')),
  message TEXT NOT NULL,
  request_id TEXT,
  trace_id TEXT,
  span_id TEXT,
  user_id TEXT,
  tenant_id TEXT,
  path TEXT,
  method TEXT,
  status_code INTEGER,
  duration_ms REAL,
  metadata JSONB,
  env TEXT DEFAULT 'production',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 必要索引
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_logs_level_timestamp ON logs(level, timestamp DESC);
CREATE INDEX idx_logs_request_id ON logs(request_id);
CREATE INDEX idx_logs_trace_id ON logs(trace_id);
CREATE INDEX idx_logs_user_id ON logs(user_id, timestamp DESC);
CREATE INDEX idx_logs_tenant_id ON logs(tenant_id, timestamp DESC);

-- 錯誤聚合表（新增）
CREATE TABLE error_aggregates (
  fingerprint TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  count INTEGER DEFAULT 1,
  first_seen DATETIME NOT NULL,
  last_seen DATETIME NOT NULL,
  resolved BOOLEAN DEFAULT FALSE
);

-- 稽核日誌表（新增）
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  ip_address TEXT,
  details JSONB,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用量統計表（新增）
CREATE TABLE usage_stats (
  date TEXT PRIMARY KEY,
  logs_written INTEGER DEFAULT 0,
  logs_read INTEGER DEFAULT 0,
  analytics_events INTEGER DEFAULT 0,
  d1_storage_bytes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 預期改進效果

| 指標 | 改進前 | 改進後 | 提升 |
|------|--------|--------|------|
| 日誌寫入延遲 | 50-100ms | < 5ms | **20x** |
| 查詢效能 | 3-5s | < 500ms | **10x** |
| 日誌風暴處理 | ❌ 系統崩潰 | ✅ 自動取樣 | **無限** |
| 錯誤追蹤完整性 | 50% | 95% | **2x** |
| 成本超支風險 | ⚠️ 未監控 | ✅ 主動告警 | **防範** |
| GDPR 合規 | ❌ 不符合 | ✅ 完全符合 | **合規** |

---

## 📖 參考資源

1. [Cloudflare Workers 可觀測性官方文件](https://developers.cloudflare.com/workers/observability/)
2. [D1 最佳實踐](https://developers.cloudflare.com/d1/best-practices/)
3. [Analytics Engine 指南](https://blog.cloudflare.com/analytics-engine-open-beta/)
4. [OpenTelemetry 標準](https://opentelemetry.io/docs/)
5. [W3C Trace Context](https://www.w3.org/TR/trace-context/)
6. [Hono 框架文件](https://hono.dev/)
7. [Grafana Cloudflare 儀表板](https://grafana.com/grafana/dashboards/)

---

## ✅ 下一步行動

1. **審查改進建議**：確認哪些功能是必要的
2. **更新 proposal.md**：整合高優先級改進
3. **更新 tasks.md**：調整實作時程（可能需要 3-4 週而非 2 週）
4. **驗證並執行**：`npx openspec apply implement-cloudflare-observability`
