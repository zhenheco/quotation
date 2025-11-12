# Cloudflare Workers 觀測系統部署指南

本指南將引導您完成觀測系統的完整部署流程。

## 📋 部署前檢查清單

- [ ] Cloudflare 帳號（免費方案即可）
- [ ] Wrangler CLI 已安裝 (`npm install -g wrangler`)
- [ ] 已登入 Cloudflare (`wrangler login`)
- [ ] 已建立 D1 資料庫
- [ ] 已配置 Analytics Engine

## 🗄️ Step 1: 建立 D1 資料庫

### 1.1 建立資料庫

```bash
npx wrangler d1 create quotation-observability
```

記錄輸出中的 `database_id`，例如：
```
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 1.2 執行資料庫遷移

```bash
# 建立 schema
npx wrangler d1 execute quotation-observability --file=./workers/observability/schema.sql

# 驗證資料表建立成功
npx wrangler d1 execute quotation-observability --command="SELECT name FROM sqlite_master WHERE type='table'"
```

預期輸出應包含以下資料表：
- `logs` - 日誌表
- `logs_fts` - 全文搜尋索引
- `error_aggregates` - 錯誤聚合表
- `traces` - 追蹤表
- `alert_rules` - 告警規則表
- `alert_events` - 告警事件表

## 📊 Step 2: 配置 Analytics Engine

### 2.1 在 wrangler.toml 中添加綁定

編輯 `workers/observability-api/wrangler.jsonc`：

```json
{
  "name": "observability-api",
  "main": "./index.ts",
  "compatibility_date": "2025-01-13",
  "analytics_engine_datasets": [
    {
      "binding": "ANALYTICS"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "quotation-observability",
      "database_id": "your-database-id-here"
    }
  ],
  "triggers": {
    "crons": ["*/5 * * * *"]
  }
}
```

## 🚀 Step 3: 部署 Observability API Worker

### 3.1 編譯 TypeScript

```bash
cd workers/observability-api
npm install
npm run build
```

### 3.2 部署到 Cloudflare

```bash
# 部署到 production
npx wrangler deploy

# 或部署到 staging
npx wrangler deploy --env staging
```

### 3.3 驗證部署

```bash
# 測試健康檢查端點
curl https://observability-api.your-subdomain.workers.dev/health

# 預期回應
{
  "status": "ok",
  "timestamp": "2025-01-13T10:00:00.000Z",
  "environment": "production"
}
```

## 🔧 Step 4: 配置環境變數

### 4.1 設置應用程式環境變數

在您的 Next.js 應用程式中設置：

```bash
# .env.production
NEXT_PUBLIC_OBSERVABILITY_API_URL=https://observability-api.your-subdomain.workers.dev
```

### 4.2 設置 Worker 環境變數

```bash
# 設置環境標識
npx wrangler secret put ENVIRONMENT --name observability-api
# 輸入: production
```

## 📱 Step 5: 整合到主應用程式

### 5.1 安裝觀測模組

觀測模組已經包含在專案中，位於：
- `lib/observability/` - 核心模組
- `app/(authenticated)/observability/` - 前端儀表板

### 5.2 在 API 路由中使用

```typescript
// app/api/example/route.ts
import { createLogger } from '@/lib/observability';

