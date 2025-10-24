-- ============================================================
-- 檢查 audit_logs 表的 RLS 狀態
-- ============================================================

-- 1. 檢查 RLS 是否啟用
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'audit_logs';

-- 2. 檢查現有策略
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
WHERE tablename = 'audit_logs'
ORDER BY policyname;

-- 3. 統計策略數量
SELECT
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ 完整（至少 4 個策略）'
    WHEN COUNT(*) > 0 THEN '⚠️ 不完整（' || COUNT(*) || ' 個策略）'
    ELSE '❌ 無策略'
  END as status
FROM pg_policies
WHERE tablename = 'audit_logs';
