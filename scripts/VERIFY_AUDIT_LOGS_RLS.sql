-- ============================================================
-- 驗證 audit_logs 的 RLS 策略
-- ============================================================

-- 1. 檢查 RLS 是否啟用
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'audit_logs';

-- 2. 列出所有策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'audit_logs'
ORDER BY policyname;

-- 3. 統計策略數量
SELECT
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) = 3 THEN '✅ 策略完整（3 個）'
    WHEN COUNT(*) > 0 THEN '⚠️ 策略不完整（' || COUNT(*) || ' 個）'
    ELSE '❌ 無策略'
  END as status
FROM pg_policies
WHERE tablename = 'audit_logs';

-- 4. 檢查 authenticated 角色的權限
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'audit_logs'
ORDER BY grantee, privilege_type;
