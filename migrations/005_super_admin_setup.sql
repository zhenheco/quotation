-- ============================================================================
-- Super Admin Setup and Enhanced Permissions
-- ============================================================================
-- Migration: 005
-- Created: 2025-10-18
-- Description: Sets up super admin account and enhanced permission system
--              Adds cross-company access control and RLS policies

-- ============================================================================
-- 1. 設定超級管理員帳號
-- ============================================================================
DO $$
DECLARE
  super_admin_email TEXT := 'acejou27@gmail.com';
  super_admin_user_id UUID;
  super_admin_role_id UUID;
BEGIN
  -- Zeabur PostgreSQL 不使用 auth schema
  -- 使用 user_profiles 表來尋找使用者，或建立佔位符
  -- 實際的 user_id 會在使用者首次登入時由 Supabase Auth 提供

  -- 嘗試從 user_profiles 尋找已存在的超級管理員
  SELECT user_id INTO super_admin_user_id
  FROM user_profiles
  WHERE full_name = '系統管理員'
  OR display_name = 'Super Admin'
  LIMIT 1;

  -- 如果沒找到，建立一個佔位符
  IF super_admin_user_id IS NULL THEN
    super_admin_user_id := '00000000-0000-0000-0000-000000000001'::UUID;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating placeholder super admin user';
    RAISE NOTICE 'User ID: %', super_admin_user_id;
    RAISE NOTICE 'IMPORTANT: This will be updated when % signs up', super_admin_email;
    RAISE NOTICE '========================================';
  END IF;

  -- 取得 super_admin 角色 ID
  SELECT id INTO super_admin_role_id
  FROM roles
  WHERE name = 'super_admin';

  IF super_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'super_admin role not found in roles table';
  END IF;

  -- 建立使用者 profile（如果不存在）
  INSERT INTO user_profiles (user_id, full_name, display_name, is_active)
  VALUES (super_admin_user_id, '系統管理員', 'Super Admin', true)
  ON CONFLICT (user_id) DO UPDATE
  SET
    is_active = true,
    full_name = COALESCE(user_profiles.full_name, '系統管理員'),
    display_name = COALESCE(user_profiles.display_name, 'Super Admin');

  -- 分配 super_admin 角色
  INSERT INTO user_roles (user_id, role_id, assigned_by)
  VALUES (super_admin_user_id, super_admin_role_id, super_admin_user_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Super admin setup completed!';
  RAISE NOTICE 'Email: %', super_admin_email;
  RAISE NOTICE 'User ID: %', super_admin_user_id;
  RAISE NOTICE '===========================================';
END $$;

-- ============================================================================
-- 2. 跨公司權限檢查函數
-- ============================================================================

-- 檢查使用者是否可以存取指定公司
CREATE OR REPLACE FUNCTION can_access_company(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_super_admin BOOLEAN;
  is_member BOOLEAN;
BEGIN
  -- 檢查是否為超級管理員
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.name = 'super_admin'
  ) INTO is_super_admin;

  -- 超管可以存取所有公司
  IF is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- 檢查是否為公司成員
  SELECT is_company_member(p_user_id, p_company_id) INTO is_member;
  RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_access_company(UUID, UUID) IS
'檢查使用者是否可以存取指定公司。超級管理員可以存取所有公司，一般使用者只能存取所屬公司。';

-- ============================================================================
-- 3. 取得可管理公司列表
-- ============================================================================

CREATE OR REPLACE FUNCTION get_manageable_companies(p_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name JSONB,
  role_name VARCHAR,
  is_owner BOOLEAN,
  can_manage_members BOOLEAN,
  member_count BIGINT
) AS $$
DECLARE
  is_super_admin BOOLEAN;
BEGIN
  -- 檢查是否為超級管理員
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.name = 'super_admin'
  ) INTO is_super_admin;

  IF is_super_admin THEN
    -- 超管可以看到所有公司
    RETURN QUERY
    SELECT
      c.id,
      c.name,
      'super_admin'::VARCHAR as role_name,
      false as is_owner,
      true as can_manage_members,
      (SELECT COUNT(*) FROM company_members WHERE company_id = c.id AND is_active = true) as member_count
    FROM companies c
    ORDER BY c.created_at DESC;
  ELSE
    -- 一般使用者只能看到所屬公司，且需要是 owner 才能管理
    RETURN QUERY
    SELECT
      c.id,
      c.name,
      r.name as role_name,
      cm.is_owner,
      cm.is_owner as can_manage_members,
      (SELECT COUNT(*) FROM company_members WHERE company_id = c.id AND is_active = true) as member_count
    FROM companies c
    INNER JOIN company_members cm ON c.id = cm.company_id
    INNER JOIN roles r ON cm.role_id = r.id
    WHERE cm.user_id = p_user_id
    AND cm.is_active = true
    ORDER BY cm.is_owner DESC, cm.joined_at ASC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_manageable_companies(UUID) IS
