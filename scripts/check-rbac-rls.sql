-- ============================================================================
-- 檢查 RBAC 相關表的 RLS 狀態和策略
-- 在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 1. 檢查 RLS 啟用狀態
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('roles', 'permissions', 'role_permissions', 'user_profiles', 'user_roles')
ORDER BY tablename;

-- 2. 檢查現有的 RLS 策略
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('roles', 'permissions', 'role_permissions', 'user_profiles', 'user_roles')
ORDER BY tablename, cmd, policyname;

-- 3. 檢查表的權限
SELECT
  tablename,
  HAS_TABLE_PRIVILEGE('service_role', 'public.' || tablename, 'SELECT') as service_can_select,
  HAS_TABLE_PRIVILEGE('service_role', 'public.' || tablename, 'INSERT') as service_can_insert,
  HAS_TABLE_PRIVILEGE('authenticated', 'public.' || tablename, 'SELECT') as auth_can_select,
  HAS_TABLE_PRIVILEGE('authenticated', 'public.' || tablename, 'INSERT') as auth_can_insert
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('roles', 'permissions', 'role_permissions', 'user_profiles', 'user_roles')
ORDER BY tablename;

-- ============================================================================
-- 預期結果：
-- 1. 所有表的 rls_enabled 應該是 true
-- 2. 應該有適當的 RLS 策略允許操作
-- 3. authenticated 角色應該有 INSERT 權限
-- ============================================================================
