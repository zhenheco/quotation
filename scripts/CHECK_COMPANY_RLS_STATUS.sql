-- ============================================================
-- 檢查公司管理相關表的 RLS 策略狀態
-- ============================================================

-- 檢查 companies 的策略
SELECT
  '=== companies ===' as section,
  tablename,
  policyname,
  cmd as command,
  CASE
    WHEN cmd = 'SELECT' THEN '查看'
    WHEN cmd = 'INSERT' THEN '新增'
    WHEN cmd = 'UPDATE' THEN '更新'
    WHEN cmd = 'DELETE' THEN '刪除'
    ELSE cmd
  END as operation
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- 檢查 company_members 的策略
SELECT
  '=== company_members ===' as section,
  tablename,
  policyname,
  cmd as command,
  CASE
    WHEN cmd = 'SELECT' THEN '查看'
    WHEN cmd = 'INSERT' THEN '新增'
    WHEN cmd = 'UPDATE' THEN '更新'
    WHEN cmd = 'DELETE' THEN '刪除'
    ELSE cmd
  END as operation
FROM pg_policies
WHERE tablename = 'company_members'
ORDER BY policyname;

-- 檢查 company_settings 的策略
SELECT
  '=== company_settings ===' as section,
  tablename,
  policyname,
  cmd as command,
  CASE
    WHEN cmd = 'SELECT' THEN '查看'
    WHEN cmd = 'INSERT' THEN '新增'
    WHEN cmd = 'UPDATE' THEN '更新'
    WHEN cmd = 'DELETE' THEN '刪除'
    ELSE cmd
  END as operation
FROM pg_policies
WHERE tablename = 'company_settings'
ORDER BY policyname;

-- 統計策略數量
SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) = 4 THEN '✅ 完整（4個策略）'
    WHEN COUNT(*) > 0 THEN '⚠️ 不完整（' || COUNT(*) || '個策略）'
    ELSE '❌ 無策略'
  END as status
FROM pg_policies
WHERE tablename IN ('companies', 'company_members', 'company_settings')
GROUP BY tablename
ORDER BY tablename;