'取得使用者可以管理的公司列表。超級管理員可以看到所有公司，一般使用者只能看到所屬公司。';

-- ============================================================================
-- 4. 檢查是否可以管理指定使用者
-- ============================================================================

CREATE OR REPLACE FUNCTION can_manage_user(
  p_requesting_user_id UUID,
  p_target_user_id UUID,
  p_company_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  is_super_admin BOOLEAN;
  is_owner BOOLEAN;
BEGIN
  -- 不能管理自己
  IF p_requesting_user_id = p_target_user_id THEN
    RETURN FALSE;
  END IF;

  -- 檢查是否為超級管理員
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_requesting_user_id
    AND r.name = 'super_admin'
  ) INTO is_super_admin;

  -- 超管可以管理任何人
  IF is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- 如果指定了公司，檢查是否為該公司的 owner
  IF p_company_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM company_members
      WHERE company_id = p_company_id
      AND user_id = p_requesting_user_id
      AND is_owner = true
      AND is_active = true
    ) INTO is_owner;

    RETURN is_owner;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_manage_user(UUID, UUID, UUID) IS
'檢查使用者是否可以管理另一個使用者。超級管理員可以管理任何人，公司 owner 可以管理自己公司的成員。';

-- ============================================================================
-- 5. 檢查角色分配權限
-- ============================================================================

CREATE OR REPLACE FUNCTION can_assign_role(
  p_requesting_user_id UUID,
  p_target_role_name VARCHAR,
  p_company_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  is_super_admin BOOLEAN;
  is_owner BOOLEAN;
  target_role_level INTEGER;
BEGIN
  -- 檢查是否為超級管理員
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_requesting_user_id
    AND r.name = 'super_admin'
  ) INTO is_super_admin;

  -- 超管可以分配任何角色
  IF is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- 取得目標角色的 level
  SELECT level INTO target_role_level
  FROM roles
  WHERE name = p_target_role_name;

  IF target_role_level IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 如果指定了公司，檢查是否為該公司的 owner
  IF p_company_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM company_members
      WHERE company_id = p_company_id
      AND user_id = p_requesting_user_id
      AND is_owner = true
      AND is_active = true
    ) INTO is_owner;

    -- Company owner 只能分配 level >= 3 的角色
    -- (不能分配 super_admin 和 company_owner)
    IF is_owner THEN
      RETURN target_role_level >= 3;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_assign_role(UUID, VARCHAR, UUID) IS
'檢查使用者是否可以分配指定角色。超級管理員可以分配任何角色，公司 owner 只能分配 level >= 3 的角色。';

-- ============================================================================
-- 6. Row Level Security (RLS) 政策
-- ============================================================================

