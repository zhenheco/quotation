-- ============================================================================
-- Cloudflare Workers 觀測系統 - D1 (SQLite) Schema
-- ============================================================================
-- 說明：完全使用免費方案的生產級可觀測性系統
-- 包含：日誌、追蹤、錯誤聚合、告警、稽核、用量監控
-- ============================================================================

-- 1. 日誌表 (Logs)
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  message TEXT NOT NULL,

  -- 追蹤關聯
  request_id TEXT,
  trace_id TEXT,
  span_id TEXT,

  -- 多租戶支援
  user_id TEXT,
  tenant_id TEXT,

  -- 請求資訊
  path TEXT,
  method TEXT,
  status_code INTEGER,
  duration_ms REAL,

  -- 額外資料
  metadata TEXT,
  env TEXT DEFAULT 'production'
);

-- 日誌索引（效能優化）
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_logs_level_timestamp ON logs(level, timestamp DESC);
CREATE INDEX idx_logs_request_id ON logs(request_id);
CREATE INDEX idx_logs_trace_id ON logs(trace_id);
CREATE INDEX idx_logs_user_id ON logs(user_id, timestamp DESC);
CREATE INDEX idx_logs_tenant_id ON logs(tenant_id, timestamp DESC);
CREATE INDEX idx_logs_env ON logs(env, timestamp DESC);

-- 全文搜尋虛擬表
CREATE VIRTUAL TABLE IF NOT EXISTS logs_fts USING fts5(
  message,
  content=logs,
  content_rowid=rowid
);

-- 自動同步 FTS 索引
CREATE TRIGGER IF NOT EXISTS logs_fts_insert AFTER INSERT ON logs BEGIN
  INSERT INTO logs_fts(rowid, message) VALUES (new.rowid, new.message);
END;

CREATE TRIGGER IF NOT EXISTS logs_fts_delete AFTER DELETE ON logs BEGIN
  DELETE FROM logs_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS logs_fts_update AFTER UPDATE ON logs BEGIN
  UPDATE logs_fts SET message = new.message WHERE rowid = new.rowid;
END;

-- 2. 追蹤表 (Traces)
CREATE TABLE IF NOT EXISTS traces (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  parent_span_id TEXT,

  -- 時間資訊
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_ms REAL,

  -- 追蹤步驟（JSON 格式）
  steps TEXT,

  -- 環境標籤
  env TEXT DEFAULT 'production',

  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_traces_request_id ON traces(request_id);
CREATE INDEX idx_traces_trace_id ON traces(trace_id);
CREATE INDEX idx_traces_start_time ON traces(start_time DESC);
CREATE INDEX idx_traces_duration ON traces(duration_ms DESC);
CREATE INDEX idx_traces_env ON traces(env, start_time DESC);

-- 3. 錯誤聚合表 (Error Aggregates)
CREATE TABLE IF NOT EXISTS error_aggregates (
  fingerprint TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  count INTEGER DEFAULT 1,
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  resolved INTEGER DEFAULT 0,
  resolved_at TEXT,
  resolved_by TEXT
);

CREATE INDEX idx_error_aggregates_last_seen ON error_aggregates(last_seen DESC);
CREATE INDEX idx_error_aggregates_count ON error_aggregates(count DESC);
CREATE INDEX idx_error_aggregates_resolved ON error_aggregates(resolved, last_seen DESC);

-- 4. 稽核日誌表 (Audit Logs) - 擴充版
CREATE TABLE IF NOT EXISTS observability_audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  details TEXT,
  resource_type TEXT,
  resource_id TEXT
);

CREATE INDEX idx_obs_audit_logs_user ON observability_audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_obs_audit_logs_action ON observability_audit_logs(action, timestamp DESC);
CREATE INDEX idx_obs_audit_logs_timestamp ON observability_audit_logs(timestamp DESC);

-- 5. 告警規則表 (Alert Rules)
CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('error_rate', 'p95_latency', 'request_volume', 'custom')),
  threshold REAL NOT NULL,
  cooldown_minutes INTEGER DEFAULT 5,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  enabled INTEGER DEFAULT 1,
  channels TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);

-- 6. 告警事件表 (Alert Events)
CREATE TABLE IF NOT EXISTS alert_events (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  value REAL NOT NULL,
  message TEXT,
  resolved_at TEXT,
  FOREIGN KEY (rule_id) REFERENCES alert_rules(id) ON DELETE CASCADE
);

CREATE INDEX idx_alert_events_rule ON alert_events(rule_id, triggered_at DESC);
CREATE INDEX idx_alert_events_resolved ON alert_events(resolved_at);
CREATE INDEX idx_alert_events_triggered ON alert_events(triggered_at DESC);

-- 7. 用量統計表 (Usage Stats)
CREATE TABLE IF NOT EXISTS usage_stats (
  date TEXT PRIMARY KEY,
  logs_written INTEGER DEFAULT 0,
  logs_read INTEGER DEFAULT 0,
  analytics_events INTEGER DEFAULT 0,
  d1_storage_bytes INTEGER DEFAULT 0,
  workers_requests INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_usage_stats_date ON usage_stats(date DESC);

-- 8. 插入預設告警規則
INSERT INTO alert_rules (id, name, condition, threshold, severity, channels) VALUES
  ('alert-high-error-rate', 'High Error Rate', 'error_rate', 0.05, 'critical', '{"email": "", "webhook": ""}'),
  ('alert-slow-api', 'Slow API Response', 'p95_latency', 500, 'warning', '{"email": "", "webhook": ""}'),
  ('alert-high-traffic', 'High Traffic', 'request_volume', 10000, 'info', '{"email": "", "webhook": ""}')
ON CONFLICT (id) DO NOTHING;

-- 9. 建立用量監控初始記錄
INSERT INTO usage_stats (date, logs_written, logs_read, analytics_events, d1_storage_bytes, workers_requests)
VALUES (date('now'), 0, 0, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;

-- ============================================================================
-- 新增觀測性權限
-- ============================================================================

-- 插入觀測性權限
INSERT INTO permissions (id, resource, action, name, description) VALUES
  ('perm-observability-read', 'observability', 'read', 'observability:read', 'View logs and metrics'),
  ('perm-observability-write', 'observability', 'write', 'observability:write', 'Create alerts and modify settings'),
  ('perm-observability-delete', 'observability', 'delete', 'observability:delete', 'Delete logs and alerts')
ON CONFLICT (id) DO NOTHING;

-- 授予 super_admin 和 company_owner 觀測性權限
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT
  'rp-' || roles.name || '-observability-' || permissions.action,
  roles.id,
  permissions.id
FROM roles, permissions
WHERE roles.name IN ('super_admin', 'company_owner')
  AND permissions.resource = 'observability'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 完成
-- ============================================================================
SELECT 'Observability schema created successfully!' as status;
