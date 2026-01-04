-- ============================================================================
-- MIGRATION FILES FOR SUBSCRIPTION SYSTEM, INCOME TAX, AND AI USAGE
-- ============================================================================
--
-- This file contains all three migration scripts that need to be created:
-- 1. 054_subscription_system.sql - 訂閱系統
-- 2. 055_expanded_audit_income_tax.sql - 營所稅擴大書審
-- 3. 056_ai_usage_tracking.sql - AI 用量追蹤
--
-- To apply these migrations:
-- 1. Copy each section to the corresponding file in migrations/
-- 2. Run each migration in Supabase SQL Editor
-- ============================================================================

-- ############################################################################
-- FILE 1: migrations/054_subscription_system.sql
-- ############################################################################

-- ============================================================================
-- Migration 054: 訂閱系統 (Subscription System)
-- 建立訂閱方案、公司訂閱、功能門檻、用量追蹤等表格
-- ============================================================================

-- 啟用 pgcrypto（如果尚未啟用）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- TYPES / ENUMS
-- ============================================================================

-- 訂閱層級
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('FREE', 'STARTER', 'STANDARD', 'PROFESSIONAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 計費週期
DO $$ BEGIN
  CREATE TYPE billing_cycle AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 訂閱狀態
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 功能類別
DO $$ BEGIN
  CREATE TYPE feature_category AS ENUM ('QUOTA', 'FEATURE', 'INTEGRATION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 訂閱方案表
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier subscription_tier NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description TEXT,
  description_en TEXT,
  monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  yearly_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
  max_products INTEGER NOT NULL DEFAULT 50,
  max_customers INTEGER NOT NULL DEFAULT 20,
  max_quotations_per_month INTEGER NOT NULL DEFAULT 50,
  max_companies INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscription_plans IS '訂閱方案定義表';
COMMENT ON COLUMN subscription_plans.tier IS '訂閱層級：FREE/STARTER/STANDARD/PROFESSIONAL';
COMMENT ON COLUMN subscription_plans.max_quotations_per_month IS '每月報價單限額（-1 表示無限）';

-- 功能定義表
CREATE TABLE IF NOT EXISTS subscription_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description TEXT,
  category feature_category NOT NULL DEFAULT 'FEATURE',
  icon VARCHAR(50),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscription_features IS '可訂閱功能定義表';
COMMENT ON COLUMN subscription_features.code IS '功能代碼，用於程式判斷（如 media_401, ai_cash_flow）';

-- 方案-功能關聯表
CREATE TABLE IF NOT EXISTS plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES subscription_features(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  quota_limit INTEGER, -- null 表示無限，-1 也表示無限
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, feature_id)
);

COMMENT ON TABLE plan_features IS '方案與功能的關聯表，定義每個方案包含哪些功能';

-- 公司訂閱表
CREATE TABLE IF NOT EXISTS company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status subscription_status NOT NULL DEFAULT 'ACTIVE',
  billing_cycle billing_cycle NOT NULL DEFAULT 'MONTHLY',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ,
  next_payment_at TIMESTAMPTZ,
  external_subscription_id VARCHAR(255),
  external_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

COMMENT ON TABLE company_subscriptions IS '公司訂閱記錄表';
COMMENT ON COLUMN company_subscriptions.external_subscription_id IS '外部金流系統的訂閱 ID（如 PayUNi）';

-- 訂閱變更歷史表
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES company_subscriptions(id) ON DELETE CASCADE,
  previous_plan_id UUID REFERENCES subscription_plans(id),
  new_plan_id UUID REFERENCES subscription_plans(id),
  previous_status subscription_status,
  new_status subscription_status,
  change_type VARCHAR(50) NOT NULL,
  change_reason TEXT,
  amount NUMERIC(10, 2),
  proration_amount NUMERIC(10, 2),
  changed_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscription_history IS '訂閱變更歷史記錄';

-- 用量追蹤表
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feature_code VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, feature_code, period_start)
);

COMMENT ON TABLE usage_tracking IS '功能用量追蹤表（月度）';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_features_code ON subscription_features(code);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature ON plan_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company ON company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_company ON usage_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_feature ON usage_tracking(feature_code);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- 訂閱方案：所有人可讀
DROP POLICY IF EXISTS subscription_plans_select ON subscription_plans;
CREATE POLICY subscription_plans_select ON subscription_plans
  FOR SELECT USING (true);

