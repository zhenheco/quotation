-- ============================================================================
-- Migration 013: Fix user_permissions view
-- Created: 2025-10-29
-- Description: Fix user_permissions view to match actual permissions table structure
-- ============================================================================

-- Drop old view that references non-existent columns
DROP VIEW IF EXISTS user_permissions;

-- Recreate view with correct column names
CREATE OR REPLACE VIEW user_permissions AS
SELECT
  ur.user_id,
  r.name as role_name,
  r.level as role_level,
  p.resource,
  p.action,
  p.name as permission_name,
  p.description
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 013 completed successfully!' as status,
       'Fixed user_permissions view to use correct column names' as description;
