# Cloudflare Observability System - Architecture Design

## System Architecture

### High-Level Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Production Traffic                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         v
         ┌───────────────────────────────┐
         │   Next.js App (Worker)        │
         │   - Instrumented with OTel    │
         │   - Custom logging            │
         │   - Analytics events          │
         └───────────┬───────────────────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
          v          v          v
    ┌─────────┐ ┌──────────┐ ┌─────────────┐
    │Logpush  │ │Analytics │ │Trace Workers│
    │ → R2    │ │Engine    │ │             │
    └────┬────┘ └────┬─────┘ └──────┬──────┘
         │           │               │
         v           v               v
    ┌────────────────────────────────────────┐
    │  Observability API Worker (Hono)       │
    │  ┌──────────┬─────────┬──────────┐   │
    │  │Logs API  │Metrics  │Traces    │   │
    │  │          │API      │API       │   │
    │  └──────────┴─────────┴──────────┘   │
    │  + D1 (index) + R2 (storage)          │
    └─────────────────┬──────────────────────┘
                      │
                      v
         ┌────────────────────────────┐
         │  Admin Dashboard (Next.js) │
         │  ┌──────────┬────────────┐ │
         │  │Logs      │Metrics     │ │
         │  │Viewer    │Dashboard   │ │
         │  ├──────────┼────────────┤ │
         │  │Traces    │Alerts      │ │
         │  │Explorer  │Config      │ │
         │  └──────────┴────────────┘ │
         └────────────────────────────┘
```

## Component Design

### 1. Log Collection Pipeline

#### 1.1 Logpush Configuration

**Target**: Cloudflare R2 Bucket
**Format**: NDJSON (newline-delimited JSON)
**Fields**:
```json
{
  "timestamp": "2025-11-13T10:30:45.123Z",
  "level": "error",
  "message": "Database connection failed",
  "metadata": {
    "requestId": "abc-123",
    "userId": "user_456",
    "path": "/api/quotations",
    "method": "POST",
    "statusCode": 500,
    "duration": 1234,
    "error": {
      "name": "DatabaseError",
      "message": "Connection timeout",
      "stack": "..."
    }
  }
}
```

**Batching**:
- Interval: 30 seconds
- Max size: 5 MB
- Max records: 10,000

#### 1.2 Log Indexing (D1)

**Schema**:
```sql
CREATE TABLE log_index (
  id TEXT PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  level TEXT NOT NULL,
  message TEXT,
  request_id TEXT,
  user_id TEXT,
  path TEXT,
  method TEXT,
  status_code INTEGER,
  duration INTEGER,
  r2_key TEXT NOT NULL,
  r2_offset INTEGER NOT NULL,

  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_level (level),
  INDEX idx_request_id (request_id),
  INDEX idx_user_id (user_id),
  INDEX idx_path (path)
);
```

**Indexing Worker**:
- Triggered by R2 object creation event
- Parses NDJSON batch
- Extracts searchable fields
- Inserts into D1 with R2 reference

### 2. Metrics Collection (Analytics Engine)

#### 2.1 Custom Events

```typescript
interface AnalyticsEvent {
  // Dimensions (for grouping)
  blobs: string[]  // [path, method, statusCode, userId]

  // Metrics (for aggregation)
  doubles: number[] // [duration, size, ...]

  // Metadata
  indexes: string[] // [requestId, traceId]
}
```

#### 2.2 Pre-defined Metrics

**API Performance**:
- `api.request.count` (by path, method, status)
- `api.request.duration` (p50, p95, p99)
- `api.request.size` (request/response bytes)
- `api.error.rate` (percentage)

**Database Performance**:
- `db.query.count` (by table, operation)
- `db.query.duration` (p50, p95, p99)
- `db.connection.pool` (active, idle, waiting)

**Business Metrics**:
- `quotation.created.count`
- `payment.received.amount`
- `user.login.count`

#### 2.3 Analytics Query API

```typescript
// GET /api/observability/metrics?
//   metric=api.request.duration&
//   aggregation=p95&
//   groupBy=path&
//   from=2025-11-13T00:00:00Z&
//   to=2025-11-13T23:59:59Z

interface MetricsQuery {
  metric: string
  aggregation: 'sum' | 'avg' | 'count' | 'p50' | 'p95' | 'p99'
  groupBy?: string[]
  filters?: Record<string, string>
  from: string // ISO timestamp
  to: string
  interval?: '1m' | '5m' | '1h' | '1d'
}

interface MetricsResponse {
  metric: string
  data: {
    timestamp: string
    value: number
    dimensions?: Record<string, string>
  }[]
}
```

### 3. Distributed Tracing

#### 3.1 OpenTelemetry Integration

**Instrumentation**:
```typescript
import { trace } from '@opentelemetry/api'
import { CloudflareWorkerTraceExporter } from '@cloudflare/opentelemetry'

