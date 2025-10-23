-- ============================================================================
-- 診斷：檢查資料庫中實際存在的表
-- 請在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 1. 列出所有 public schema 的表
SELECT
  '所有 PUBLIC 表' as info,
  tablename as table_name
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. 檢查特定表是否存在於任何 schema
SELECT
  '表搜尋結果' as info,
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_name IN (
  'roles', 'permissions', 'role_permissions',
  'user_roles', 'user_profiles'
)
ORDER BY table_schema, table_name;

-- 3. 統計 public schema 的表數量
SELECT
  '統計' as info,
  schemaname,
  COUNT(*) as table_count
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;
