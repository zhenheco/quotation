-- Migration: 建立 payment_terms 表
-- Description: 為報價單新增分期付款條款功能
-- Author: Claude Code
-- Date: 2025-11-03

-- 建立 payment_terms 表
CREATE TABLE IF NOT EXISTS payment_terms (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外鍵關聯到 quotations
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,

  -- 期數資訊
  term_number INTEGER NOT NULL CHECK (term_number > 0),

  -- 付款比例和金額
  percentage DECIMAL(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),

  -- 到期日
  due_date DATE,

  -- 付款狀態
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),

  -- 實際付款資訊
  paid_amount DECIMAL(12, 2) CHECK (paid_amount >= 0),
  paid_date DATE,

  -- 期數描述（JSONB 格式，支援中英文）
  description JSONB DEFAULT '{"zh": "", "en": ""}'::jsonb,

  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 複合唯一約束：同一報價單的期數不能重複
  UNIQUE (quotation_id, term_number)
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_payment_terms_quotation
  ON payment_terms(quotation_id);

CREATE INDEX idx_payment_terms_status
  ON payment_terms(payment_status);

CREATE INDEX idx_payment_terms_due_date
  ON payment_terms(due_date);

CREATE INDEX idx_payment_terms_quotation_term
  ON payment_terms(quotation_id, term_number);

-- 建立更新時間戳記的觸發器
CREATE OR REPLACE FUNCTION update_payment_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_terms_timestamp
  BEFORE UPDATE ON payment_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_terms_updated_at();

-- 新增 contract_file_name 欄位到 quotations 表（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations'
    AND column_name = 'contract_file_name'
  ) THEN
    ALTER TABLE quotations
    ADD COLUMN contract_file_name TEXT;
  END IF;
END $$;

-- 新增註解說明
COMMENT ON TABLE payment_terms IS '報價單付款條款表';
COMMENT ON COLUMN payment_terms.quotation_id IS '關聯的報價單 ID';
COMMENT ON COLUMN payment_terms.term_number IS '期數（第幾期）';
COMMENT ON COLUMN payment_terms.percentage IS '付款百分比（0-100）';
COMMENT ON COLUMN payment_terms.amount IS '應付金額';
COMMENT ON COLUMN payment_terms.due_date IS '付款到期日';
COMMENT ON COLUMN payment_terms.payment_status IS '付款狀態：unpaid(未付款), partial(部分付款), paid(已付款), overdue(逾期)';
COMMENT ON COLUMN payment_terms.paid_amount IS '實際已付金額';
COMMENT ON COLUMN payment_terms.paid_date IS '實際付款日期';
COMMENT ON COLUMN payment_terms.description IS '期數描述（支援中英文）';
