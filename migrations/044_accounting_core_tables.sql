-- ============================================================================
-- Migration: 044_accounting_core_tables.sql
-- Created: 2025-12-15
-- Description: 建立會計系統核心表格 - 會計科目、發票、傳票、分錄
-- Source: Account-system Prisma Schema
-- ============================================================================

-- ============================================================================
-- 1. 會計公司擴展（與現有 companies 表整合）
-- ============================================================================

-- 會計設定擴展欄位（加入現有 companies 表）
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS fiscal_year_start INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vat_method vat_method DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS mixed_deduction_ratio NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN companies.fiscal_year_start IS '會計年度開始月份（1-12）';
COMMENT ON COLUMN companies.vat_method IS '營業稅計算方法';
COMMENT ON COLUMN companies.mixed_deduction_ratio IS '403 不得扣抵比例（0.0000 ~ 1.0000）';

-- ============================================================================
-- 2. 會計科目表 (Chart of Accounts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description VARCHAR(200),

  -- 科目分類
  category account_category NOT NULL,
  sub_category VARCHAR(50),

  -- 屬性
  is_system BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,

  -- 公司特定科目（null = 系統預設）
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 約束
  UNIQUE(code, company_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_category ON accounts(category);
CREATE INDEX IF NOT EXISTS idx_accounts_company_id ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);

COMMENT ON TABLE accounts IS '會計科目表';

-- ============================================================================
-- 3. 稅碼設定表
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),

  -- 稅率設定
  tax_rate NUMERIC(5,4) DEFAULT 0.05,
  tax_type tax_type NOT NULL,

  -- 扣抵屬性
  is_deductible BOOLEAN DEFAULT true,
  is_common BOOLEAN DEFAULT false,

  -- 系統屬性
  is_system BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_codes_tax_type ON tax_codes(tax_type);
CREATE INDEX IF NOT EXISTS idx_tax_codes_is_active ON tax_codes(is_active);

COMMENT ON TABLE tax_codes IS '稅碼設定表';

-- 預設稅碼
INSERT INTO tax_codes (code, name, description, tax_rate, tax_type, is_deductible, is_common) VALUES
  ('TX5', '應稅 5%', '一般應稅商品/服務', 0.05, 'TAXABLE', true, false),
  ('TX0', '應稅 0%', '零稅率', 0.00, 'ZERO_RATED', true, false),
  ('EXE', '免稅', '免稅商品/服務', 0.00, 'EXEMPT', false, false),
  ('NON', '不課稅', '不課稅交易', 0.00, 'NON_TAXABLE', false, false),
  ('TX5C', '共同進項 5%', '403 共同進項', 0.05, 'TAXABLE', true, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. 往來對象表 (Counterparties)
-- ============================================================================

CREATE TABLE IF NOT EXISTS counterparties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 基本資料
  name VARCHAR(100) NOT NULL,
  tax_id VARCHAR(8),
  contact VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(100),
  address VARCHAR(200),

  -- 類型
  type counterparty_type NOT NULL,

  -- 預設值
  default_account_code VARCHAR(10),
  default_tax_code VARCHAR(10),

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_counterparties_company_id ON counterparties(company_id);
CREATE INDEX IF NOT EXISTS idx_counterparties_tax_id ON counterparties(tax_id);
CREATE INDEX IF NOT EXISTS idx_counterparties_type ON counterparties(type);
CREATE INDEX IF NOT EXISTS idx_counterparties_name ON counterparties(name);

COMMENT ON TABLE counterparties IS '往來對象表（客戶/供應商）';

-- ============================================================================
-- 5. 發票主檔 (Invoices)
-- ============================================================================

CREATE TABLE IF NOT EXISTS acc_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 發票資訊
  number VARCHAR(10) NOT NULL,
  type invoice_type NOT NULL,
  date DATE NOT NULL,

  -- 金額資訊
  untaxed_amount NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,

  -- 往來對象
  counterparty_id UUID REFERENCES counterparties(id),
  counterparty_tax_id VARCHAR(8),
  counterparty_name VARCHAR(100),

  -- 稅務資訊
  tax_code_id UUID REFERENCES tax_codes(id),

  -- 備註
  description VARCHAR(200),

  -- 會計科目分類
  account_id UUID REFERENCES accounts(id),
  account_code VARCHAR(10),
  is_account_automatic BOOLEAN DEFAULT true,
  account_confidence NUMERIC(3,2),

  -- OCR 資料
  ocr_raw_data JSONB,
  ocr_confidence NUMERIC(3,2),

  -- 附件
  attachment_url VARCHAR(500),

  -- 狀態
  status invoice_status DEFAULT 'DRAFT',
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(50),

  -- 支付追蹤
  payment_status acc_payment_status DEFAULT 'UNPAID',
  payment_method payment_method_type DEFAULT 'UNCLASSIFIED',
  paid_amount NUMERIC(12,2) DEFAULT 0,
  paid_date DATE,
  due_date DATE,

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- 約束
  UNIQUE(company_id, number)
);

