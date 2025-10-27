-- ============================================================
-- 診斷 audit_logs 表結構
-- ============================================================

-- 1. 檢查表是否存在
SELECT
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
  ) as table_exists;

-- 2. 檢查所有欄位
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 檢查特定欄位是否存在
SELECT
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'audit_logs'
      AND column_name = 'old_values'
    ) THEN '✅ old_values 欄位存在'
    ELSE '❌ old_values 欄位不存在'
  END as old_values_status,
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'audit_logs'
      AND column_name = 'new_values'
    ) THEN '✅ new_values 欄位存在'
    ELSE '❌ new_values 欄位不存在'
  END as new_values_status;

-- 4. 檢查索引
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'audit_logs'
ORDER BY indexname;

-- 5. 嘗試插入測試資料（會在事務中 rollback）
BEGIN;

-- 測試插入
INSERT INTO audit_logs (
  user_id,
  table_name,
  record_id,
  action,
  new_values
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'test_table',
  gen_random_uuid(),
  'create',
  '{"test": "value"}'::jsonb
) RETURNING id, created_at;

ROLLBACK;
