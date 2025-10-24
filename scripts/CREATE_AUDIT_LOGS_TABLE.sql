-- ============================================================
-- 建立 audit_logs 表（如果不存在）
-- ============================================================
-- 此腳本從 Migration 001 中提取，用於單獨建立 audit_logs 表
-- 執行前請確認表確實不存在
-- ============================================================

-- 檢查並建立表
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- What was changed
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'

  -- Changes
  old_values JSONB,
  new_values JSONB,

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 啟用 RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 刪除舊策略（如果存在）
DROP POLICY IF EXISTS "Users can view their audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can delete their audit logs" ON audit_logs;

-- 建立 RLS 策略
CREATE POLICY "Users can view their audit logs"
  ON audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their audit logs"
  ON audit_logs
  FOR DELETE
  USING (user_id = auth.uid());

-- 驗證
SELECT
  'audit_logs 表已建立' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'audit_logs';

-- 檢查欄位
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'audit_logs'
  AND table_schema = 'public'
ORDER BY ordinal_position;
