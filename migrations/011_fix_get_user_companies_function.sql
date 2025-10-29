-- ============================================================================
-- Migration 011: Fix get_user_companies function
-- Created: 2025-10-29
-- Description: Fix return type mismatch - companies.name is varchar not jsonb
-- ============================================================================

-- Drop the old function
DROP FUNCTION IF EXISTS get_user_companies(UUID);

-- Recreate with correct types based on actual table structure
CREATE OR REPLACE FUNCTION get_user_companies(p_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name VARCHAR(255),
  role_name VARCHAR(50),
  is_owner BOOLEAN,
  logo_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    r.name as role_name,
    cm.is_owner,
    c.logo_url
  FROM companies c
  INNER JOIN company_members cm ON c.id = cm.company_id
  INNER JOIN roles r ON cm.role_id = r.id
  WHERE cm.user_id = p_user_id
  AND cm.is_active = true
  ORDER BY cm.is_owner DESC, cm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_companies IS
  '取得使用者所屬的公司列表 - 修正版本（company_name 為 VARCHAR）';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 011 completed successfully!' as status,
       'Fixed get_user_companies function return type' as description;
