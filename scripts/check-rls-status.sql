-- ============================================================================
-- 檢查 RLS 狀態
-- 在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 1. 檢查哪些表啟用了 RLS
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'products')
ORDER BY tablename;

-- 2. 檢查現有的策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('customers', 'products')
ORDER BY tablename, cmd, policyname;

-- 3. 測試策略（使用當前登入使用者）
-- 注意：這個查詢需要在已登入的情況下執行
SELECT
  'Current user ID: ' || auth.uid()::text as info
UNION ALL
SELECT
  'Can SELECT customers: ' ||
  CASE WHEN EXISTS (
    SELECT 1 FROM customers WHERE user_id = auth.uid() LIMIT 1
  ) THEN 'YES' ELSE 'NO (or no data)' END
UNION ALL
SELECT
  'Can INSERT customers: ' ||
  CASE WHEN (
    SELECT COUNT(*) FROM information_schema.table_privileges
    WHERE table_name = 'customers'
    AND privilege_type = 'INSERT'
  ) > 0 THEN 'Privilege exists' ELSE 'No privilege' END;
