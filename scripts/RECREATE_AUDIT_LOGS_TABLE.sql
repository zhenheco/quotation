-- ============================================================
-- 重建 audit_logs 表（強制刪除並重建）
-- ============================================================
-- ⚠️ 警告：此腳本會刪除現有的 audit_logs 表及其所有資料
-- 用途：修復結構錯誤的 audit_logs 表
-- ============================================================

-- 步驟 1: 刪除舊表（包括所有依賴的策略）
DROP TABLE IF EXISTS audit_logs CASCADE;

-- 步驟 2: 建立新表
CREATE TABLE audit_logs (
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

-- 步驟 3: 建立索引
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 步驟 4: 啟用 RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 步驟 5: 建立 RLS 策略
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

-- ============================================================
-- 驗證結果
-- ============================================================

-- 確認表已建立
SELECT
  '✅ audit_logs 表已成功重建' as status;

-- 檢查 RLS 策略
SELECT
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) = 3 THEN '✅ 策略完整（3 個）'
    ELSE '⚠️ 策略不完整（' || COUNT(*) || ' 個）'
  END as policy_status
FROM pg_policies
WHERE tablename = 'audit_logs';

-- 檢查所有欄位
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 檢查索引
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'audit_logs'
ORDER BY indexname;
