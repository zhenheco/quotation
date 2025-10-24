-- ============================================================
-- 檢查資料表欄位結構
-- ============================================================

-- 檢查 customer_contracts 的所有欄位
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'customer_contracts'
ORDER BY ordinal_position;

-- 檢查 customer_contracts 的約束
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'customer_contracts'::regclass;
