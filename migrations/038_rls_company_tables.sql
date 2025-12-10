-- ============================================================================
-- Migration 038: RLS for Company Tables
-- Created: 2025-12-10
-- Description: 為公司相關表啟用 RLS
--              companies, company_members, company_settings
-- ============================================================================

-- ============================================================================
-- 1. companies - 公司表
-- 策略：公司成員可查看自己的公司，super_admin 可查看所有
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Super admin 可存取所有公司
CREATE POLICY "companies_super_admin"
ON companies FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 公司成員可查看自己的公司
CREATE POLICY "companies_select_member"
ON companies FOR SELECT
TO authenticated
USING (
  id IN (SELECT get_user_company_ids())
);

-- 任何已認證用戶可建立公司
CREATE POLICY "companies_insert_authenticated"
ON companies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 公司 owner 可更新公司資料
CREATE POLICY "companies_update_owner"
ON companies FOR UPDATE
TO authenticated
USING (is_company_owner(id));

-- Service role 完全存取
CREATE POLICY "companies_service_role"
ON companies FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 2. company_members - 公司成員表
-- 策略：公司成員可查看同公司成員，owner 可管理成員
-- ============================================================================

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- Super admin 完全存取
CREATE POLICY "company_members_super_admin"
ON company_members FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 公司成員可查看同公司的成員
CREATE POLICY "company_members_select_same_company"
ON company_members FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT get_user_company_ids())
);

-- 公司 owner 可新增成員
CREATE POLICY "company_members_insert_owner"
ON company_members FOR INSERT
TO authenticated
WITH CHECK (is_company_owner(company_id));

-- 公司 owner 可更新成員（但不能更改自己的 owner 狀態）
CREATE POLICY "company_members_update_owner"
ON company_members FOR UPDATE
TO authenticated
USING (
  is_company_owner(company_id)
  -- 不能更改自己的 owner 狀態（防止 owner 把自己降級）
  AND NOT (user_id = auth.uid() AND is_owner = false)
);

-- 公司 owner 可刪除成員（但不能刪除自己）
CREATE POLICY "company_members_delete_owner"
ON company_members FOR DELETE
TO authenticated
USING (
  is_company_owner(company_id)
  AND user_id != auth.uid()
);

-- Service role 完全存取
CREATE POLICY "company_members_service_role"
ON company_members FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. company_settings - 公司設定表
-- 策略：用戶只能存取自己的設定
-- ============================================================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Super admin 完全存取
CREATE POLICY "company_settings_super_admin"
ON company_settings FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 用戶可存取自己的設定
CREATE POLICY "company_settings_own"
ON company_settings FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role 完全存取
CREATE POLICY "company_settings_service_role"
ON company_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 記錄 Migration
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('038_rls_company_tables.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 038 completed: Company Tables RLS enabled';
  RAISE NOTICE '   - companies: RLS enabled';
  RAISE NOTICE '   - company_members: RLS enabled';
  RAISE NOTICE '   - company_settings: RLS enabled';
END $$;