-- 功能定義：所有人可讀
DROP POLICY IF EXISTS subscription_features_select ON subscription_features;
CREATE POLICY subscription_features_select ON subscription_features
  FOR SELECT USING (true);

-- 方案功能：所有人可讀
DROP POLICY IF EXISTS plan_features_select ON plan_features;
CREATE POLICY plan_features_select ON plan_features
  FOR SELECT USING (true);

-- 公司訂閱：公司成員可讀
DROP POLICY IF EXISTS company_subscriptions_select ON company_subscriptions;
CREATE POLICY company_subscriptions_select ON company_subscriptions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- 訂閱歷史：公司成員可讀
DROP POLICY IF EXISTS subscription_history_select ON subscription_history;
CREATE POLICY subscription_history_select ON subscription_history
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM company_subscriptions
      WHERE company_id IN (
        SELECT company_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

-- 用量追蹤：公司成員可讀
DROP POLICY IF EXISTS usage_tracking_select ON usage_tracking;
CREATE POLICY usage_tracking_select ON usage_tracking
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- SEED DATA: 訂閱方案
-- ============================================================================

INSERT INTO subscription_plans (tier, name, name_en, description, description_en, monthly_price, yearly_price, max_products, max_customers, max_quotations_per_month, max_companies, is_popular, sort_order)
VALUES
  ('FREE', '免費版', 'Free', '適合個人或剛起步的小型企業', 'Perfect for individuals or small startups', 0, 0, 50, 20, 50, 1, false, 1),
  ('STARTER', '入門版', 'Starter', '適合成長中的小型企業', 'Great for growing small businesses', 299, 2990, 200, 100, 200, 1, false, 2),
  ('STANDARD', '標準版', 'Standard', '適合需要進階功能的企業', 'For businesses needing advanced features', 799, 7990, 1000, 500, -1, 3, true, 3),
  ('PROFESSIONAL', '專業版', 'Professional', '適合需要完整功能的企業', 'Full-featured for professional businesses', 1999, 19990, -1, -1, -1, 10, false, 4)
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  description_en = EXCLUDED.description_en,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  max_products = EXCLUDED.max_products,
  max_customers = EXCLUDED.max_customers,
  max_quotations_per_month = EXCLUDED.max_quotations_per_month,
  max_companies = EXCLUDED.max_companies,
  is_popular = EXCLUDED.is_popular,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ============================================================================
-- SEED DATA: 功能定義
-- ============================================================================

INSERT INTO subscription_features (code, name, name_en, description, category, sort_order)
VALUES
  -- 基礎功能
  ('basic_quotation', '基礎報價功能', 'Basic Quotation', '建立和管理報價單', 'FEATURE', 1),
  ('basic_invoice', '基礎發票管理', 'Basic Invoice', '發票錄入和查詢', 'FEATURE', 2),
  ('basic_report', '基礎報表', 'Basic Reports', '試算表、損益表等基礎報表', 'FEATURE', 3),

  -- 進階功能
  ('vat_filing', '營業稅申報', 'VAT Filing', '401/403 營業稅申報', 'FEATURE', 10),
  ('media_401', '401 媒體檔', '401 Media File', '產出財政部 401 媒體申報檔', 'FEATURE', 11),
  ('excel_import', 'Excel 匯入', 'Excel Import', '批次匯入發票資料', 'FEATURE', 12),
  ('income_tax', '營所稅申報', 'Income Tax Filing', '營所稅擴大書審申報', 'FEATURE', 13),

  -- AI 功能
  ('ai_ocr', 'AI 發票掃描', 'AI Invoice OCR', '使用 AI 辨識發票', 'FEATURE', 20),
  ('ai_cash_flow', 'AI 現金流預測', 'AI Cash Flow Forecast', 'AI 預測未來現金流', 'FEATURE', 21),
  ('ai_receivable_risk', 'AI 應收風險', 'AI Receivable Risk', 'AI 評估應收帳款風險', 'FEATURE', 22),
  ('ai_tax_optimization', 'AI 稅務優化', 'AI Tax Optimization', 'AI 稅務優化建議', 'FEATURE', 23),

  -- 整合功能
  ('api_access', 'API 存取', 'API Access', '使用 REST API 整合', 'INTEGRATION', 30),
  ('multi_company', '多公司管理', 'Multi-Company', '管理多家公司帳務', 'FEATURE', 31),
  ('export_pdf', 'PDF 匯出', 'PDF Export', '匯出報表為 PDF', 'FEATURE', 32),

  -- 用量限制類
  ('products_quota', '產品數量', 'Products Quota', '可建立的產品數量', 'QUOTA', 40),
  ('customers_quota', '客戶數量', 'Customers Quota', '可建立的客戶數量', 'QUOTA', 41),
  ('quotations_quota', '報價單數量/月', 'Quotations Quota', '每月可建立的報價單數量', 'QUOTA', 42),
  ('ai_requests_quota', 'AI 分析次數/月', 'AI Requests Quota', '每月 AI 分析次數', 'QUOTA', 43)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ============================================================================
-- SEED DATA: 方案功能關聯
-- ============================================================================

DO $$
DECLARE
  v_free_id UUID;
  v_starter_id UUID;
  v_standard_id UUID;
  v_pro_id UUID;
BEGIN
  SELECT id INTO v_free_id FROM subscription_plans WHERE tier = 'FREE';
  SELECT id INTO v_starter_id FROM subscription_plans WHERE tier = 'STARTER';
  SELECT id INTO v_standard_id FROM subscription_plans WHERE tier = 'STANDARD';
  SELECT id INTO v_pro_id FROM subscription_plans WHERE tier = 'PROFESSIONAL';

  -- 清除現有關聯
  DELETE FROM plan_features;

  -- FREE 方案功能
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_free_id, id, true, NULL FROM subscription_features WHERE code = 'basic_quotation';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_free_id, id, true, NULL FROM subscription_features WHERE code = 'basic_invoice';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_free_id, id, true, 50 FROM subscription_features WHERE code = 'products_quota';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_free_id, id, true, 20 FROM subscription_features WHERE code = 'customers_quota';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_free_id, id, true, 50 FROM subscription_features WHERE code = 'quotations_quota';

  -- STARTER 方案功能
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_starter_id, id, true, NULL FROM subscription_features WHERE code = 'basic_quotation';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_starter_id, id, true, NULL FROM subscription_features WHERE code = 'basic_invoice';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_starter_id, id, true, NULL FROM subscription_features WHERE code = 'basic_report';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_starter_id, id, true, NULL FROM subscription_features WHERE code = 'vat_filing';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_starter_id, id, true, NULL FROM subscription_features WHERE code = 'excel_import';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_starter_id, id, true, NULL FROM subscription_features WHERE code = 'export_pdf';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_starter_id, id, true, 200 FROM subscription_features WHERE code = 'products_quota';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_starter_id, id, true, 100 FROM subscription_features WHERE code = 'customers_quota';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_starter_id, id, true, 200 FROM subscription_features WHERE code = 'quotations_quota';

  -- STANDARD 方案功能
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_standard_id, id, true, NULL FROM subscription_features WHERE code IN (
    'basic_quotation', 'basic_invoice', 'basic_report', 'vat_filing',
    'media_401', 'excel_import', 'income_tax', 'ai_ocr', 'multi_company', 'export_pdf'
  );
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_standard_id, id, true, 1000 FROM subscription_features WHERE code = 'products_quota';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_standard_id, id, true, 500 FROM subscription_features WHERE code = 'customers_quota';
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_standard_id, id, true, -1 FROM subscription_features WHERE code = 'quotations_quota';

  -- PROFESSIONAL 方案功能（全部功能）
  INSERT INTO plan_features (plan_id, feature_id, is_enabled, quota_limit)
  SELECT v_pro_id, id, true,
    CASE
      WHEN code IN ('products_quota', 'customers_quota', 'quotations_quota') THEN -1
      WHEN code = 'ai_requests_quota' THEN 100
      ELSE NULL
    END
  FROM subscription_features;
END $$;

-- ============================================================================
-- TRIGGER: 自動為新公司建立免費訂閱
-- ============================================================================

CREATE OR REPLACE FUNCTION create_free_subscription_for_company()
RETURNS TRIGGER AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  SELECT id INTO v_free_plan_id FROM subscription_plans WHERE tier = 'FREE';

  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO company_subscriptions (company_id, plan_id, status, billing_cycle, current_period_end)
    VALUES (
      NEW.id,
      v_free_plan_id,
      'ACTIVE',
      'MONTHLY',
      NOW() + INTERVAL '100 years'
    )
    ON CONFLICT (company_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_free_subscription_on_company_insert ON companies;
CREATE TRIGGER create_free_subscription_on_company_insert
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription_for_company();

COMMENT ON FUNCTION create_free_subscription_for_company IS '自動為新建立的公司建立免費訂閱';

-- ============================================================================
-- TRIGGER: 更新 updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS update_subscription_features_updated_at ON subscription_features;
CREATE TRIGGER update_subscription_features_updated_at
  BEFORE UPDATE ON subscription_features
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS update_company_subscriptions_updated_at ON company_subscriptions;
CREATE TRIGGER update_company_subscriptions_updated_at
  BEFORE UPDATE ON company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('054_subscription_system.sql')
ON CONFLICT (filename) DO NOTHING;


-- ############################################################################
-- FILE 2: migrations/055_expanded_audit_income_tax.sql
-- ############################################################################

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


-- ############################################################################
-- FILE 3: migrations/056_ai_usage_tracking.sql
-- ############################################################################

-- ============================================================================
-- Migration 056: AI 用量追蹤 (AI Usage Tracking)
-- 建立 AI 分析快取表、用量記錄表
-- ============================================================================

-- ============================================================================
-- TYPES / ENUMS
-- ============================================================================

-- AI 分析類型
DO $$ BEGIN
  CREATE TYPE ai_analysis_type AS ENUM ('cash_flow', 'receivable_risk', 'tax_optimization');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- AI 分析結果快取表
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  analysis_type ai_analysis_type NOT NULL,
  cache_key VARCHAR(255) NOT NULL,
  result JSONB NOT NULL,
  model VARCHAR(100) NOT NULL,
  usage_tokens INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, analysis_type, cache_key)
);

