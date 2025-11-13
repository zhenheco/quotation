-- ============================================================================
-- Migration: 新增報價單雙語文字欄位
-- Purpose: 支援 BilingualText 格式的 description 和 notes
-- ============================================================================

-- 1. quotation_items 新增 description 欄位
ALTER TABLE quotation_items ADD COLUMN description TEXT;

-- 2. quotations.notes 欄位已存在，無需新增

-- ============================================================================
-- Rollback Script（如需回滾）
-- ============================================================================
-- ALTER TABLE quotation_items DROP COLUMN description;
