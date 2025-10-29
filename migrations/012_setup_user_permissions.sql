-- ============================================================================
-- Migration 012: Setup User Permissions
-- Created: 2025-10-29
-- Description: Create missing permissions and assign roles to existing users
-- ============================================================================

-- ============================================================================
-- 1. Create Missing Permissions (Contracts)
-- ============================================================================

INSERT INTO permissions (name, name_zh, name_en, category, description)
VALUES
  ('view_contracts', '查看合約', 'View Contracts', 'contract_management', 'View contract list and details'),
  ('create_contracts', '建立合約', 'Create Contracts', 'contract_management', 'Create new contracts'),
  ('edit_contracts', '編輯合約', 'Edit Contracts', 'contract_management', 'Edit contract information'),
  ('delete_contracts', '刪除合約', 'Delete Contracts', 'contract_management', 'Delete contracts')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. Assign All Permissions to company_owner Role
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'company_owner'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 3. Assign company_owner Role to All Existing Users
-- ============================================================================

INSERT INTO user_roles (user_id, role_id, is_active)
SELECT
  u.id,
  r.id,
  true
FROM auth.users u
CROSS JOIN roles r
WHERE r.name = 'company_owner'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 012 completed successfully!' as status,
       'Setup user permissions and assigned roles' as description;
