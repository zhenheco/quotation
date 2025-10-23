-- ============================================================================
-- ✅ 最終驗證：確認所有表和資料
-- 在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 1. 檢查所有我們建立的表是否存在
WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'customers', 'products', 'quotations', 'quotation_items', 'exchange_rates',
    'roles', 'permissions', 'role_permissions', 'user_profiles', 'user_roles',
    'companies', 'company_members', 'company_settings',
    'customer_contracts', 'payments', 'payment_schedules',
    'audit_logs', 'quotation_shares', 'quotation_versions'
  ]) as table_name
)
SELECT
  '1. 表存在性檢查' as check_type,
  et.table_name,
  CASE
    WHEN pt.tablename IS NOT NULL THEN '✅ 存在'
    ELSE '❌ 不存在'
  END as status
FROM expected_tables et
LEFT JOIN pg_tables pt ON pt.tablename = et.table_name AND pt.schemaname = 'public'
ORDER BY et.table_name;

-- 2. 檢查預設資料
SELECT '2. 預設資料檢查' as check_type, '角色 (roles)' as item, COUNT(*)::text as count FROM roles
UNION ALL
SELECT '2. 預設資料檢查', '權限 (permissions)', COUNT(*)::text FROM permissions
UNION ALL
SELECT '2. 預設資料檢查', '角色權限對應 (role_permissions)', COUNT(*)::text FROM role_permissions;

-- 3. 檢查角色詳細資料
SELECT
  '3. 角色詳細資料' as check_type,
  name as role_name,
  name_zh,
  level,
  description
FROM roles
ORDER BY level;

-- 4. 統計摘要
SELECT
  '4. 統計摘要' as check_type,
  '總表數' as item,
  COUNT(*)::text as value
FROM pg_tables
WHERE schemaname = 'public'

UNION ALL

SELECT
  '4. 統計摘要',
  '我們建立的表',
  COUNT(*)::text
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'customers', 'products', 'quotations', 'quotation_items', 'exchange_rates',
    'roles', 'permissions', 'role_permissions', 'user_profiles', 'user_roles',
    'companies', 'company_members', 'company_settings',
    'customer_contracts', 'payments', 'payment_schedules',
    'audit_logs', 'quotation_shares', 'quotation_versions'
  );

-- ============================================================================
-- 預期結果：
-- 1. 所有 19 個表都應該顯示 ✅ 存在
-- 2. 角色: 5, 權限: 21, 角色權限對應: 74-84
-- 3. 顯示 5 個角色的詳細資料
-- 4. 總表數: 24, 我們建立的表: 19
-- ============================================================================
