-- ============================================================================
-- Migration 055: 營所稅擴大書審 (Expanded Audit Income Tax)
-- 建立行業純益率表、營所稅申報記錄表
-- ============================================================================

-- ============================================================================
-- TYPES / ENUMS
-- ============================================================================

-- 營所稅申報狀態
DO $$ BEGIN
  CREATE TYPE income_tax_filing_status AS ENUM ('DRAFT', 'CALCULATED', 'SUBMITTED', 'ACCEPTED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 申報方式
DO $$ BEGIN
  CREATE TYPE filing_method AS ENUM ('EXPANDED_AUDIT', 'REGULAR', 'CPA_CERTIFIED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 行業純益率表
CREATE TABLE IF NOT EXISTS industry_profit_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_code VARCHAR(10) NOT NULL,
  industry_name VARCHAR(200) NOT NULL,
  industry_category VARCHAR(100),
  profit_rate NUMERIC(5, 4) NOT NULL, -- 小數，如 0.06 = 6%
  tax_year INTEGER NOT NULL,
  source VARCHAR(200),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(industry_code, tax_year)
);

COMMENT ON TABLE industry_profit_rates IS '行業純益率對照表（財政部每年公告）';
COMMENT ON COLUMN industry_profit_rates.profit_rate IS '純益率，以小數表示（0.06 = 6%）';
COMMENT ON COLUMN industry_profit_rates.tax_year IS '適用年度';

-- 營所稅申報記錄表
CREATE TABLE IF NOT EXISTS income_tax_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  filing_method filing_method NOT NULL DEFAULT 'EXPANDED_AUDIT',
  status income_tax_filing_status NOT NULL DEFAULT 'DRAFT',

  -- 公司資訊快照
  company_name VARCHAR(200) NOT NULL,
  company_tax_id VARCHAR(20) NOT NULL,

  -- 申報資料
  total_revenue NUMERIC(15, 2) NOT NULL DEFAULT 0, -- 全年營業收入
  other_income NUMERIC(15, 2) NOT NULL DEFAULT 0, -- 非營業收入
  gross_income NUMERIC(15, 2) NOT NULL DEFAULT 0, -- 總收入
  industry_code VARCHAR(10), -- 行業代碼（擴大書審用）
  industry_name VARCHAR(200), -- 行業名稱
  profit_rate NUMERIC(5, 4), -- 純益率
  taxable_income NUMERIC(15, 2) NOT NULL DEFAULT 0, -- 課稅所得
  deductions NUMERIC(15, 2) NOT NULL DEFAULT 0, -- 扣除額
  calculated_tax NUMERIC(15, 2) NOT NULL DEFAULT 0, -- 計算稅額
  final_tax NUMERIC(15, 2) NOT NULL DEFAULT 0, -- 最終稅額
  is_eligible BOOLEAN NOT NULL DEFAULT false, -- 是否符合擴大書審資格

  -- 計算詳情（JSON）
  calculation_details JSONB,

  -- 申報狀態
  calculated_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES user_profiles(id),
  acceptance_number VARCHAR(50), -- 財政部受理編號
  rejection_reason TEXT,

  -- PDF 匯出
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- 審計軌跡
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(company_id, tax_year)
);