-- 先移除現有政策（如果存在）
DO $$
BEGIN
  -- Companies policies
  DROP POLICY IF EXISTS companies_select_policy ON companies;
  DROP POLICY IF EXISTS companies_insert_policy ON companies;
  DROP POLICY IF EXISTS companies_update_policy ON companies;
  DROP POLICY IF EXISTS companies_delete_policy ON companies;

  -- Company members policies
  DROP POLICY IF EXISTS company_members_select_policy ON company_members;
  DROP POLICY IF EXISTS company_members_insert_policy ON company_members;
  DROP POLICY IF EXISTS company_members_update_policy ON company_members;
  DROP POLICY IF EXISTS company_members_delete_policy ON company_members;

  -- Business data policies
  DROP POLICY IF EXISTS customers_select_policy ON customers;
  DROP POLICY IF EXISTS customers_insert_policy ON customers;
  DROP POLICY IF EXISTS customers_update_policy ON customers;
  DROP POLICY IF EXISTS customers_delete_policy ON customers;

  DROP POLICY IF EXISTS products_select_policy ON products;
  DROP POLICY IF EXISTS products_insert_policy ON products;
  DROP POLICY IF EXISTS products_update_policy ON products;
  DROP POLICY IF EXISTS products_delete_policy ON products;

  DROP POLICY IF EXISTS quotations_select_policy ON quotations;
  DROP POLICY IF EXISTS quotations_insert_policy ON quotations;
  DROP POLICY IF EXISTS quotations_update_policy ON quotations;
  DROP POLICY IF EXISTS quotations_delete_policy ON quotations;
END $$;

-- 啟用 RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Companies 政策
-- ============================================================================

CREATE POLICY companies_select_policy ON companies
  FOR SELECT
  USING (
    can_access_company(current_setting('app.user_id', true)::UUID, id)
  );

CREATE POLICY companies_insert_policy ON companies
  FOR INSERT
  WITH CHECK (
    -- Super admin 可以建立
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = current_setting('app.user_id', true)::UUID
      AND r.name = 'super_admin'
    )
    OR
    -- 任何認證使用者都可以建立公司（會自動成為 owner）
    current_setting('app.user_id', true)::UUID IS NOT NULL
  );

CREATE POLICY companies_update_policy ON companies
  FOR UPDATE
  USING (
    -- Super admin 可以更新任何公司
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = current_setting('app.user_id', true)::UUID
      AND r.name = 'super_admin'
    )
    OR
    -- Company owner 可以更新自己的公司
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = companies.id
      AND cm.user_id = current_setting('app.user_id', true)::UUID
      AND cm.is_owner = true
      AND cm.is_active = true
    )
  );

CREATE POLICY companies_delete_policy ON companies
  FOR DELETE
  USING (
    -- 只有 super admin 可以刪除公司
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = current_setting('app.user_id', true)::UUID
      AND r.name = 'super_admin'
    )
  );

-- ============================================================================
-- Company Members 政策
-- ============================================================================

CREATE POLICY company_members_select_policy ON company_members
  FOR SELECT
  USING (
    -- Super admin 可以看所有成員
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = current_setting('app.user_id', true)::UUID
      AND r.name = 'super_admin'
    )
    OR
    -- 公司成員可以看同公司的成員
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = current_setting('app.user_id', true)::UUID
      AND cm.is_active = true
    )
  );

CREATE POLICY company_members_insert_policy ON company_members
  FOR INSERT
  WITH CHECK (
    -- Super admin 可以新增
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = current_setting('app.user_id', true)::UUID
      AND r.name = 'super_admin'
    )
    OR
    -- Company owner 可以新增成員
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = company_members.company_id
      AND cm.user_id = current_setting('app.user_id', true)::UUID
      AND cm.is_owner = true
      AND cm.is_active = true
    )
  );

CREATE POLICY company_members_update_policy ON company_members
  FOR UPDATE
  USING (
    -- Super admin 可以更新
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = current_setting('app.user_id', true)::UUID
      AND r.name = 'super_admin'
    )
    OR
    -- Company owner 可以更新成員（但不能更改自己的 owner 狀態）
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = company_members.company_id
      AND cm.user_id = current_setting('app.user_id', true)::UUID
      AND cm.is_owner = true
      AND cm.is_active = true
      AND NOT (
        company_members.user_id = cm.user_id
        AND company_members.is_owner != (SELECT is_owner FROM company_members WHERE id = company_members.id)
      )
    )
  );

