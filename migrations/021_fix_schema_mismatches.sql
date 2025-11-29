-- ============================================================================
-- Migration 021: Fix Schema Mismatches
-- 修復資料庫 schema 與程式碼不匹配的問題
-- ============================================================================

-- 1. payment_schedules 新增 quotation_id 和其他缺失欄位
ALTER TABLE payment_schedules
  ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL;

ALTER TABLE payment_schedules
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE payment_schedules
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'contract';

-- 2. quotations 新增缺失欄位
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS terms JSONB;

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6);

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS payment_notes TEXT;

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 3. quotation_items 新增 unit 欄位
ALTER TABLE quotation_items
  ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

ALTER TABLE quotation_items
  ADD COLUMN IF NOT EXISTS description JSONB;

-- 4. 建立缺失的索引
CREATE INDEX IF NOT EXISTS idx_payment_schedules_quotation_id ON payment_schedules(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON quotations(company_id);

-- 5. 更新 payment_schedules 的 contract_id 為可選（支援直接關聯報價單）
-- 注意：這需要先檢查是否有資料，避免破壞現有資料
DO $$
BEGIN
  -- 檢查 contract_id 欄位是否為 NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_schedules'
    AND column_name = 'contract_id'
    AND is_nullable = 'NO'
  ) THEN
    -- 修改為可空（允許只關聯報價單）
    ALTER TABLE payment_schedules ALTER COLUMN contract_id DROP NOT NULL;
  END IF;
END $$;

-- 完成
SELECT 'Migration 021 completed: Schema mismatches fixed' as status;