const tracer = trace.getTracer('quotation-system')

export async function handleRequest(request: Request, env: Env) {
  return await tracer.startActiveSpan('http.request', async (span) => {
    span.setAttribute('http.method', request.method)
    span.setAttribute('http.url', request.url)

    try {
      const response = await processRequest(request, env)
      span.setAttribute('http.status_code', response.status)
      return response
    } catch (error) {
      span.recordException(error)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw error
    } finally {
      span.end()
    }
  })
}
```

**Trace Context Propagation**:
- HTTP Headers: `traceparent`, `tracestate`
- Request ID generation: UUIDv7 (time-sortable)
- Cross-service propagation: W3C Trace Context

#### 3.2 Trace Storage

**Option A: Cloudflare Trace Workers** (Recommended)
- Native integration
- No additional storage cost
- Query via Workers Analytics

**Option B: External APM** (Future)
- Export to Jaeger/Zipkin
- More features, higher cost

### 4. Alerting System

#### 4.1 Alert Rules Engine

**Rule Definition**:
```typescript
interface AlertRule {
  id: string
  name: string
  description: string
  enabled: boolean

  // Condition
  metric: string
  operator: '>' | '<' | '>=' | '<=' | '=='
  threshold: number
  window: string // e.g., '5m', '1h'

  // Actions
  channels: AlertChannel[]
  cooldown: string // e.g., '1h'

  // Metadata
  severity: 'info' | 'warning' | 'critical'
  tags: string[]
}

interface AlertChannel {
  type: 'email' | 'webhook' | 'dashboard'
  config: Record<string, unknown>
}
```

**Example Rules**:
```typescript
const HIGH_ERROR_RATE = {
  name: 'High Error Rate',
  metric: 'api.error.rate',
  operator: '>',
  threshold: 5, // 5%
  window: '5m',
  channels: [
    { type: 'email', config: { to: 'dev-team@example.com' } },
    { type: 'webhook', config: { url: 'https://hooks.slack.com/...' } }
  ],
  severity: 'critical'
}

const SLOW_API = {
  name: 'Slow API Response',
  metric: 'api.request.duration',
  operator: '>',
  threshold: 2000, // 2 seconds
  window: '10m',
  channels: [
    { type: 'email', config: { to: 'dev-team@example.com' } }
  ],
  severity: 'warning'
}
```

#### 4.2 Alert Evaluation Worker

**Cron Trigger**: Every 1 minute
```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    const rules = await env.DB.prepare(
      'SELECT * FROM alert_rules WHERE enabled = 1'
    ).all()

    for (const rule of rules.results) {
      await evaluateRule(rule, env)
    }
  }
}

async function evaluateRule(rule: AlertRule, env: Env) {
  // 1. Query metric from Analytics Engine
  const value = await queryMetric(rule.metric, rule.window, env)

  // 2. Check threshold
  if (meetsCondition(value, rule.operator, rule.threshold)) {
    // 3. Check cooldown
    if (await shouldTrigger(rule.id, rule.cooldown, env)) {
      // 4. Send notifications
      await triggerAlert(rule, value, env)
    }
  }
}
```

### 5. Admin Dashboard

#### 5.1 Page Structure

```
/admin/observability/
  ├── /logs          - Log viewer and search
  ├── /metrics       - Metrics dashboard and charts
  ├── /traces        - Distributed tracing explorer
  ├── /alerts        - Alert rules configuration
  └── /settings      - General settings
```

#### 5.2 Logs Viewer

**Features**:
- Real-time streaming (via SSE)
- Advanced filtering (level, time, user, path)
- Full-text search
- Log context (show surrounding logs)
- Export to JSON/CSV

**Query Performance**:
- Index-first approach: Query D1 for matches
- Lazy loading: Fetch from R2 only when expanded
- Pagination: 50 logs per page
- Virtual scrolling for large result sets

#### 5.3 Metrics Dashboard

**Pre-built Dashboards**:
1. **System Overview**: Error rate, request rate, p95 latency
2. **API Performance**: Top slowest endpoints, error distribution
3. **Database Health**: Query performance, connection pool
4. **Business KPIs**: Quotations created, payments received

**Custom Dashboards**:
- Drag-and-drop chart builder
- Support multiple chart types (line, bar, pie, heatmap)
- Save and share dashboard configurations

#### 5.4 Traces Explorer

**Features**:
- Trace search by ID, time range, duration
- Waterfall view of spans
- Flame graph visualization
- Error highlighting
- Service dependency graph

## Data Flow

### 1. Request Lifecycle with Observability

```
1. Request arrives → Worker starts
   ↓
2. Create trace span + request ID
   ↓
3. Log: "Request received"
   → Analytics: api.request.count++
   ↓
