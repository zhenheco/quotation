-- ============================================================================
-- ✅ 驗證 Migration 結果（單一查詢版本）
-- 在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 統一的驗證查詢，返回所有結果
SELECT * FROM (
  -- 1. 基礎表統計
  SELECT
    1 as order_num,
    '📊 基礎表' as category,
    COUNT(*)::text as count,
    CASE
      WHEN COUNT(*) = 5 THEN '✅ 完整'
      ELSE '⚠️ 缺少 ' || (5 - COUNT(*))::text || ' 個表'
    END as status
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('customers', 'products', 'quotations', 'quotation_items', 'exchange_rates')

  UNION ALL

  -- 2. RBAC 表統計
  SELECT
    2 as order_num,
    '🔐 RBAC 表' as category,
    COUNT(*)::text as count,
    CASE
      WHEN COUNT(*) = 5 THEN '✅ 完整'
      ELSE '⚠️ 缺少 ' || (5 - COUNT(*))::text || ' 個表'
    END as status
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('roles', 'permissions', 'role_permissions', 'user_profiles', 'user_roles')

  UNION ALL

  -- 3. 公司表統計
  SELECT
    3 as order_num,
    '🏢 公司表' as category,
    COUNT(*)::text as count,
    CASE
      WHEN COUNT(*) = 3 THEN '✅ 完整'
      ELSE '⚠️ 缺少 ' || (3 - COUNT(*))::text || ' 個表'
    END as status
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('companies', 'company_members', 'company_settings')

  UNION ALL

  -- 4. 合約收款表統計
  SELECT
    4 as order_num,
    '💰 合約收款表' as category,
    COUNT(*)::text as count,
    CASE
      WHEN COUNT(*) = 3 THEN '✅ 完整'
      ELSE '⚠️ 缺少 ' || (3 - COUNT(*))::text || ' 個表'
    END as status
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('customer_contracts', 'payments', 'payment_schedules')

  UNION ALL

  -- 5. 審計擴充表統計
  SELECT
    5 as order_num,
    '📝 審計擴充表' as category,
    COUNT(*)::text as count,
    CASE
      WHEN COUNT(*) = 3 THEN '✅ 完整'
      ELSE '⚠️ 缺少 ' || (3 - COUNT(*))::text || ' 個表'
    END as status
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('audit_logs', 'quotation_shares', 'quotation_versions')

  UNION ALL

  -- 6. 總表數
  SELECT
    6 as order_num,
    '📋 總表數' as category,
    COUNT(*)::text as count,
    CASE
      WHEN COUNT(*) = 19 THEN '✅ 完整'
      WHEN COUNT(*) > 0 THEN '⚠️ 部分完成'
      ELSE '❌ 無表'
    END as status
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'customers', 'products', 'quotations', 'quotation_items', 'exchange_rates',
      'roles', 'permissions', 'role_permissions', 'user_profiles', 'user_roles',
      'companies', 'company_members', 'company_settings',
      'customer_contracts', 'payments', 'payment_schedules',
      'audit_logs', 'quotation_shares', 'quotation_versions'
    )

  UNION ALL

  -- 7. 角色資料
  SELECT
    7 as order_num,
    '👥 角色資料' as category,
    COUNT(*)::text as count,
    CASE
      WHEN COUNT(*) = 5 THEN '✅ 完整'
      WHEN COUNT(*) > 0 THEN '⚠️ 部分完成'
      ELSE '❌ 無資料'
    END as status
  FROM roles

  UNION ALL

  -- 8. 權限資料
  SELECT
    8 as order_num,
    '🔑 權限資料' as category,
    COUNT(*)::text as count,
    CASE
      WHEN COUNT(*) = 21 THEN '✅ 完整'
      WHEN COUNT(*) > 0 THEN '⚠️ 部分完成'
      ELSE '❌ 無資料'
    END as status
  FROM permissions

  UNION ALL

  -- 9. 角色權限對應
  SELECT
    9 as order_num,
    '🔗 角色權限對應' as category,
    COUNT(*)::text as count,
    CASE
      WHEN COUNT(*) >= 80 THEN '✅ 完整'
      WHEN COUNT(*) > 0 THEN '⚠️ 部分完成'
      ELSE '❌ 無資料'
    END as status
  FROM role_permissions

) AS verification_results
ORDER BY order_num;

-- ============================================================================
-- 預期結果：
-- 📊 基礎表: 5 - ✅ 完整
-- 🔐 RBAC 表: 5 - ✅ 完整
-- 🏢 公司表: 3 - ✅ 完整
-- 💰 合約收款表: 3 - ✅ 完整
-- 📝 審計擴充表: 3 - ✅ 完整
-- 📋 總表數: 19 - ✅ 完整
-- 👥 角色資料: 5 - ✅ 完整
-- 🔑 權限資料: 21 - ✅ 完整
-- 🔗 角色權限對應: 80+ - ✅ 完整
-- ============================================================================
