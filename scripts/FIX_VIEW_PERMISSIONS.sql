-- ============================================================
-- 修復視圖權限問題
-- ============================================================
-- 用途: 為三個視圖授予查詢權限
-- 日期: 2025-10-24
-- 問題: permission denied for view
-- ============================================================

-- 方法 1: 直接授予 SELECT 權限給 authenticated 角色
GRANT SELECT ON collected_payments_summary TO authenticated;
GRANT SELECT ON next_collection_reminders TO authenticated;
GRANT SELECT ON unpaid_payments_30_days TO authenticated;

-- 方法 2: 授予給 public 角色（所有人都可以查詢，但仍受 RLS 保護）
-- 如果方法 1 不行，可以試試這個
-- GRANT SELECT ON collected_payments_summary TO public;
-- GRANT SELECT ON next_collection_reminders TO public;
-- GRANT SELECT ON unpaid_payments_30_days TO public;

-- 驗證權限
SELECT
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE viewname IN (
  'collected_payments_summary',
  'next_collection_reminders',
  'unpaid_payments_30_days'
);

-- 檢查授權
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN (
  'collected_payments_summary',
  'next_collection_reminders',
  'unpaid_payments_30_days'
)
ORDER BY table_name, grantee;