CREATE POLICY company_members_delete_policy ON company_members
  FOR DELETE
  USING (
    -- Super admin 可以刪除
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = current_setting('app.user_id', true)::UUID
      AND r.name = 'super_admin'
    )
    OR
    -- Company owner 可以刪除成員（但不能刪除自己）
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = company_members.company_id
      AND cm.user_id = current_setting('app.user_id', true)::UUID
      AND cm.is_owner = true
      AND cm.is_active = true
      AND company_members.user_id != cm.user_id
    )
  );

-- ============================================================================
-- Customers 政策
-- ============================================================================

CREATE POLICY customers_select_policy ON customers
  FOR SELECT
  USING (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

CREATE POLICY customers_insert_policy ON customers
  FOR INSERT
  WITH CHECK (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

CREATE POLICY customers_update_policy ON customers
  FOR UPDATE
  USING (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

CREATE POLICY customers_delete_policy ON customers
  FOR DELETE
  USING (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

-- ============================================================================
-- Products 政策
-- ============================================================================

CREATE POLICY products_select_policy ON products
  FOR SELECT
  USING (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

CREATE POLICY products_insert_policy ON products
  FOR INSERT
  WITH CHECK (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

CREATE POLICY products_update_policy ON products
  FOR UPDATE
  USING (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

CREATE POLICY products_delete_policy ON products
  FOR DELETE
  USING (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

-- ============================================================================
-- Quotations 政策
-- ============================================================================

CREATE POLICY quotations_select_policy ON quotations
  FOR SELECT
  USING (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

CREATE POLICY quotations_insert_policy ON quotations
  FOR INSERT
  WITH CHECK (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

CREATE POLICY quotations_update_policy ON quotations
  FOR UPDATE
  USING (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

CREATE POLICY quotations_delete_policy ON quotations
  FOR DELETE
  USING (
    company_id IS NULL
    OR can_access_company(current_setting('app.user_id', true)::UUID, company_id)
  );

-- ============================================================================
-- 7. 建立 helper view: 使用者完整資訊
-- ============================================================================

CREATE OR REPLACE VIEW user_with_companies AS
SELECT
  up.user_id,
  up.full_name,
  up.display_name,
  up.phone,
  up.avatar_url,
  up.is_active,
  up.last_login_at,
  json_agg(
    DISTINCT jsonb_build_object(
      'company_id', c.id,
      'company_name', c.name,
      'role_name', r.name,
      'role_level', r.level,
      'is_owner', cm.is_owner
    )
  ) FILTER (WHERE c.id IS NOT NULL) as companies,
  json_agg(
    DISTINCT jsonb_build_object(
      'role_name', r2.name,
      'role_level', r2.level
    )
  ) FILTER (WHERE r2.id IS NOT NULL) as global_roles
FROM user_profiles up
LEFT JOIN company_members cm ON up.user_id = cm.user_id AND cm.is_active = true
LEFT JOIN companies c ON cm.company_id = c.id
LEFT JOIN roles r ON cm.role_id = r.id
LEFT JOIN user_roles ur ON up.user_id = ur.user_id
LEFT JOIN roles r2 ON ur.role_id = r2.id
GROUP BY up.user_id, up.full_name, up.display_name, up.phone, up.avatar_url, up.is_active, up.last_login_at;

COMMENT ON VIEW user_with_companies IS
'使用者完整資訊視圖，包含所屬公司和全域角色。';

-- ============================================================================
-- 完成
-- ============================================================================

SELECT
  '✓ Super admin setup completed!' as status,
  'Migration 005 executed successfully' as message,
  NOW() as executed_at;
