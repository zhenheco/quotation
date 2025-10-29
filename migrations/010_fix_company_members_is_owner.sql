-- ============================================================================
-- Migration 010: Fix company_members table - Add is_owner column
-- Created: 2025-10-29
-- Description: Add missing is_owner column to company_members table
-- ============================================================================

-- Add is_owner column to company_members table
ALTER TABLE company_members
ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_company_members_is_owner
ON company_members(company_id, is_owner)
WHERE is_owner = true;

-- Update existing records: set first member of each company as owner
WITH first_members AS (
  SELECT DISTINCT ON (company_id)
    id,
    company_id
  FROM company_members
  ORDER BY company_id, joined_at ASC
)
UPDATE company_members cm
SET is_owner = true
FROM first_members fm
WHERE cm.id = fm.id
  AND cm.is_owner = false;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 010 completed successfully!' as status,
       'Added is_owner column to company_members table' as description;