CREATE INDEX IF NOT EXISTS idx_acc_invoices_company_date ON acc_invoices(company_id, date);
CREATE INDEX IF NOT EXISTS idx_acc_invoices_type_status ON acc_invoices(type, status);
CREATE INDEX IF NOT EXISTS idx_acc_invoices_type_payment ON acc_invoices(type, payment_status);
CREATE INDEX IF NOT EXISTS idx_acc_invoices_due_date ON acc_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_acc_invoices_aging ON acc_invoices(company_id, type, payment_status, due_date);
CREATE INDEX IF NOT EXISTS idx_acc_invoices_counterparty ON acc_invoices(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_acc_invoices_created ON acc_invoices(company_id, created_at);

COMMENT ON TABLE acc_invoices IS '會計發票主檔';

-- ============================================================================
-- 6. 會計傳票主檔 (Journal Entries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 傳票資訊
  journal_number VARCHAR(20) UNIQUE NOT NULL,
  date DATE NOT NULL,
  description VARCHAR(200),

  -- 來源關聯
  source_type transaction_source NOT NULL,
  invoice_id UUID UNIQUE REFERENCES acc_invoices(id),

  -- 狀態管理
  status journal_status DEFAULT 'DRAFT',
  is_auto_generated BOOLEAN DEFAULT false,

  -- 作廢相關
  voided_at TIMESTAMPTZ,
  void_reason VARCHAR(200),

  -- 取代關係
  replaces_journal_id UUID REFERENCES journal_entries(id),

  -- 過帳資訊
  posted_at TIMESTAMPTZ,
  posted_by VARCHAR(50),

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_invoice ON journal_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_replaces ON journal_entries(replaces_journal_id);

COMMENT ON TABLE journal_entries IS '會計傳票主檔';

-- ============================================================================
-- 7. 會計分錄明細 (Transactions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS acc_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 所屬傳票
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,

  -- 傳票資訊（冗餘欄位）
  number VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  description VARCHAR(200),

  -- 會計科目
  account_id UUID NOT NULL REFERENCES accounts(id),

  -- 借貸方
  debit NUMERIC(12,2) DEFAULT 0,
  credit NUMERIC(12,2) DEFAULT 0,

  -- 來源（冗餘欄位）
  source_type transaction_source NOT NULL,
  invoice_id UUID REFERENCES acc_invoices(id),

  -- 狀態
  status transaction_status DEFAULT 'DRAFT',
  posted_at TIMESTAMPTZ,

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_acc_transactions_company_date ON acc_transactions(company_id, date);
CREATE INDEX IF NOT EXISTS idx_acc_transactions_account ON acc_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_acc_transactions_invoice ON acc_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_acc_transactions_journal ON acc_transactions(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_acc_transactions_status ON acc_transactions(status);
CREATE INDEX IF NOT EXISTS idx_acc_transactions_balance ON acc_transactions(company_id, account_id, date);

COMMENT ON TABLE acc_transactions IS '會計分錄明細';

-- ============================================================================
-- 8. 銀行帳戶表
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  account_number VARCHAR(20) NOT NULL,
  bank_code VARCHAR(3) NOT NULL,
  bank_name VARCHAR(50) NOT NULL,
  branch_name VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'TWD',
  opening_balance NUMERIC(14,2) DEFAULT 0,
  current_balance NUMERIC(14,2) DEFAULT 0,
  account_id UUID NOT NULL REFERENCES accounts(id),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(company_id, account_number)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);

COMMENT ON TABLE bank_accounts IS '銀行帳戶';

-- ============================================================================
-- 9. 銀行對帳單匯入記錄
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,

  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_records INTEGER NOT NULL,
  status import_status DEFAULT 'PENDING',
  error_message VARCHAR(500),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_imports_company ON bank_statement_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_imports_account ON bank_statement_imports(bank_account_id);

COMMENT ON TABLE bank_statement_imports IS '銀行對帳單匯入記錄';

-- ============================================================================
-- 10. 銀行交易明細
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  import_id UUID REFERENCES bank_statement_imports(id),

  transaction_date DATE NOT NULL,
  description VARCHAR(200) NOT NULL,
  debit NUMERIC(14,2) DEFAULT 0,
  credit NUMERIC(14,2) DEFAULT 0,
  balance NUMERIC(14,2) NOT NULL,
  reconciliation_status reconciliation_status DEFAULT 'UNRECONCILED',
  matched_invoice_id UUID,
  match_confidence NUMERIC(3,2),
  match_method VARCHAR(30),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_txn_company ON bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_txn_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_txn_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_txn_status ON bank_transactions(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_bank_txn_account_date ON bank_transactions(bank_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_txn_reconcile ON bank_transactions(bank_account_id, reconciliation_status);

COMMENT ON TABLE bank_transactions IS '銀行交易明細';

-- ============================================================================
-- 11. 會計期間表
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  year INTEGER NOT NULL,
  month INTEGER,
  type accounting_period_type DEFAULT 'MONTHLY',
  status period_status DEFAULT 'OPEN',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  closed_at TIMESTAMPTZ,
  closed_by VARCHAR(50),
  closing_journal_id UUID,

  reopened_at TIMESTAMPTZ,
  reopened_by VARCHAR(50),
  reopen_reason VARCHAR(500),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_accounting_periods_company ON accounting_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_status ON accounting_periods(status);

COMMENT ON TABLE accounting_periods IS '會計期間';

-- ============================================================================
-- 12. 稅務申報記錄
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  type tax_return_type NOT NULL,
  year INTEGER NOT NULL,
  period INTEGER NOT NULL,
  status tax_return_status DEFAULT 'DRAFT',
  form_data JSONB,
  output_tax NUMERIC(14,2) DEFAULT 0,
  input_tax NUMERIC(14,2) DEFAULT 0,
  tax_payable NUMERIC(14,2) DEFAULT 0,
  tax_refundable NUMERIC(14,2) DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, type, year, period)
);

CREATE INDEX IF NOT EXISTS idx_tax_returns_company ON tax_returns(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_returns_type ON tax_returns(type);
CREATE INDEX IF NOT EXISTS idx_tax_returns_status ON tax_returns(status);

COMMENT ON TABLE tax_returns IS '稅務申報記錄';

-- ============================================================================
-- 13. 扣繳記錄
-- ============================================================================

CREATE TABLE IF NOT EXISTS withholding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  payee_tax_id VARCHAR(10) NOT NULL,
  payee_name VARCHAR(100) NOT NULL,
  income_type income_type NOT NULL,
  income_code VARCHAR(5) NOT NULL,
  gross_amount NUMERIC(14,2) NOT NULL,
  withheld_tax NUMERIC(14,2) NOT NULL,
  net_amount NUMERIC(14,2) NOT NULL,
  payment_date DATE NOT NULL,
  remark VARCHAR(200),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withholding_company ON withholding_records(company_id);
CREATE INDEX IF NOT EXISTS idx_withholding_date ON withholding_records(payment_date);
CREATE INDEX IF NOT EXISTS idx_withholding_type ON withholding_records(income_type);

COMMENT ON TABLE withholding_records IS '扣繳記錄';

-- ============================================================================
-- 14. 二代健保補充保費記錄
-- ============================================================================

CREATE TABLE IF NOT EXISTS nhi_supplement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  payee_tax_id VARCHAR(10) NOT NULL,
  payee_name VARCHAR(100) NOT NULL,
  payment_type nhi_payment_type NOT NULL,
  payment_amount NUMERIC(14,2) NOT NULL,
  supplement_rate NUMERIC(5,4) DEFAULT 0.0211,
  supplement_fee NUMERIC(14,2) NOT NULL,
  payment_date DATE NOT NULL,
  remark VARCHAR(200),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nhi_supplement_company ON nhi_supplement_records(company_id);
CREATE INDEX IF NOT EXISTS idx_nhi_supplement_date ON nhi_supplement_records(payment_date);
CREATE INDEX IF NOT EXISTS idx_nhi_supplement_type ON nhi_supplement_records(payment_type);

COMMENT ON TABLE nhi_supplement_records IS '二代健保補充保費記錄';

-- ============================================================================
-- 15. 電子發票設定
-- ============================================================================

CREATE TABLE IF NOT EXISTS einvoice_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  app_id VARCHAR(50) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  card_no VARCHAR(20),
  card_encrypt VARCHAR(255),
  is_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE einvoice_configs IS '電子發票設定';

-- ============================================================================
-- 16. 電子發票同步記錄
-- ============================================================================

CREATE TABLE IF NOT EXISTS einvoice_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES einvoice_configs(id) ON DELETE CASCADE,

  sync_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_records INTEGER NOT NULL,
  new_records INTEGER NOT NULL,
  status import_status DEFAULT 'PENDING',
  error_message VARCHAR(500),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_einvoice_imports_company ON einvoice_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_einvoice_imports_config ON einvoice_imports(config_id);

COMMENT ON TABLE einvoice_imports IS '電子發票同步記錄';

-- ============================================================================
-- 17. 時間戳觸發器
-- ============================================================================

-- 通用 updated_at 觸發器（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為所有表建立觸發器
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM (VALUES
      ('accounts'), ('tax_codes'), ('counterparties'), ('acc_invoices'),
      ('journal_entries'), ('acc_transactions'), ('bank_accounts'),
      ('bank_statement_imports'), ('bank_transactions'), ('accounting_periods'),
      ('tax_returns'), ('withholding_records'), ('nhi_supplement_records'),
      ('einvoice_configs'), ('einvoice_imports')
    ) AS tables(table_name)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- 18. RLS 政策
-- ============================================================================

-- 啟用 RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE acc_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE acc_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE withholding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhi_supplement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE einvoice_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE einvoice_imports ENABLE ROW LEVEL SECURITY;

-- accounts RLS（系統預設 + 公司專屬）
CREATE POLICY "accounts_select" ON accounts
  FOR SELECT USING (
    company_id IS NULL
    OR can_access_company_rls(company_id)
    OR is_super_admin()
  );

CREATE POLICY "accounts_insert" ON accounts
  FOR INSERT WITH CHECK (
    can_access_company_rls(company_id)
  );

CREATE POLICY "accounts_update" ON accounts
  FOR UPDATE USING (
    can_access_company_rls(company_id)
  );

CREATE POLICY "accounts_delete" ON accounts
  FOR DELETE USING (
    (can_access_company_rls(company_id) AND NOT is_system)
    OR is_super_admin()
  );

-- tax_codes RLS（全域讀取，只有 Super Admin 可寫）
CREATE POLICY "tax_codes_select" ON tax_codes
  FOR SELECT USING (true);

CREATE POLICY "tax_codes_modify" ON tax_codes
  FOR ALL USING (is_super_admin());

-- counterparties RLS
CREATE POLICY "counterparties_select" ON counterparties
  FOR SELECT USING (
    can_access_company_rls(company_id) OR is_super_admin()
  );

CREATE POLICY "counterparties_insert" ON counterparties
  FOR INSERT WITH CHECK (can_access_company_rls(company_id));

CREATE POLICY "counterparties_update" ON counterparties
  FOR UPDATE USING (can_access_company_rls(company_id));

CREATE POLICY "counterparties_delete" ON counterparties
  FOR DELETE USING (
    can_access_company_rls(company_id) OR is_super_admin()
  );

-- 公司層級 RLS 通用 Macro
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM (VALUES
      ('acc_invoices'), ('journal_entries'), ('acc_transactions'),
      ('bank_accounts'), ('bank_statement_imports'), ('bank_transactions'),
      ('accounting_periods'), ('tax_returns'), ('withholding_records'),
      ('nhi_supplement_records'), ('einvoice_configs'), ('einvoice_imports')
    ) AS tables(table_name)
  LOOP
    -- SELECT
    EXECUTE format('CREATE POLICY "%s_select" ON %s
      FOR SELECT USING (
        can_access_company_rls(company_id) OR is_super_admin()
      )', t, t);

    -- INSERT
    EXECUTE format('CREATE POLICY "%s_insert" ON %s
      FOR INSERT WITH CHECK (can_access_company_rls(company_id))', t, t);

    -- UPDATE
    EXECUTE format('CREATE POLICY "%s_update" ON %s
      FOR UPDATE USING (can_access_company_rls(company_id))', t, t);

    -- DELETE
    EXECUTE format('CREATE POLICY "%s_delete" ON %s
      FOR DELETE USING (
        can_access_company_rls(company_id) OR is_super_admin()
      )', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- 19. 權限設定
-- ============================================================================

-- 新增會計相關權限
INSERT INTO permissions (resource, action, name, description) VALUES
  -- 會計科目
  ('accounts', 'read', 'accounts:read', '檢視會計科目'),
  ('accounts', 'write', 'accounts:write', '建立/編輯會計科目'),
  ('accounts', 'delete', 'accounts:delete', '刪除會計科目'),
  -- 發票
  ('acc_invoices', 'read', 'acc_invoices:read', '檢視發票'),
  ('acc_invoices', 'write', 'acc_invoices:write', '建立/編輯發票'),
  ('acc_invoices', 'delete', 'acc_invoices:delete', '刪除發票'),
  ('acc_invoices', 'post', 'acc_invoices:post', '過帳發票'),
  -- 傳票
  ('journal_entries', 'read', 'journal_entries:read', '檢視傳票'),
  ('journal_entries', 'write', 'journal_entries:write', '建立/編輯傳票'),
  ('journal_entries', 'delete', 'journal_entries:delete', '刪除傳票'),
  ('journal_entries', 'post', 'journal_entries:post', '過帳傳票'),
  -- 銀行對帳
  ('bank_reconciliation', 'read', 'bank_reconciliation:read', '檢視銀行對帳'),
  ('bank_reconciliation', 'write', 'bank_reconciliation:write', '執行銀行對帳'),
  -- 稅務申報
  ('tax_returns', 'read', 'tax_returns:read', '檢視稅務申報'),
  ('tax_returns', 'write', 'tax_returns:write', '編輯稅務申報'),
  ('tax_returns', 'submit', 'tax_returns:submit', '提交稅務申報'),
  -- 電子發票
  ('einvoice', 'read', 'einvoice:read', '檢視電子發票'),
  ('einvoice', 'sync', 'einvoice:sync', '同步電子發票')
ON CONFLICT (name) DO NOTHING;

-- Super Admin：所有會計權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
  AND p.resource IN ('accounts', 'acc_invoices', 'journal_entries', 'bank_reconciliation', 'tax_returns', 'einvoice')
ON CONFLICT DO NOTHING;

-- Company Owner：所有會計權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'company_owner'
  AND p.resource IN ('accounts', 'acc_invoices', 'journal_entries', 'bank_reconciliation', 'tax_returns', 'einvoice')
ON CONFLICT DO NOTHING;

-- Accountant：所有會計權限（除刪除）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'accountant'
  AND p.name NOT LIKE '%:delete'
  AND p.resource IN ('accounts', 'acc_invoices', 'journal_entries', 'bank_reconciliation', 'tax_returns', 'einvoice')
ON CONFLICT DO NOTHING;

-- Sales Manager：唯讀發票
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'sales_manager'
  AND p.name IN ('acc_invoices:read')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 20. 記錄遷移
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('044_accounting_core_tables.sql')
ON CONFLICT (filename) DO NOTHING;

NOTIFY pgrst, 'reload schema';

SELECT 'Accounting core tables migration completed! 16 tables created.' as status;
