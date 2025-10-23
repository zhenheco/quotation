-- ============================================================================
-- 🧹 清理已存在的表（如果需要重新開始）
-- ⚠️ 警告：此腳本會刪除所有資料！
-- ============================================================================
-- 只有在需要完全重置時才執行此腳本
-- ============================================================================

-- 停用所有表的 RLS（避免刪除時出現問題）
ALTER TABLE IF EXISTS quotation_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quotation_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS company_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exchange_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quotation_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;

-- 刪除表（按照依賴順序，從最後的表開始）
DROP TABLE IF EXISTS quotation_versions CASCADE;
DROP TABLE IF EXISTS quotation_shares CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS payment_schedules CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS customer_contracts CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;
DROP TABLE IF EXISTS company_members CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- 刪除觸發器函數
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 驗證清理結果
SELECT
  '🧹 清理完成' as status,
  COUNT(*) as remaining_tables
FROM pg_tables
WHERE schemaname = 'public';

-- ============================================================================
-- 完成！現在可以執行 COMPLETE_MIGRATION.sql
-- ============================================================================
