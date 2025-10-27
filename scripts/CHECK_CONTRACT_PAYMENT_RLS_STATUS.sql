-- ============================================================
-- 檢查合約與付款相關表的 RLS 策略狀態
-- ============================================================

-- 檢查 customer_contracts 的策略
SELECT
  '=== customer_contracts ===' as section,
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
WHERE tablename = 'customer_contracts'
ORDER BY policyname;

-- 檢查 payments 的策略
SELECT
  '=== payments ===' as section,
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
WHERE tablename = 'payments'
ORDER BY policyname;

-- 檢查 payment_schedules 的策略
SELECT
  '=== payment_schedules ===' as section,
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
WHERE tablename = 'payment_schedules'
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
WHERE tablename IN ('customer_contracts', 'payments', 'payment_schedules')
GROUP BY tablename
ORDER BY tablename;
