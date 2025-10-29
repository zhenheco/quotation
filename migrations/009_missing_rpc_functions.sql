-- ============================================================================
-- Migration 009: Missing RPC Functions
-- Created: 2025-10-29
-- Description: Add RPC functions for company, payments, and RBAC services
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION - can_access_company
-- Check if a user can access a company
-- ============================================================================

CREATE OR REPLACE FUNCTION can_access_company(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_member BOOLEAN;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if user is super admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND r.name = 'super_admin'
      AND ur.is_active = true
  ) INTO v_is_super_admin;

  IF v_is_super_admin THEN
    RETURN true;
  END IF;

  -- Check if user is a member of the company
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND is_active = true
  ) INTO v_is_member;

  RETURN v_is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_access_company IS
  '檢查使用者是否可以存取指定公司';

-- ============================================================================
-- 2. FUNCTION - can_assign_role
-- Check if a user can assign a specific role
-- ============================================================================

CREATE OR REPLACE FUNCTION can_assign_role(
  p_user_id UUID,
  p_role_name VARCHAR(50),
  p_company_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_is_owner BOOLEAN;
  v_role_level INTEGER;
  v_user_level INTEGER;
BEGIN
  -- Get role level
  SELECT level INTO v_role_level
  FROM roles
  WHERE name = p_role_name;

  IF v_role_level IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user is super admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND r.name = 'super_admin'
      AND ur.is_active = true
  ) INTO v_is_super_admin;

  IF v_is_super_admin THEN
    RETURN true;
  END IF;

  -- For company roles, check if user is company owner
  IF p_company_id IS NOT NULL THEN
    SELECT is_owner INTO v_is_owner
    FROM company_members
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND is_active = true;

    IF v_is_owner THEN
      -- Owner can assign roles below their level
      SELECT MAX(r.level) INTO v_user_level
      FROM company_members cm
      JOIN roles r ON cm.role_id = r.id
      WHERE cm.user_id = p_user_id
        AND cm.company_id = p_company_id
        AND cm.is_active = true;

      RETURN v_user_level >= v_role_level;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_assign_role IS
  '檢查使用者是否可以分配指定角色';

-- ============================================================================
-- 3. FUNCTION - can_manage_user
-- Check if a user can manage another user
-- ============================================================================

CREATE OR REPLACE FUNCTION can_manage_user(
  p_manager_id UUID,
  p_target_user_id UUID,
  p_company_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_is_owner BOOLEAN;
  v_manager_level INTEGER;
  v_target_level INTEGER;
BEGIN
  -- Users can always manage themselves
  IF p_manager_id = p_target_user_id THEN
    RETURN true;
  END IF;

  -- Check if manager is super admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_manager_id
      AND r.name = 'super_admin'
      AND ur.is_active = true
  ) INTO v_is_super_admin;

  IF v_is_super_admin THEN
    RETURN true;
  END IF;

  -- For company context, check ownership and role levels
  IF p_company_id IS NOT NULL THEN
    -- Check if manager is company owner
    SELECT is_owner INTO v_is_owner
    FROM company_members
    WHERE user_id = p_manager_id
      AND company_id = p_company_id
      AND is_active = true;

    IF v_is_owner THEN
      RETURN true;
    END IF;

    -- Check role levels
    SELECT MAX(r.level) INTO v_manager_level
    FROM company_members cm
    JOIN roles r ON cm.role_id = r.id
    WHERE cm.user_id = p_manager_id
      AND cm.company_id = p_company_id
      AND cm.is_active = true;

    SELECT MAX(r.level) INTO v_target_level
    FROM company_members cm
    JOIN roles r ON cm.role_id = r.id
    WHERE cm.user_id = p_target_user_id
      AND cm.company_id = p_company_id
      AND cm.is_active = true;

    -- Manager can manage users with lower role level
    RETURN v_manager_level > v_target_level;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_manage_user IS
  '檢查使用者是否可以管理其他使用者';

-- ============================================================================
-- 4. FUNCTION - get_manageable_companies
-- Get list of companies that a user can manage
-- ============================================================================

CREATE OR REPLACE FUNCTION get_manageable_companies(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name JSONB,
  logo_url TEXT,
  tax_id VARCHAR(50),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_owner BOOLEAN,
  role_name VARCHAR(50),
  member_count BIGINT
) AS $$
BEGIN
  -- Super admins can manage all companies
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND r.name = 'super_admin'
      AND ur.is_active = true
  ) THEN
    RETURN QUERY
    SELECT
      c.id,
      c.name,
      c.logo_url,
      c.tax_id,
      c.phone,
      c.email,
      false as is_owner,
      'super_admin'::VARCHAR(50) as role_name,
      COUNT(DISTINCT cm.id) as member_count
    FROM companies c
    LEFT JOIN company_members cm ON c.id = cm.company_id AND cm.is_active = true
    GROUP BY c.id;
  ELSE
    -- Regular users can only manage companies they own or are managers in
    RETURN QUERY
    SELECT
      c.id,
      c.name,
      c.logo_url,
      c.tax_id,
      c.phone,
      c.email,
      cm_user.is_owner,
      r.name as role_name,
      COUNT(DISTINCT cm.id) as member_count
    FROM companies c
    JOIN company_members cm_user ON c.id = cm_user.company_id
    JOIN roles r ON cm_user.role_id = r.id
    LEFT JOIN company_members cm ON c.id = cm.company_id AND cm.is_active = true
    WHERE cm_user.user_id = p_user_id
      AND cm_user.is_active = true
      AND (cm_user.is_owner = true OR r.level >= 50)  -- Owner or manager level
    GROUP BY c.id, cm_user.is_owner, r.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_manageable_companies IS
  '取得使用者可以管理的公司列表';

-- ============================================================================
-- 5. FUNCTION - get_payments_by_month
-- Get payment statistics grouped by month
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payments_by_month(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  month DATE,
  total_amount DECIMAL(12,2),
  collected_amount DECIMAL(12,2),
  pending_amount DECIMAL(12,2),
  payment_count BIGINT,
  collected_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', p.payment_date)::DATE as month,
    SUM(p.amount) as total_amount,
    SUM(CASE WHEN p.payment_status = 'collected' THEN p.amount ELSE 0 END) as collected_amount,
    SUM(CASE WHEN p.payment_status IN ('pending', 'overdue') THEN p.amount ELSE 0 END) as pending_amount,
    COUNT(*) as payment_count,
    COUNT(*) FILTER (WHERE p.payment_status = 'collected') as collected_count
  FROM payments p
  WHERE p.user_id = p_user_id
    AND (p_start_date IS NULL OR p.payment_date >= p_start_date)
    AND (p_end_date IS NULL OR p.payment_date <= p_end_date)
  GROUP BY DATE_TRUNC('month', p.payment_date)
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_payments_by_month IS
  '按月份統計收款資料';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 009 completed successfully!' as status,
       'Added missing RPC functions for company, payments, and RBAC services' as description;
