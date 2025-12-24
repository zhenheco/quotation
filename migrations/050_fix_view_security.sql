-- ============================================================================
-- Migration: 050_fix_view_security.sql
-- Created: 2025-12-24
-- Description: 修復 Supabase Security Advisor 報告的 6 個安全問題
-- Problem: 6 個視圖授予了 anon 角色存取權限，這是安全風險
-- Solution: 撤銷 anon 角色的所有視圖權限，只保留 authenticated 和 service_role
-- ============================================================================

-- ============================================================================
-- 1. 撤銷 anon 角色對所有視圖的權限
-- ============================================================================

-- collected_payments_summary
REVOKE ALL ON collected_payments_summary FROM anon;

-- next_collection_reminders
REVOKE ALL ON next_collection_reminders FROM anon;

-- overdue_payments
REVOKE ALL ON overdue_payments FROM anon;

-- unpaid_payments_30_days
REVOKE ALL ON unpaid_payments_30_days FROM anon;

-- upcoming_payments
REVOKE ALL ON upcoming_payments FROM anon;

-- user_permissions
REVOKE ALL ON user_permissions FROM anon;

-- ============================================================================
-- 2. 確保 authenticated 和 service_role 只有 SELECT 權限（視圖不需要其他權限）
-- ============================================================================

-- collected_payments_summary
REVOKE ALL ON collected_payments_summary FROM authenticated;
GRANT SELECT ON collected_payments_summary TO authenticated;
REVOKE ALL ON collected_payments_summary FROM service_role;
GRANT SELECT ON collected_payments_summary TO service_role;

-- next_collection_reminders
REVOKE ALL ON next_collection_reminders FROM authenticated;
GRANT SELECT ON next_collection_reminders TO authenticated;
REVOKE ALL ON next_collection_reminders FROM service_role;
GRANT SELECT ON next_collection_reminders TO service_role;

-- overdue_payments
REVOKE ALL ON overdue_payments FROM authenticated;
GRANT SELECT ON overdue_payments TO authenticated;
REVOKE ALL ON overdue_payments FROM service_role;
GRANT SELECT ON overdue_payments TO service_role;

-- unpaid_payments_30_days
REVOKE ALL ON unpaid_payments_30_days FROM authenticated;
GRANT SELECT ON unpaid_payments_30_days TO authenticated;
REVOKE ALL ON unpaid_payments_30_days FROM service_role;
GRANT SELECT ON unpaid_payments_30_days TO service_role;

-- upcoming_payments
REVOKE ALL ON upcoming_payments FROM authenticated;
GRANT SELECT ON upcoming_payments TO authenticated;
REVOKE ALL ON upcoming_payments FROM service_role;
GRANT SELECT ON upcoming_payments TO service_role;

-- user_permissions
REVOKE ALL ON user_permissions FROM authenticated;
GRANT SELECT ON user_permissions TO authenticated;
REVOKE ALL ON user_permissions FROM service_role;
GRANT SELECT ON user_permissions TO service_role;

-- ============================================================================
-- 3. 記錄遷移
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('050_fix_view_security.sql')
ON CONFLICT (filename) DO NOTHING;

-- 刷新 Schema Cache
NOTIFY pgrst, 'reload schema';

SELECT 'View security fixed! Revoked anon access from 6 views.' as status;
