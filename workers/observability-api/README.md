# Observability API

Cloudflare Workers API for querying logs, metrics, traces, and managing alerts.

## 🚀 Endpoints

### Health Check

```
GET /health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-13T10:00:00.000Z",
  "environment": "production"
}
```

---

## 📝 Logs API (`/api/logs`)

### Query Logs

```
GET /api/logs?level=error&startTime=2025-01-13T00:00:00Z&limit=100
```

**Query Parameters**:
- `level`: Log level (debug, info, warn, error, critical)
- `startTime`: ISO 8601 timestamp
- `endTime`: ISO 8601 timestamp
- `requestId`: Filter by request ID
- `traceId`: Filter by trace ID
- `userId`: Filter by user ID
- `path`: Filter by request path (supports LIKE)
- `search`: Full-text search in log messages
- `limit`: Number of results (default: 100, max: 1000)
- `offset`: Pagination offset (default: 0)

**Response**:
```json
{
  "logs": [
    {
      "id": "uuid",
      "timestamp": "2025-01-13T10:00:00.000Z",
      "level": "error",
      "message": "Database query failed",
      "request_id": "req_123",
      "trace_id": "trace_456",
      "user_id": "user_789"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

### Get Log by ID

```
GET /api/logs/:id
```

### Get Logs by Trace ID

```
GET /api/logs/trace/:traceId
```

### Get Logs by Request ID

```
GET /api/logs/request/:requestId
```

### Log Level Statistics

```
GET /api/logs/stats/levels?startTime=2025-01-13T00:00:00Z
```

**Response**:
```json
{
  "levels": [
    { "level": "error", "count": 50 },
    { "level": "warn", "count": 100 },
    { "level": "info", "count": 500 }
  ],
  "total": 650
}
```

---

## 📊 Metrics API (`/api/metrics`)

### API Request Metrics

```
GET /api/metrics/api-requests?hours=24
```

**Response**:
```json
{
  "metrics": [
    {
      "endpoint": "/api/quotations",
      "method": "POST",
      "status_class": "2xx",
      "request_count": 1500,
      "avg_response_time_ms": 120.5,
      "p50_response_time_ms": 100,
      "p95_response_time_ms": 250,
      "p99_response_time_ms": 400
    }
  ],
  "hours": 24
}
```

### Endpoint-Specific Metrics

```
GET /api/metrics/endpoint/:endpoint?hours=24
```

### Time Series Data

```
GET /api/metrics/timeseries?hours=24&interval=1h&endpoint=/api/quotations
```

**Response**:
```json
{
  "timeseries": [
    {
      "time_bucket": "2025-01-13T10:00:00Z",
      "request_count": 150,
      "avg_response_time_ms": 120,
      "p95_response_time_ms": 250,
      "error_count": 5
    }
  ],
  "hours": 24,
  "interval": "1h"
}
```

### Error Rate

```
GET /api/metrics/error-rate?hours=24
```

**Response**:
```json
{
  "error_count": 50,
  "client_error_count": 100,
  "success_count": 5000,
  "total_requests": 5150,
  "error_rate": 0.97,
  "client_error_rate": 1.94,
  "success_rate": 97.09,
  "hours": 24
}
```

### Top Slow Endpoints

```
GET /api/metrics/top-slow-endpoints?hours=24&limit=10
```

### Aggregated Errors

```
GET /api/metrics/errors/aggregated?hours=24&limit=50
```

**Response**:
```json
{
  "errors": [
    {
      "fingerprint": "abc123...",
      "message": "Database connection timeout",
      "count": 15,
      "first_seen": "2025-01-13T08:00:00Z",
      "last_seen": "2025-01-13T10:00:00Z",
      "resolved": false
    }
  ],
  "total": 25,
  "hours": 24
}
```

---

## 🔍 Traces API (`/api/traces`)

### Query Traces

```
GET /api/traces?minDuration=2000&limit=100
```

**Query Parameters**:
- `startTime`: ISO 8601 timestamp
- `endTime`: ISO 8601 timestamp
- `minDuration`: Minimum duration in milliseconds
- `maxDuration`: Maximum duration in milliseconds
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset (default: 0)

### Get Trace by ID

```
GET /api/traces/:traceId
```

**Response**:
```json
{
  "traceId": "trace_456",
  "traces": [
    {
      "id": "uuid",
      "request_id": "req_123",
      "trace_id": "trace_456",
      "start_time": "2025-01-13T10:00:00.000Z",
      "end_time": "2025-01-13T10:00:02.500Z",
      "duration_ms": 2500,
      "steps": {}
    }
  ],
  "logs": [],
  "totalSpans": 1,
  "totalLogs": 5
}
```

### Get Trace by Request ID

```
GET /api/traces/request/:requestId
```

### Slow Traces

```
GET /api/traces/slow-traces?hours=24&threshold=2000&limit=50
```

### Duration Statistics

```
GET /api/traces/stats/duration?hours=24
```

---

## 🚨 Alerts API (`/api/alerts`)

### Alert Rules

#### List All Rules

```
GET /api/alerts/rules?enabled=true
```

#### Get Rule by ID

```
GET /api/alerts/rules/:id
```

#### Create Alert Rule

```
POST /api/alerts/rules
Content-Type: application/json

