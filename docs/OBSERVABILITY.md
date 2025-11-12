# Cloudflare Workers 觀測系統

完整的生產級觀測解決方案，使用 100% 免費的 Cloudflare 服務構建。

## 📋 目錄

- [系統架構](#系統架構)
- [核心功能](#核心功能)
- [快速開始](#快速開始)
- [API 文件](#api-文件)
- [前端儀表板](#前端儀表板)
- [部署指南](#部署指南)
- [最佳實踐](#最佳實踐)

## 系統架構

### 組件概覽

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Next.js App   │─────>│ Observability API│─────>│   D1 Database   │
│  (主應用程式)   │      │  (Workers API)   │      │  (SQLite 日誌)  │
└─────────────────┘      └──────────────────┘      └─────────────────┘
         │                        │
         │                        v
         │               ┌──────────────────┐
         └──────────────>│ Analytics Engine │
                         │  (時序指標存儲)  │
                         └──────────────────┘
```

### 核心模組

1. **Logger** (`lib/observability/logger.ts`)
   - 結構化日誌記錄
   - PII 自動遮罩
   - 錯誤取樣
   - Trace Context 整合

2. **Error Aggregator** (`lib/observability/error-aggregator.ts`)
   - 錯誤指紋識別 (SHA-256)
   - 自動聚合相同錯誤
   - 錯誤趨勢分析

3. **Trace Context** (`lib/observability/trace-context.ts`)
   - W3C Trace Context 標準
   - 分散式追蹤
   - Request-Response 關聯

4. **Analytics** (`lib/observability/analytics.ts`)
   - API 請求追蹤
   - 效能指標收集
   - KPI 監控

5. **Circuit Breaker** (`lib/observability/circuit-breaker.ts`)
   - 故障隔離
   - 自動重試
   - 指數退避

## 核心功能

### 1. 結構化日誌

```typescript
import { createLogger } from '@/lib/observability';

const logger = createLogger(env.DB, {
  minLevel: 'info',
  enablePIIRedaction: true,
  enableErrorSampling: true,
  maxErrorsPerMinute: 100,
});

// 記錄 info 日誌
logger.info('User logged in', {
  userId: 'user_123',
  path: '/api/auth/login',
});

// 記錄錯誤
await logger.error(error, {
  requestId: 'req_456',
  path: '/api/quotations',
});
```

### 2. 自動 PII 遮罩

支援自動遮罩以下敏感資訊：
- Email 地址
- 電話號碼
- 信用卡號碼
- IP 地址
- JWT Token
- API Keys

### 3. 錯誤聚合

```typescript
import { ErrorAggregator } from '@/lib/observability';

const aggregator = new ErrorAggregator(env.DB);

// 記錄錯誤（自動聚合相同錯誤）
const { fingerprint, isNew, count } = await aggregator.recordError(error);

// 取得最常見錯誤
const topErrors = await aggregator.getTopErrors(10);

// 標記錯誤為已解決
await aggregator.resolveError(fingerprint, 'admin@example.com');
```

### 4. 分散式追蹤

```typescript
import { getTraceContext, setTraceHeaders } from '@/lib/observability';

// 從請求提取 Trace Context
const traceContext = getTraceContext(request);

// 設置回應標頭
setTraceHeaders(response.headers, traceContext);

// 建立帶 Trace Context 的 Logger
const logger = createLogger(env.DB).withTraceContext(traceContext);
```

### 5. API 效能追蹤

```typescript
import { createAnalytics } from '@/lib/observability';

const analytics = createAnalytics(env.ANALYTICS);

// 追蹤 API 請求
analytics.trackAPIRequest(
  '/api/quotations',
  'POST',
  200,
  245, // duration in ms
  {
    userTier: 'premium',
    country: 'TW',
  }
);
```

### 6. 中介層整合

```typescript
import { withObservability } from '@/lib/observability';

export default withObservability(async (ctx) => {
  const { request, logger, analytics, traceContext } = ctx;

  // 自動記錄請求
  // 自動追蹤效能
  // 自動錯誤處理

  return new Response('OK');
});
```

## 快速開始

### 1. 設置 D1 資料庫

```bash
# 建立 D1 資料庫
npx wrangler d1 create quotation-observability

# 執行遷移
npx wrangler d1 execute quotation-observability --file=./workers/observability/schema.sql
```

### 2. 設置 Analytics Engine

```bash
# 在 wrangler.toml 中配置
[[analytics_engine_datasets]]
binding = "ANALYTICS"
```

### 3. 在應用程式中使用

```typescript
// app/api/example/route.ts
import { createLogger } from '@/lib/observability';

export async function GET(request: Request) {
  const logger = createLogger(process.env.DB);

  logger.info('Processing request');

  try {
    // 你的業務邏輯
    return Response.json({ success: true });
  } catch (error) {
    await logger.error(error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## API 文件

### Observability API Worker

完整的 REST API 用於查詢日誌、指標、追蹤和管理告警。

詳細文件：[workers/observability-api/README.md](../workers/observability-api/README.md)

#### 主要端點

- **日誌**: `/api/logs` - 查詢和搜尋日誌
- **指標**: `/api/metrics` - 效能指標和統計
- **追蹤**: `/api/traces` - 分散式追蹤資料
- **告警**: `/api/alerts` - 告警規則和事件管理

## 前端儀表板

### 路由結構

```
/observability              # 總覽儀表板
/observability/logs         # 日誌檢視器
/observability/metrics      # 效能指標
/observability/traces       # 分散式追蹤
/observability/alerts       # 告警管理
```

### 功能特色

1. **總覽儀表板**
   - 關鍵指標概覽
   - 實時錯誤率
   - 平均回應時間
   - 活躍告警數

2. **日誌檢視器**
   - 即時日誌流
   - 多維度過濾
   - 全文搜尋
   - Trace ID 關聯

3. **效能指標**
   - 請求量趨勢圖表
   - 回應時間分布
   - 錯誤率統計
   - 最慢端點排名

4. **分散式追蹤**
   - Request-Response 流程
   - 執行步驟詳情
   - 持續時間分析
   - 跨服務追蹤

5. **告警管理**
   - 告警規則配置
   - 事件歷史
   - 解決狀態追蹤
   - 冷卻時間控制

## 部署指南

### 1. 部署 Observability API Worker

```bash
# 編譯 TypeScript
cd workers/observability-api
npm run build

# 部署到 Cloudflare Workers
npx wrangler deploy
```

### 2. 配置環境變數

```bash
# 在 wrangler.toml 中設置
[env.production]
name = "observability-api"

[[env.production.d1_databases]]
binding = "DB"
database_name = "quotation-observability"
database_id = "your-database-id"

[[env.production.analytics_engine_datasets]]
binding = "ANALYTICS"
```

### 3. 設置 Cron Triggers

告警評估器會每 5 分鐘自動執行：

```toml
[triggers]
crons = ["*/5 * * * *"]
```

## 最佳實踐

### 1. 日誌記錄

- ✅ 使用結構化日誌格式
- ✅ 包含 Request ID 和 Trace ID
- ✅ 啟用 PII 自動遮罩
- ✅ 設置適當的日誌等級
- ❌ 避免記錄敏感資訊
- ❌ 不要過度記錄（影響效能）

### 2. 錯誤處理

- ✅ 使用錯誤聚合功能
- ✅ 設置錯誤取樣限制
- ✅ 及時解決重複錯誤
- ✅ 監控錯誤趨勢
- ❌ 避免忽略錯誤
- ❌ 不要記錄非錯誤資訊到 error 等級

### 3. 效能監控

- ✅ 追蹤所有 API 端點
- ✅ 監控 P95/P99 延遲
- ✅ 設置效能告警
- ✅ 定期檢視慢查詢
- ❌ 避免追蹤過於細粒度的操作
- ❌ 不要忽略間歇性效能問題

### 4. 告警配置

- ✅ 設置適當的閾值
- ✅ 配置合理的冷卻時間
- ✅ 區分嚴重程度
- ✅ 定期檢視告警規則
- ❌ 避免告警疲勞
- ❌ 不要設置過於敏感的告警

### 5. 資料保留

- ✅ 定期清理舊日誌（建議 30 天）
- ✅ 保留重要錯誤聚合資料
- ✅ 備份關鍵指標
- ✅ 監控資料庫大小
- ❌ 避免無限制累積日誌
- ❌ 不要刪除未解決的錯誤記錄

## 故障排除

### 常見問題

**Q: 日誌沒有記錄到資料庫**
- 檢查 D1 資料庫綁定是否正確
- 驗證 schema 是否已執行
- 檢查 Circuit Breaker 狀態

**Q: Analytics Engine 查詢失敗**
- 確認 ANALYTICS 綁定已設置
- 檢查 SQL 查詢語法
- 驗證時間範圍參數

**Q: 告警沒有觸發**
- 檢查 Cron Trigger 是否啟用
- 驗證告警規則配置
- 確認冷卻時間設置

**Q: 前端儀表板無法載入資料**
- 確認 API Worker 已部署
- 檢查 CORS 設置
- 驗證 API 端點路徑

## 效能考量

### 資料庫效能

- 日誌表自動清理：30 天
- 錯誤聚合表：保留已解決錯誤 30 天
- 建議為高頻查詢欄位建立索引

### Analytics Engine 限制

- 每個 Worker 請求最多 25 個資料點
- 查詢時間範圍建議不超過 30 天
- 使用適當的聚合間隔

### 成本優化

- D1: 免費額度 100,000 讀取/天，50,000 寫入/天
- Analytics Engine: 免費額度 10M 資料點/月
- Workers: 免費額度 100,000 請求/天

## 貢獻指南

歡迎貢獻！請遵循以下步驟：

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m '新增某個功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 授權

MIT License - 詳見 [LICENSE](../LICENSE) 檔案

## 致謝

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
