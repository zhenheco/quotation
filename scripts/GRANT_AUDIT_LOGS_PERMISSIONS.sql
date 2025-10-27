-- ============================================================
-- 授予 audit_logs 表的權限給 authenticated 角色
-- ============================================================
-- 問題：RLS 策略存在，但缺少表級別權限
-- 解決：授予 authenticated 角色必要的操作權限
-- ============================================================

-- 授予權限給 authenticated 角色（已登入的用戶）
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
GRANT DELETE ON audit_logs TO authenticated;

-- 授予 USAGE 權限給序列（讓 gen_random_uuid() 可以使用）
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- 驗證結果
-- ============================================================

-- 確認權限已授予
SELECT
  '✅ 權限已授予 authenticated 角色' as status;

-- 檢查所有權限
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'audit_logs'
ORDER BY grantee, privilege_type;

-- 再次確認 RLS 策略
SELECT
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) = 3 THEN '✅ RLS 策略完整（3 個）'
    ELSE '⚠️ RLS 策略不完整（' || COUNT(*) || ' 個）'
  END as policy_status
FROM pg_policies
WHERE tablename = 'audit_logs';
