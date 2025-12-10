-- ============================================================================
-- Migration 037: RLS for User Tables
-- Created: 2025-12-10
-- Description: 為用戶相關表啟用 RLS
--              user_roles
-- ============================================================================

-- ============================================================================
-- 1. user_roles - 用戶角色關聯表
-- 策略：用戶只能看自己的角色，super_admin 可看所有，管理由 super_admin 執行
-- ============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 用戶可查看自己的角色
CREATE POLICY "user_roles_select_own"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Super admin 可查看所有用戶角色
CREATE POLICY "user_roles_select_super_admin"
ON user_roles FOR SELECT
TO authenticated
USING (is_super_admin());

-- Super admin 可管理用戶角色
CREATE POLICY "user_roles_modify_super_admin"
ON user_roles FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Service role 完全存取（用於系統自動分配角色）
CREATE POLICY "user_roles_service_role"
ON user_roles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 記錄 Migration
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('037_rls_user_tables.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 037 completed: User Tables RLS enabled';
  RAISE NOTICE '   - user_roles: RLS enabled';
END $$;
