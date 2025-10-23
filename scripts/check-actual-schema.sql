-- ============================================================================
-- 檢查 Supabase 實際 Schema 狀態
-- 請在 Supabase Dashboard SQL Editor 執行此腳本
-- ============================================================================

-- 1. 檢查所有 public schema 的表
SELECT
  'PUBLIC 表列表' as category,
  tablename as name,
  schemaname as schema
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. 檢查表是否存在於任何 schema
SELECT
  'ALL SCHEMAS 表搜尋' as category,
  table_schema as schema,
  table_name as name
FROM information_schema.tables
WHERE table_name IN (
  'roles', 'permissions', 'role_permissions',
  'user_roles', 'user_profiles', 'companies',
  'company_members', 'company_settings',
  'customer_contracts', 'payments', 'payment_schedules',
  'audit_logs', 'quotation_shares', 'quotation_versions'
)
ORDER BY table_schema, table_name;

-- 3. 檢查 roles 表的實際資料
SELECT
  'ROLES 資料' as category,
  name,
  name_zh,
  level
FROM roles
ORDER BY level;

-- 4. 檢查 permissions 表的實際資料
SELECT
  'PERMISSIONS 資料' as category,
  COUNT(*) as total_permissions
FROM permissions;

-- 5. 檢查 RLS 狀態
SELECT
  'RLS 狀態' as category,
  schemaname as schema,
  tablename as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 6. 檢查索引
SELECT
  'INDEX 狀態' as category,
  COUNT(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public';

-- 7. 檢查外鍵
SELECT
  'FOREIGN KEY 狀態' as category,
  COUNT(*) as total_foreign_keys
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND constraint_type = 'FOREIGN KEY';

-- 8. 檢查觸發器
SELECT
  'TRIGGER 狀態' as category,
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname LIKE 'trigger_update_%_timestamp'
ORDER BY tgname;
