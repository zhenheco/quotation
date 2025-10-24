-- ============================================================
-- 完整診斷 customer_contracts 表結構
-- ============================================================

-- 1. 查看所有欄位（包括可空性）
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customer_contracts'
ORDER BY ordinal_position;

-- 2. 查看所有 NOT NULL 約束
SELECT
  a.attname AS column_name,
  a.attnotnull AS is_not_null
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
WHERE c.relname = 'customer_contracts'
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND a.attnotnull = true
ORDER BY a.attnum;
