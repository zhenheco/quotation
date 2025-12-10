-- ============================================================================
-- Migration 035: RLS Helper Functions
-- Created: 2025-12-10
-- Description: 建立 RLS 政策所需的輔助函數
-- ============================================================================

-- ============================================================================
-- 1. is_super_admin() - 檢查當前用戶是否為超級管理員
-- ============================================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- 檢查當前用戶是否有 super_admin 角色
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_super_admin() IS
  '檢查當前用戶是否為超級管理員（用於 RLS 政策）';

-- ============================================================================
-- 2. can_access_company_rls() - 檢查當前用戶是否可存取指定公司
-- ============================================================================

CREATE OR REPLACE FUNCTION can_access_company_rls(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- 如果 company_id 為 NULL，返回 true（相容舊資料）
  IF p_company_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- 超級管理員可以存取所有公司
  IF is_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- 檢查是否為公司成員
  RETURN EXISTS (
    SELECT 1
    FROM company_members
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_access_company_rls(UUID) IS
  '檢查當前用戶是否可存取指定公司。超級管理員可存取所有公司，一般用戶只能存取所屬公司。';

-- ============================================================================
-- 3. is_company_owner() - 檢查當前用戶是否為公司所有者
-- ============================================================================

CREATE OR REPLACE FUNCTION is_company_owner(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_company_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM company_members
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND is_owner = true
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_company_owner(UUID) IS
  '檢查當前用戶是否為指定公司的所有者';

-- ============================================================================
-- 4. get_user_company_ids() - 取得當前用戶所屬的所有公司 ID
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT company_id
  FROM company_members
  WHERE user_id = auth.uid()
  AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_company_ids() IS
  '取得當前用戶所屬的所有公司 ID（用於 RLS 政策的 IN 查詢）';

-- ============================================================================
-- 授權
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_company_rls(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_company_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company_ids() TO authenticated;

-- ============================================================================
-- 記錄 Migration
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('035_rls_helper_functions.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 035 completed: RLS Helper Functions created';
  RAISE NOTICE '   - is_super_admin()';
  RAISE NOTICE '   - can_access_company_rls(UUID)';
  RAISE NOTICE '   - is_company_owner(UUID)';
  RAISE NOTICE '   - get_user_company_ids()';
END $$;