COMMENT ON TABLE ai_analysis_cache IS 'AI 財務分析結果快取';
COMMENT ON COLUMN ai_analysis_cache.cache_key IS '快取鍵，格式為 company_id:type:date:data_hash';
COMMENT ON COLUMN ai_analysis_cache.expires_at IS '快取過期時間';

-- AI 用量記錄表（月度匯總）
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- 格式：YYYY-MM
  analysis_type ai_analysis_type NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost NUMERIC(10, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, period, analysis_type)
);

COMMENT ON TABLE ai_usage_logs IS 'AI 分析用量月度匯總';
COMMENT ON COLUMN ai_usage_logs.period IS '統計週期，格式 YYYY-MM';
COMMENT ON COLUMN ai_usage_logs.total_cost IS '估算成本（USD）';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_company ON ai_analysis_cache(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_type ON ai_analysis_cache(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_expires ON ai_analysis_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_key ON ai_analysis_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_company ON ai_usage_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_period ON ai_usage_logs(period);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- AI 快取：公司成員可讀
DROP POLICY IF EXISTS ai_analysis_cache_select ON ai_analysis_cache;
CREATE POLICY ai_analysis_cache_select ON ai_analysis_cache
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- AI 用量：公司成員可讀
DROP POLICY IF EXISTS ai_usage_logs_select ON ai_usage_logs;
CREATE POLICY ai_usage_logs_select ON ai_usage_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- 增加 AI 用量計數的 RPC 函數
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_company_id UUID,
  p_period VARCHAR(7),
  p_analysis_type ai_analysis_type,
  p_tokens INTEGER,
  p_cost NUMERIC DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_usage_logs (company_id, period, analysis_type, request_count, total_tokens, total_cost)
  VALUES (p_company_id, p_period, p_analysis_type, 1, p_tokens, p_cost)
  ON CONFLICT (company_id, period, analysis_type)
  DO UPDATE SET
    request_count = ai_usage_logs.request_count + 1,
    total_tokens = ai_usage_logs.total_tokens + p_tokens,
    total_cost = ai_usage_logs.total_cost + p_cost,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION increment_ai_usage IS '增加公司的 AI 用量計數';

-- 清除過期快取的函數（可由 cron job 調用）
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM ai_analysis_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_ai_cache IS '清除過期的 AI 分析快取';

-- ============================================================================
-- TRIGGER: 更新 updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_ai_usage_logs_updated_at ON ai_usage_logs;
CREATE TRIGGER update_ai_usage_logs_updated_at
  BEFORE UPDATE ON ai_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('056_ai_usage_tracking.sql')
ON CONFLICT (filename) DO NOTHING;
