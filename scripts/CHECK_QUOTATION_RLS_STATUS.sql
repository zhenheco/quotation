-- ============================================================
-- 檢查報價單相關表的 RLS 策略狀態
-- ============================================================

-- 檢查 quotation_versions 的策略
SELECT
  '=== quotation_versions ===' as section,
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
WHERE tablename = 'quotation_versions'
ORDER BY policyname;

-- 檢查 quotation_shares 的策略
SELECT
  '=== quotation_shares ===' as section,
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
WHERE tablename = 'quotation_shares'
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
WHERE tablename IN ('quotation_versions', 'quotation_shares')
GROUP BY tablename
ORDER BY tablename;
