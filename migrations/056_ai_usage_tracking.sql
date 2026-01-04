-- ============================================================================
-- Migration 056: AI 用量追蹤 (AI Usage Tracking)
-- 建立 AI 分析快取表、用量記錄表
-- ============================================================================

-- ============================================================================
-- TYPES / ENUMS
-- ============================================================================

-- AI 分析類型
DO $$ BEGIN
  CREATE TYPE ai_analysis_type AS ENUM ('cash_flow', 'receivable_risk', 'tax_optimization');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- AI 分析結果快取表
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  analysis_type ai_analysis_type NOT NULL,
  cache_key VARCHAR(255) NOT NULL,
  result JSONB NOT NULL,
  model VARCHAR(100) NOT NULL,
  usage_tokens INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, analysis_type, cache_key)
);

COMMENT ON TABLE ai_analysis_cache IS 'AI 財務分析結果快取';
COMMENT ON COLUMN ai_analysis_cache.cache_key IS '快取鍵，格式為 company_id:type:date:data_hash';
COMMENT ON COLUMN ai_analysis_cache.expires_at IS '快取過期時間';

-- AI 用量記錄表（月度匯總）
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- 格式：YYYY-MM
  analysis_type ai_analysis_type NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost NUMERIC(10, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, period, analysis_type)
);

COMMENT ON TABLE ai_usage_logs IS 'AI 分析用量月度匯總';
COMMENT ON COLUMN ai_usage_logs.period IS '統計週期，格式 YYYY-MM';
COMMENT ON COLUMN ai_usage_logs.total_cost IS '估算成本（USD）';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_company ON ai_analysis_cache(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_type ON ai_analysis_cache(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_expires ON ai_analysis_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_key ON ai_analysis_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_company ON ai_usage_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_period ON ai_usage_logs(period);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- AI 快取：公司成員可讀
DROP POLICY IF EXISTS ai_analysis_cache_select ON ai_analysis_cache;
CREATE POLICY ai_analysis_cache_select ON ai_analysis_cache
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- AI 用量：公司成員可讀
DROP POLICY IF EXISTS ai_usage_logs_select ON ai_usage_logs;
CREATE POLICY ai_usage_logs_select ON ai_usage_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- 增加 AI 用量計數的 RPC 函數
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_company_id UUID,
  p_period VARCHAR(7),
  p_analysis_type ai_analysis_type,
  p_tokens INTEGER,
  p_cost NUMERIC DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_usage_logs (company_id, period, analysis_type, request_count, total_tokens, total_cost)
  VALUES (p_company_id, p_period, p_analysis_type, 1, p_tokens, p_cost)
  ON CONFLICT (company_id, period, analysis_type)
  DO UPDATE SET
    request_count = ai_usage_logs.request_count + 1,
    total_tokens = ai_usage_logs.total_tokens + p_tokens,
    total_cost = ai_usage_logs.total_cost + p_cost,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION increment_ai_usage IS '增加公司的 AI 用量計數';

-- 清除過期快取的函數（可由 cron job 調用）
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM ai_analysis_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_ai_cache IS '清除過期的 AI 分析快取';

-- ============================================================================
-- TRIGGER: 更新 updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_ai_usage_logs_updated_at ON ai_usage_logs;
CREATE TRIGGER update_ai_usage_logs_updated_at
  BEFORE UPDATE ON ai_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('056_ai_usage_tracking.sql')
ON CONFLICT (filename) DO NOTHING;
