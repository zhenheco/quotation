-- Migration 086: 營業稅申報核心架構
-- 1. 建立 tax_declarations 表（申報期別管理）
-- 2. 擴充 acc_invoices 欄位（declared_period_id, 固定資產, 退折讓等）

-- ============================================
-- 1. 建立 tax_declarations 表
-- ============================================
CREATE TABLE IF NOT EXISTS tax_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- 期別
  period_year INT NOT NULL,           -- 西元年
  period_bi_month INT NOT NULL        -- 1-6（雙月期：1=1-2月, 2=3-4月, ..., 6=11-12月）
    CHECK (period_bi_month BETWEEN 1 AND 6),

  -- 狀態
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'closed')),

  -- 留抵稅額
  opening_offset_amount INT NOT NULL DEFAULT 0  -- 上期結轉留抵
    CHECK (opening_offset_amount >= 0),

  -- 本期稅額
  current_output_tax INT NOT NULL DEFAULT 0,    -- 銷項稅額
  current_input_tax INT NOT NULL DEFAULT 0,     -- 進項稅額（可扣抵，含進貨費用）
  fixed_asset_input_tax INT NOT NULL DEFAULT 0, -- 固定資產進項稅額
  return_allowance_tax INT NOT NULL DEFAULT 0,  -- 退出折讓調整
  item_non_deductible_tax INT NOT NULL DEFAULT 0,  -- 單筆不可扣抵稅額
  ratio_non_deductible_tax INT NOT NULL DEFAULT 0, -- 比例不可扣抵稅額

  -- 計算結果
  net_payable_amount INT NOT NULL DEFAULT 0,    -- 應納稅額（正=繳稅）
  closing_offset_amount INT NOT NULL DEFAULT 0  -- 本期結存留抵
    CHECK (closing_offset_amount >= 0),

  -- 統計
  sales_invoice_count INT NOT NULL DEFAULT 0,
  purchase_invoice_count INT NOT NULL DEFAULT 0,

  -- 時間戳
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 唯一約束：每公司每期別只能有一筆
  UNIQUE(company_id, period_year, period_bi_month)
);

-- RLS
ALTER TABLE tax_declarations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_declarations_company_isolation ON tax_declarations;
CREATE POLICY tax_declarations_company_isolation ON tax_declarations
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- 索引
CREATE INDEX IF NOT EXISTS idx_tax_declarations_company_period
  ON tax_declarations(company_id, period_year, period_bi_month);

-- ============================================
-- 2. 擴充 acc_invoices 欄位
-- ============================================

-- 申報期別（指向 tax_declarations）
ALTER TABLE acc_invoices
  ADD COLUMN IF NOT EXISTS declared_period_id UUID REFERENCES tax_declarations(id);

-- 歷史匯入標記
ALTER TABLE acc_invoices
  ADD COLUMN IF NOT EXISTS is_historical_import BOOLEAN DEFAULT false;

-- 固定資產標記
ALTER TABLE acc_invoices
  ADD COLUMN IF NOT EXISTS is_fixed_asset BOOLEAN DEFAULT false;

-- 退出/折讓類型
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'acc_invoices' AND column_name = 'return_type'
  ) THEN
    ALTER TABLE acc_invoices
      ADD COLUMN return_type TEXT DEFAULT 'NONE';
    ALTER TABLE acc_invoices
      ADD CONSTRAINT acc_invoices_return_type_check
      CHECK (return_type IN ('NONE', 'RETURN', 'ALLOWANCE'));
  END IF;
END $$;

-- 折讓/退回原發票日期及號碼
ALTER TABLE acc_invoices
  ADD COLUMN IF NOT EXISTS original_invoice_date DATE;

ALTER TABLE acc_invoices
  ADD COLUMN IF NOT EXISTS original_invoice_number TEXT;

-- 索引
CREATE INDEX IF NOT EXISTS idx_acc_invoices_declared_period
  ON acc_invoices(declared_period_id) WHERE declared_period_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_acc_invoices_return_type
  ON acc_invoices(return_type) WHERE return_type != 'NONE';

-- ============================================
-- 3. 記錄 migration
-- ============================================
INSERT INTO schema_migrations (filename)
VALUES ('086_tax_declarations_and_invoice_fields.sql')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