export async function GET(request: Request) {
  const logger = createLogger(process.env.DB);

  try {
    logger.info('Processing request');
    // 你的業務邏輯
    return Response.json({ success: true });
  } catch (error) {
    await logger.error(error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### 5.3 使用中介層（推薦）

```typescript
// worker.ts
import { withObservability } from '@/lib/observability';

export default withObservability(async (ctx) => {
  const { request, logger, analytics } = ctx;

  // 自動日誌記錄
  // 自動效能追蹤
  // 自動錯誤處理

  return new Response('OK');
});
```

## 🎯 Step 6: 設置告警規則

### 6.1 通過 API 建立告警規則

```bash
curl -X POST https://observability-api.your-subdomain.workers.dev/api/alerts/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "高錯誤率",
    "condition": "error_rate_percent",
    "threshold": 5,
    "cooldown_minutes": 30,
    "severity": "critical",
    "enabled": true
  }'
```

### 6.2 預設告警規則建議

```sql
-- 通過 D1 直接插入預設規則
INSERT INTO alert_rules (id, name, condition, threshold, cooldown_minutes, severity, enabled)
VALUES
  ('rule_error_rate', '高錯誤率', 'error_rate_percent', 5, 30, 'critical', 1),
  ('rule_high_latency', '高延遲', 'p95_latency_ms', 2000, 15, 'warning', 1),
  ('rule_low_volume', '低請求量', 'request_volume_per_minute', 10, 60, 'info', 1);
```

## 📊 Step 7: 驗證觀測系統

### 7.1 產生測試日誌

```typescript
// 在你的應用中執行
const logger = createLogger(env.DB);
logger.info('Test log entry');
logger.warn('Test warning');
await logger.error(new Error('Test error'));
```

### 7.2 查詢日誌

```bash
curl "https://observability-api.your-subdomain.workers.dev/api/logs?limit=10"
```

### 7.3 查看儀表板

訪問：`https://your-app.com/observability`

驗證以下功能：
- [ ] 總覽統計顯示正確
- [ ] 日誌檢視器可以載入
- [ ] 指標圖表正常渲染
- [ ] 追蹤資料可見
- [ ] 告警規則列表顯示

## 🔍 Step 8: 監控和維護

### 8.1 設置定期清理

建立 Cron Worker 執行資料清理：

```typescript
// workers/observability-cleanup/index.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // 清理 30 天前的日誌
    await env.DB.prepare(`
      DELETE FROM logs
      WHERE timestamp < datetime('now', '-30 days')
    `).run();

    // 清理已解決的錯誤（30 天前）
    await env.DB.prepare(`
      DELETE FROM error_aggregates
      WHERE resolved = 1
        AND resolved_at < datetime('now', '-30 days')
    `).run();
  },
};
```

在 `wrangler.toml` 中配置每日執行：

```toml
[triggers]
crons = ["0 2 * * *"]  # 每天凌晨 2 點執行
```

### 8.2 監控資料庫大小

```bash
# 查詢資料庫大小
npx wrangler d1 execute quotation-observability --command="
  SELECT
    name,
    (SELECT COUNT(*) FROM logs) as log_count,
    (SELECT COUNT(*) FROM error_aggregates) as error_count,
    (SELECT COUNT(*) FROM traces) as trace_count
  FROM sqlite_master
  LIMIT 1
"
```

### 8.3 設置效能監控

定期檢查以下指標：
- Worker 執行時間
- D1 查詢延遲
- Analytics Engine 查詢效能
- 錯誤率

```bash
# 查看 Worker 統計
npx wrangler tail observability-api --format pretty
```

## 🐛 故障排除

### 問題 1: 日誌未記錄

**檢查項目：**
1. D1 綁定是否正確
2. Schema 是否已執行
3. 檢查 Circuit Breaker 狀態

**解決方案：**
```bash
# 檢查資料表
npx wrangler d1 execute quotation-observability --command="SELECT COUNT(*) FROM logs"

# 查看 Worker 日誌
npx wrangler tail observability-api
```

### 問題 2: Analytics Engine 查詢失敗

**檢查項目：**
1. ANALYTICS 綁定是否存在
2. SQL 語法是否正確
3. 時間範圍是否有效

**解決方案：**
```bash
# 驗證綁定
npx wrangler whoami
npx wrangler deploy --dry-run
```

### 問題 3: 告警未觸發

**檢查項目：**
1. Cron Trigger 是否啟用
2. 告警規則是否已啟用
3. 冷卻時間設置

**解決方案：**
```bash
# 手動觸發 Cron
npx wrangler tail observability-api --format pretty

# 查詢告警規則
curl "https://observability-api.your-subdomain.workers.dev/api/alerts/rules"
```

### 問題 4: 前端儀表板載入失敗

**檢查項目：**
1. API URL 配置是否正確
2. CORS 設置
3. 網路連接

**解決方案：**
```typescript
// 在 observability-api/index.ts 中確認 CORS
app.use('/*', cors({
  origin: 'https://your-app.com',
}));
```

## 📈 效能優化建議

### 1. 資料庫索引

確保以下索引已建立：

```sql
-- logs 表索引
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_request_id ON logs(request_id);
CREATE INDEX IF NOT EXISTS idx_logs_trace_id ON logs(trace_id);

-- error_aggregates 表索引
CREATE INDEX IF NOT EXISTS idx_error_aggregates_last_seen ON error_aggregates(last_seen);
CREATE INDEX IF NOT EXISTS idx_error_aggregates_resolved ON error_aggregates(resolved);

-- traces 表索引
CREATE INDEX IF NOT EXISTS idx_traces_start_time ON traces(start_time);
CREATE INDEX IF NOT EXISTS idx_traces_duration ON traces(duration_ms);
```

### 2. 查詢優化

```typescript
// 使用適當的 limit 和 offset
const logs = await env.DB.prepare(`
  SELECT * FROM logs
  WHERE timestamp > ?
  ORDER BY timestamp DESC
  LIMIT ? OFFSET ?
`).bind(startTime, limit, offset).all();
```

### 3. Analytics Engine 查詢優化

```typescript
// 使用適當的時間間隔
const interval = hours <= 6 ? '5m' : hours <= 24 ? '1h' : '1d';

const query = `
  SELECT
    toStartOfInterval(timestamp, INTERVAL '${interval}') as time_bucket,
    COUNT(*) as count
  FROM analytics
  WHERE timestamp > NOW() - INTERVAL '${hours}' HOUR
  GROUP BY time_bucket
`;
```

## 🔒 安全性建議

### 1. 啟用 Workers 驗證

```typescript
// 在 observability-api 中添加驗證
import { verifyJWT } from './auth';

app.use('/*', async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token || !(await verifyJWT(token))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});
```

### 2. 限制 API 訪問

```typescript
// 使用 IP 白名單
const ALLOWED_IPS = ['1.2.3.4', '5.6.7.8'];

app.use('/*', (c, next) => {
  const ip = c.req.header('CF-Connecting-IP');
  if (!ALLOWED_IPS.includes(ip)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  return next();
});
```

### 3. 啟用 Rate Limiting

```typescript
// 使用 Cloudflare Workers KV 實作 Rate Limiting
const rateLimiter = new RateLimiter(env.RATE_LIMIT_KV);

app.use('/*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP');
  if (!(await rateLimiter.check(ip))) {
    return c.json({ error: 'Too Many Requests' }, 429);
  }
  await next();
});
```

## 📊 成本估算

### 免費額度

- **D1 Database**: 100,000 讀取/天，50,000 寫入/天
- **Analytics Engine**: 10M 資料點/月
- **Workers**: 100,000 請求/天
- **KV Reads**: 100,000 讀取/天

### 預估使用量（中小型應用）

每天：
- 日誌寫入：~10,000 次（遠低於 50,000 限制）
- 日誌查詢：~5,000 次（遠低於 100,000 限制）
- Analytics 資料點：~50,000（月總量 1.5M，遠低於 10M 限制）
- Worker 請求：~10,000 次（遠低於 100,000 限制）

**結論：完全在免費額度內！** 🎉

## 📞 支援和幫助

如有問題，請參考：

1. [Cloudflare Workers 文件](https://developers.cloudflare.com/workers/)
2. [D1 Database 文件](https://developers.cloudflare.com/d1/)
3. [Analytics Engine 文件](https://developers.cloudflare.com/analytics/analytics-engine/)
4. [專案 OBSERVABILITY.md](./OBSERVABILITY.md)

## ✅ 部署檢查清單

完成部署後，請確認：

- [ ] D1 資料庫已建立並遷移完成
- [ ] Analytics Engine 已配置
- [ ] Observability API Worker 已部署且可訪問
- [ ] 環境變數已正確設置
- [ ] Cron Triggers 已啟用
- [ ] 告警規則已建立
- [ ] 前端儀表板可以訪問
- [ ] 測試日誌可以正常記錄和查詢
- [ ] 指標圖表正常顯示
- [ ] 告警系統正常運作
- [ ] 定期清理任務已設置
- [ ] 安全性措施已實施

恭喜！您的觀測系統已成功部署！🎉
