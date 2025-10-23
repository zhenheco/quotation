-- ============================================================================
-- 🔍 診斷當前資料庫狀態
-- 查看哪些表已經存在，哪些表缺失
-- ============================================================================

-- 1. 列出所有已存在的表
SELECT
  '📋 現有的表' as info,
  tablename as table_name
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. 統計表數量
SELECT
  '📊 統計' as info,
  COUNT(*) as total_tables
FROM pg_tables
WHERE schemaname = 'public';

-- 3. 檢查是否有部分表已建立
SELECT
  '檢查基礎表' as category,
  table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t.table_name)
    THEN '✅ 已存在'
    ELSE '❌ 不存在'
  END as status
FROM (VALUES
  ('customers'),
  ('products'),
  ('quotations'),
  ('quotation_items'),
  ('exchange_rates')
) AS t(table_name);

SELECT
  '檢查 RBAC 表' as category,
  table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t.table_name)
    THEN '✅ 已存在'
    ELSE '❌ 不存在'
  END as status
FROM (VALUES
  ('roles'),
  ('permissions'),
  ('role_permissions'),
  ('user_profiles'),
  ('user_roles')
) AS t(table_name);

-- 4. 如果有表存在，檢查它們的欄位結構
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
    RAISE NOTICE 'customers 表存在，檢查欄位...';
  END IF;
END $$;

SELECT
  'customers 表欄位' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- ============================================================================
-- 如果看到任何已存在的表，可能需要先清理它們
-- ============================================================================
