-- Migration: Add brand colors to companies table
-- Description: Allows companies to customize their brand colors for PDF and email templates

ALTER TABLE companies ADD COLUMN brand_colors TEXT DEFAULT NULL;

-- brand_colors stores JSON format:
-- {
--   "primary": "#4f46e5",    -- Main color for headers, titles
--   "secondary": "#f3f4f6",  -- Background color for sections
--   "text": "#111827"        -- Text color
-- }