COMMENT ON TABLE income_tax_filings IS '營所稅申報記錄表';
COMMENT ON COLUMN income_tax_filings.is_eligible IS '是否符合擴大書審資格（營收 ≤ 3000 萬）';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_industry_profit_rates_code ON industry_profit_rates(industry_code);
CREATE INDEX IF NOT EXISTS idx_industry_profit_rates_year ON industry_profit_rates(tax_year);
CREATE INDEX IF NOT EXISTS idx_industry_profit_rates_category ON industry_profit_rates(industry_category);
CREATE INDEX IF NOT EXISTS idx_income_tax_filings_company ON income_tax_filings(company_id);
CREATE INDEX IF NOT EXISTS idx_income_tax_filings_year ON income_tax_filings(tax_year);
CREATE INDEX IF NOT EXISTS idx_income_tax_filings_status ON income_tax_filings(status);
CREATE INDEX IF NOT EXISTS idx_income_tax_filings_deleted ON income_tax_filings(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE industry_profit_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_tax_filings ENABLE ROW LEVEL SECURITY;

-- 純益率表：所有人可讀（公開資料）
DROP POLICY IF EXISTS industry_profit_rates_select ON industry_profit_rates;
CREATE POLICY industry_profit_rates_select ON industry_profit_rates
  FOR SELECT USING (true);

-- 營所稅申報：公司成員可讀
DROP POLICY IF EXISTS income_tax_filings_select ON income_tax_filings;
CREATE POLICY income_tax_filings_select ON income_tax_filings
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- SEED DATA: 常見行業純益率（113 年度參考）
-- ============================================================================

INSERT INTO industry_profit_rates (industry_code, industry_name, industry_category, profit_rate, tax_year, source, notes)
VALUES
  -- 資訊服務業
  ('6201', '電腦程式設計業', '資訊及通訊傳播業', 0.06, 113, '財政部公告', NULL),
  ('6202', '電腦諮詢服務業', '資訊及通訊傳播業', 0.08, 113, '財政部公告', NULL),
  ('6209', '其他資訊服務業', '資訊及通訊傳播業', 0.07, 113, '財政部公告', NULL),
  ('6311', '資料處理業', '資訊及通訊傳播業', 0.08, 113, '財政部公告', NULL),

  -- 批發零售業
  ('4610', '綜合商品批發業', '批發及零售業', 0.04, 113, '財政部公告', NULL),
  ('4619', '其他批發業', '批發及零售業', 0.04, 113, '財政部公告', NULL),
  ('4711', '便利商店業', '批發及零售業', 0.03, 113, '財政部公告', NULL),
  ('4719', '其他綜合商品零售業', '批發及零售業', 0.03, 113, '財政部公告', NULL),
  ('4741', '資訊及通訊設備零售業', '批發及零售業', 0.04, 113, '財政部公告', NULL),

  -- 餐飲業
  ('5610', '餐館業', '住宿及餐飲業', 0.06, 113, '財政部公告', NULL),
  ('5620', '外燴及團膳承包業', '住宿及餐飲業', 0.06, 113, '財政部公告', NULL),
  ('5630', '飲料店業', '住宿及餐飲業', 0.08, 113, '財政部公告', NULL),

  -- 專業服務業
  ('6910', '法律服務業', '專業、科學及技術服務業', 0.15, 113, '財政部公告', NULL),
  ('6920', '會計及記帳服務業', '專業、科學及技術服務業', 0.12, 113, '財政部公告', NULL),
  ('7010', '企業總管理機構及管理顧問業', '專業、科學及技術服務業', 0.10, 113, '財政部公告', NULL),
  ('7020', '管理顧問業', '專業、科學及技術服務業', 0.10, 113, '財政部公告', NULL),
  ('7111', '建築師事務所', '專業、科學及技術服務業', 0.10, 113, '財政部公告', NULL),
  ('7112', '工程技術顧問業', '專業、科學及技術服務業', 0.08, 113, '財政部公告', NULL),
  ('7310', '廣告業', '專業、科學及技術服務業', 0.08, 113, '財政部公告', NULL),
  ('7320', '市場研究及民意調查業', '專業、科學及技術服務業', 0.10, 113, '財政部公告', NULL),
  ('7410', '設計業', '專業、科學及技術服務業', 0.10, 113, '財政部公告', NULL),
  ('7490', '其他專業、科學及技術服務業', '專業、科學及技術服務業', 0.08, 113, '財政部公告', NULL),

  -- 製造業
  ('1010', '屠宰業', '製造業', 0.03, 113, '財政部公告', NULL),
  ('1090', '其他食品製造業', '製造業', 0.05, 113, '財政部公告', NULL),
  ('2511', '金屬結構製造業', '製造業', 0.05, 113, '財政部公告', NULL),
  ('2599', '其他金屬製品製造業', '製造業', 0.05, 113, '財政部公告', NULL),
  ('2610', '電子零組件製造業', '製造業', 0.06, 113, '財政部公告', NULL),
  ('2620', '電腦及周邊設備製造業', '製造業', 0.06, 113, '財政部公告', NULL),
  ('2732', '電線及電纜製造業', '製造業', 0.04, 113, '財政部公告', NULL),

  -- 營造業
  ('4100', '建築工程業', '營建工程業', 0.03, 113, '財政部公告', NULL),
  ('4210', '土木工程業', '營建工程業', 0.04, 113, '財政部公告', NULL),
  ('4321', '電器及電信工程業', '營建工程業', 0.05, 113, '財政部公告', NULL),
  ('4322', '配管及冷凍空調工程業', '營建工程業', 0.05, 113, '財政部公告', NULL),
  ('4329', '其他建築設備安裝業', '營建工程業', 0.05, 113, '財政部公告', NULL),
  ('4390', '其他專門營造業', '營建工程業', 0.04, 113, '財政部公告', NULL),

  -- 運輸業
  ('4931', '汽車貨運業', '運輸及倉儲業', 0.05, 113, '財政部公告', NULL),
  ('4940', '汽車客運業', '運輸及倉儲業', 0.04, 113, '財政部公告', NULL),
  ('5210', '報關服務業', '運輸及倉儲業', 0.06, 113, '財政部公告', NULL),
  ('5220', '船務代理業', '運輸及倉儲業', 0.06, 113, '財政部公告', NULL),

  -- 不動產業
  ('6811', '不動產買賣業', '不動產業', 0.10, 113, '財政部公告', NULL),
  ('6812', '不動產租賃業', '不動產業', 0.30, 113, '財政部公告', NULL),

  -- 教育服務業
  ('8550', '補習教育業', '教育業', 0.10, 113, '財政部公告', NULL),
  ('8560', '教育輔助服務業', '教育業', 0.08, 113, '財政部公告', NULL),

  -- 支援服務業
  ('7810', '人力仲介業', '支援服務業', 0.08, 113, '財政部公告', NULL),
  ('7820', '人力供應業', '支援服務業', 0.05, 113, '財政部公告', NULL),
  ('8010', '保全服務業', '支援服務業', 0.06, 113, '財政部公告', NULL),
  ('8110', '建築物清潔服務業', '支援服務業', 0.05, 113, '財政部公告', NULL)
ON CONFLICT (industry_code, tax_year) DO UPDATE SET
  industry_name = EXCLUDED.industry_name,
  industry_category = EXCLUDED.industry_category,
  profit_rate = EXCLUDED.profit_rate,
  source = EXCLUDED.source,
  updated_at = NOW();

-- ============================================================================
-- TRIGGER: 更新 updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_industry_profit_rates_updated_at ON industry_profit_rates;
CREATE TRIGGER update_industry_profit_rates_updated_at
  BEFORE UPDATE ON industry_profit_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS update_income_tax_filings_updated_at ON income_tax_filings;
CREATE TRIGGER update_income_tax_filings_updated_at
  BEFORE UPDATE ON income_tax_filings
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('055_expanded_audit_income_tax.sql')
ON CONFLICT (filename) DO NOTHING;
