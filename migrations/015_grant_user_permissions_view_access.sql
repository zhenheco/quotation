-- ============================================================================
-- Migration 015: Grant access to user_permissions view
-- Created: 2025-10-29
-- Description: Grant SELECT permission on user_permissions view to authenticated users
-- ============================================================================

-- Grant SELECT permission to authenticated users
GRANT SELECT ON user_permissions TO authenticated;

-- Grant SELECT permission to anon users (for public access if needed)
GRANT SELECT ON user_permissions TO anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 015 completed successfully!' as status,
       'Granted SELECT permission on user_permissions view to authenticated and anon roles' as description;
