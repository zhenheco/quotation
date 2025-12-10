-- ============================================================================
-- Migration 036: RLS for System Tables
-- Created: 2025-12-10
-- Description: 為系統表啟用 RLS
--              roles, permissions, role_permissions, exchange_rates, schema_migrations
-- ============================================================================

-- ============================================================================
-- 1. roles - 角色表
-- 策略：所有人可讀，僅 super_admin 可修改
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 所有已認證用戶可讀取角色
CREATE POLICY "roles_select_authenticated"
ON roles FOR SELECT
TO authenticated
USING (true);

-- 僅 super_admin 可修改角色
CREATE POLICY "roles_modify_super_admin"
ON roles FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Service role 完全存取（用於系統操作）
CREATE POLICY "roles_service_role"
ON roles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 2. permissions - 權限表
-- 策略：所有人可讀，僅 super_admin 可修改
-- ============================================================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_select_authenticated"
ON permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "permissions_modify_super_admin"
ON permissions FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "permissions_service_role"
ON permissions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. role_permissions - 角色權限關聯表
-- 策略：所有人可讀，僅 super_admin 可修改
-- ============================================================================

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select_authenticated"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "role_permissions_modify_super_admin"
ON role_permissions FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "role_permissions_service_role"
ON role_permissions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. exchange_rates - 匯率表
-- 策略：所有人可讀（查看匯率），super_admin 可修改
-- ============================================================================

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exchange_rates_select_authenticated"
ON exchange_rates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "exchange_rates_modify_super_admin"
ON exchange_rates FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "exchange_rates_service_role"
ON exchange_rates FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 5. schema_migrations - Migration 追蹤表
-- 策略：僅 super_admin 和 service_role 可存取
-- ============================================================================

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schema_migrations_super_admin"
ON schema_migrations FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "schema_migrations_service_role"
ON schema_migrations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 記錄 Migration
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('036_rls_system_tables.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 036 completed: System Tables RLS enabled';
  RAISE NOTICE '   - roles: RLS enabled';
  RAISE NOTICE '   - permissions: RLS enabled';
  RAISE NOTICE '   - role_permissions: RLS enabled';
  RAISE NOTICE '   - exchange_rates: RLS enabled';
  RAISE NOTICE '   - schema_migrations: RLS enabled';
END $$;
