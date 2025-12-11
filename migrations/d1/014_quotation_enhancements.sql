-- ============================================================================
-- Migration 014: Quotation Enhancements (D1)
-- Created: 2025-12-11
-- Description:
--   1. 新增 show_tax 欄位，控制稅金是否顯示
--   2. 新增 discount_amount 和 discount_description 欄位，支援整體折扣
--   3. 建立 quotation_images 表，支援報價單附件照片
-- ============================================================================

-- ============================================================================
-- 1. 新增稅金顯示控制欄位
-- ============================================================================

ALTER TABLE quotations ADD COLUMN show_tax INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- 2. 新增整體折扣欄位
-- ============================================================================

ALTER TABLE quotations ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;

ALTER TABLE quotations ADD COLUMN discount_description TEXT;

-- ============================================================================
-- 3. 建立報價單附件照片表
-- ============================================================================

CREATE TABLE IF NOT EXISTS quotation_images (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  caption TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_quotation_images_quotation ON quotation_images(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_images_sort ON quotation_images(quotation_id, sort_order);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 014 completed successfully!' as status,
       'Added show_tax, discount fields, and quotation_images table' as description;