4. Execute business logic
   - Database query → Trace span + Analytics
   - External API call → Trace span + Log
   ↓
5. Response returned
   → Log: "Request completed"
   → Analytics: api.request.duration
   → Trace span ends
   ↓
6. Logpush batches logs → R2 (every 30s)
   ↓
7. Indexing Worker triggered → Parse logs → D1 index
   ↓
8. Analytics aggregates metrics → Queryable via API
   ↓
9. Alert Worker checks rules (every 1min)
   → If threshold met → Send notification
```

### 2. Query Flow

```
User opens dashboard
   ↓
Frontend calls /api/observability/metrics
   ↓
Observability API Worker
   ↓
Query Analytics Engine (for aggregated data)
   ↓
Return formatted JSON
   ↓
Frontend renders charts
```

```
User searches logs
   ↓
Frontend calls /api/observability/logs?level=error&from=...
   ↓
Observability API Worker
   ↓
Query D1 index (get matching log IDs + R2 keys)
   ↓
Fetch full logs from R2 (if needed)
   ↓
Return paginated results
   ↓
Frontend renders log viewer
```

## Technology Stack

### Backend
- **Workers Runtime**: Cloudflare Workers (V8 isolate)
- **API Framework**: Hono (lightweight, fast)
- **Database**: D1 (SQLite on Cloudflare)
- **Storage**: R2 (S3-compatible object storage)
- **Metrics**: Analytics Engine (built-in)
- **Tracing**: OpenTelemetry + Trace Workers

### Frontend
- **Framework**: Next.js 15 (React 19)
- **Data Fetching**: TanStack Query
- **Charts**: Recharts / Apache ECharts
- **UI Components**: Shadcn UI
- **Real-time**: Server-Sent Events (SSE)

### DevOps
- **Deployment**: Wrangler CLI
- **CI/CD**: GitHub Actions
- **Monitoring**: Self-hosted (this system!)

## Performance Considerations

### 1. Overhead Budget
- Logging: < 1ms per request
- Tracing: < 5ms per request
- Analytics: < 0.5ms per event
- Total overhead: < 10ms (< 1% for typical 1s+ requests)

### 2. Storage Optimization
- Log compression: gzip (R2 native)
- Index pruning: Delete D1 entries > 30 days
- R2 lifecycle: Archive to Glacier after 30 days
- Analytics retention: 90 days (Cloudflare default)

### 3. Query Optimization
- D1 indexes on common filters
- Limit result sets (max 1000 per query)
- Cursor-based pagination
- CDN caching for dashboard assets

## Security Considerations

### 1. Access Control
- Observability API requires admin authentication
- RBAC: Only users with `observability:read` permission
- API keys for programmatic access
- Rate limiting: 100 req/min per user

### 2. Data Privacy
- PII redaction in logs (email, phone, etc.)
- Sensitive fields masked (passwords, tokens)
- User ID hashing option
- GDPR compliance: Data retention policies

### 3. Log Tampering Prevention
- Logs are append-only (R2)
- D1 index includes checksums
- Alert on index/storage mismatch

## Cost Estimation

### Monthly Costs (estimated for 10M requests/month)

| Service | Usage | Cost |
|---------|-------|------|
| Workers | 10M requests | $0.50 |
| D1 | 1M rows, 100M reads | $0.75 |
| R2 | 50 GB storage, 10M writes | $2.50 |
| Analytics Engine | 10M events | $0.25 |
| Logpush | Included | $0 |
| **Total** | | **~$4/month** |

### Cost Scaling
- Linear with request volume
- Log retention is the main driver
- Can optimize with sampling (e.g., 10% trace rate)

## Migration Plan

### Phase 1: Foundation (Week 1)
- Set up R2 bucket and Logpush
- Create D1 schema
- Deploy indexing Worker
- Basic logging in main app

### Phase 2: API & Frontend (Week 2)
- Build Observability API Worker
- Implement logs query endpoints
- Create basic dashboard UI
- Logs viewer page

### Phase 3: Metrics & Alerts (Week 3)
- Integrate Analytics Engine
- Implement metrics collection
- Build metrics API
- Create charts dashboard
- Basic alert rules

### Phase 4: Tracing & Polish (Week 4)
- Add OpenTelemetry instrumentation
- Implement trace explorer
- Email alerting integration
- Documentation and training

## Future Enhancements

1. **Advanced Analytics**
   - Machine learning for anomaly detection
   - Predictive alerts
   - Root cause analysis automation

2. **Integration**
   - Export to external APM (Datadog, New Relic)
   - Slack/Discord bot for queries
   - Mobile app for alerts

3. **Features**
   - Log replay for debugging
   - A/B testing analytics
   - User session replay

4. **Performance**
   - Log sampling for high-traffic endpoints
   - Distributed query engine
   - Real-time aggregation streams
