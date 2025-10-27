-- ============================================================
-- 基本診斷：檢查 audit_logs 表是否存在
-- ============================================================

-- 1. 檢查表是否存在
SELECT
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
  ) as table_exists;

-- 2. 如果表存在，列出所有欄位
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 列出所有 public schema 中的表（看看 audit_logs 是否在其中）
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
