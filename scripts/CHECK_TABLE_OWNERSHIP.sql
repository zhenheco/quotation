-- ============================================================================
-- 檢查資料表擁有者和權限
-- 在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 1. 檢查表的擁有者
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'products')
ORDER BY tablename;

-- 2. 檢查表的權限
SELECT
  table_schema,
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('customers', 'products')
ORDER BY table_name, grantee, privilege_type;

-- 3. 檢查 service_role 是否有權限
SELECT
  tablename,
  HAS_TABLE_PRIVILEGE('service_role', 'public.' || tablename, 'SELECT') as can_select,
  HAS_TABLE_PRIVILEGE('service_role', 'public.' || tablename, 'INSERT') as can_insert,
  HAS_TABLE_PRIVILEGE('service_role', 'public.' || tablename, 'UPDATE') as can_update,
  HAS_TABLE_PRIVILEGE('service_role', 'public.' || tablename, 'DELETE') as can_delete
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'products');

-- 4. 檢查 authenticated 角色是否有權限
SELECT
  tablename,
  HAS_TABLE_PRIVILEGE('authenticated', 'public.' || tablename, 'SELECT') as can_select,
  HAS_TABLE_PRIVILEGE('authenticated', 'public.' || tablename, 'INSERT') as can_insert,
  HAS_TABLE_PRIVILEGE('authenticated', 'public.' || tablename, 'UPDATE') as can_update,
  HAS_TABLE_PRIVILEGE('authenticated', 'public.' || tablename, 'DELETE') as can_delete
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'products');

-- ============================================================================
-- 預期結果：
--
-- 1. 擁有者應該是 'postgres' 或 'supabase_admin'
-- 2. service_role 應該有所有權限（SELECT, INSERT, UPDATE, DELETE）
-- 3. authenticated 應該有所有權限（SELECT, INSERT, UPDATE, DELETE）
--
-- 如果沒有權限，需要執行 GRANT 語句：
-- GRANT ALL ON public.customers TO service_role;
-- GRANT ALL ON public.customers TO authenticated;
-- GRANT ALL ON public.products TO service_role;
-- GRANT ALL ON public.products TO authenticated;
-- ============================================================================
