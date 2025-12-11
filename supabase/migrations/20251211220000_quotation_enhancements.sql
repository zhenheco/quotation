-- ============================================================================
-- Migration 041: Quotation Enhancements
-- Created: 2025-12-11
-- Description:
--   1. 新增 show_tax 欄位，控制稅金是否顯示
--   2. 新增 discount_amount 和 discount_description 欄位，支援整體折扣
--   3. 建立 quotation_images 表，支援報價單附件照片
-- ============================================================================

-- ============================================================================
-- 1. 新增稅金顯示控制欄位
-- ============================================================================

ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS show_tax BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN quotations.show_tax IS '是否在報價單上顯示稅金';

-- ============================================================================
-- 2. 新增整體折扣欄位
-- ============================================================================

ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0;

ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS discount_description TEXT;

COMMENT ON COLUMN quotations.discount_amount IS '整體折扣金額（稅前扣除）';
COMMENT ON COLUMN quotations.discount_description IS '折扣說明（如：尾數調整）';

-- ============================================================================
-- 3. 建立報價單附件照片表
-- ============================================================================

CREATE TABLE IF NOT EXISTS quotation_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_quotation_images_quotation ON quotation_images(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_images_sort ON quotation_images(quotation_id, sort_order);

-- 啟用 RLS
ALTER TABLE quotation_images ENABLE ROW LEVEL SECURITY;

-- RLS Policy: 用戶可以管理自己公司報價單的附件照片
CREATE POLICY "Users can view quotation images for their company"
ON quotation_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quotations q
    JOIN company_members cm ON cm.company_id = q.company_id
    WHERE q.id = quotation_images.quotation_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert quotation images for their company"
ON quotation_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotations q
    JOIN company_members cm ON cm.company_id = q.company_id
    WHERE q.id = quotation_images.quotation_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update quotation images for their company"
ON quotation_images FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM quotations q
    JOIN company_members cm ON cm.company_id = q.company_id
    WHERE q.id = quotation_images.quotation_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete quotation images for their company"
ON quotation_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM quotations q
    JOIN company_members cm ON cm.company_id = q.company_id
    WHERE q.id = quotation_images.quotation_id
    AND cm.user_id = auth.uid()
  )
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