{
  "name": "High Error Rate",
  "condition": "error_rate_percent",
  "threshold": 5,
  "cooldown_minutes": 30,
  "severity": "critical",
  "enabled": true
}
```

**Supported Conditions**:
- `error_rate_percent`: 錯誤率百分比
- `p95_latency_ms`: P95 延遲（毫秒）
- `request_volume_per_minute`: 每分鐘請求量

#### Update Alert Rule

```
PUT /api/alerts/rules/:id
Content-Type: application/json

{
  "threshold": 10,
  "enabled": false
}
```

#### Delete Alert Rule

```
DELETE /api/alerts/rules/:id
```

### Alert Events

#### List Alert Events

```
GET /api/alerts/events?resolved=false&hours=24
```

**Query Parameters**:
- `ruleId`: Filter by rule ID
- `resolved`: Filter by resolution status (true/false)
- `hours`: Time range in hours (default: 24)
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset (default: 0)

#### Resolve Alert Event

```
POST /api/alerts/events/:id/resolve
```

#### Alert Statistics

```
GET /api/alerts/stats?hours=24
```

**Response**:
```json
{
  "stats": [
    {
      "total_alerts": 15,
      "active_alerts": 5,
      "resolved_alerts": 10,
      "severity": "critical",
      "rule_name": "High Error Rate"
    }
  ],
  "hours": 24
}
```

---

## ⏰ Scheduled Tasks

### Alert Evaluator

**Schedule**: Every 5 minutes (`*/5 * * * *`)

**Function**:
- Evaluates all enabled alert rules
- Checks if conditions are met
- Triggers alerts when thresholds are exceeded
- Respects cooldown periods to prevent alert spam

---

## 🔧 Configuration

### Environment Variables

- `ENVIRONMENT`: Environment name (development/staging/production)

### D1 Database

Required binding: `DB`
- Contains logs, traces, error_aggregates, alert_rules, alert_events tables

### Analytics Engine

Optional binding: `ANALYTICS`
- Required for metrics API functionality
- Stores time-series API request data

---

## 🚀 Deployment

```bash
# Deploy to Cloudflare Workers
npx wrangler deploy --config workers/observability-api/wrangler.jsonc

# Tail logs
npx wrangler tail observability-api
```

---

## 📚 API Response Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Analytics Engine not configured

---

## 🔐 Security

- CORS enabled for all origins (configure as needed)
- No authentication required (add authentication middleware as needed)
- Rate limiting recommended for production use

---

## 📝 License

MIT
