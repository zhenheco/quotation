-- ============================================================================
-- Migration: 048_fix_accounting_schema.sql
-- Created: 2025-12-26
-- Description: 修復會計系統 schema - 補充缺少的欄位和表格
-- Issue: RPC 函數 (047) 與表結構 (044) 不匹配
-- ============================================================================

-- ============================================================================
-- 1. 補充 acc_invoices 表欄位
-- ============================================================================

ALTER TABLE acc_invoices
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id),
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS posted_by UUID,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by UUID,
  ADD COLUMN IF NOT EXISTS void_reason VARCHAR(200);

COMMENT ON COLUMN acc_invoices.journal_entry_id IS '過帳時產生的傳票 ID';
COMMENT ON COLUMN acc_invoices.posted_at IS '過帳時間';
COMMENT ON COLUMN acc_invoices.posted_by IS '過帳人員 ID';
COMMENT ON COLUMN acc_invoices.voided_at IS '作廢時間';
COMMENT ON COLUMN acc_invoices.voided_by IS '作廢人員 ID';
COMMENT ON COLUMN acc_invoices.void_reason IS '作廢原因';

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_acc_invoices_journal_entry ON acc_invoices(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_acc_invoices_posted_at ON acc_invoices(posted_at);
CREATE INDEX IF NOT EXISTS idx_acc_invoices_voided_at ON acc_invoices(voided_at);

-- ============================================================================
-- 2. 補充 bank_transactions 表欄位
-- ============================================================================

ALTER TABLE bank_transactions
  ADD COLUMN IF NOT EXISTS matched_journal_entry_id UUID REFERENCES journal_entries(id),
  ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS matched_by UUID;

COMMENT ON COLUMN bank_transactions.matched_journal_entry_id IS '對帳匹配的傳票 ID';
COMMENT ON COLUMN bank_transactions.matched_at IS '對帳時間';
COMMENT ON COLUMN bank_transactions.matched_by IS '對帳人員 ID';

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_bank_txn_matched_journal ON bank_transactions(matched_journal_entry_id);

-- ============================================================================
-- 3. 新建 invoice_payments 表（付款記錄）
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES acc_invoices(id) ON DELETE CASCADE,

  -- 付款資訊
  amount NUMERIC(14,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  reference VARCHAR(100),
  notes VARCHAR(200),

  -- 關聯傳票（可選，用於沖帳）
  journal_entry_id UUID REFERENCES journal_entries(id),

  -- 審計欄位
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_invoice_payments_company ON invoice_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_date ON invoice_payments(payment_date);

COMMENT ON TABLE invoice_payments IS '發票付款記錄';

-- 啟用 RLS
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- RLS 政策
CREATE POLICY "invoice_payments_select" ON invoice_payments
  FOR SELECT USING (
    can_access_company_rls(company_id) OR is_super_admin()
  );

CREATE POLICY "invoice_payments_insert" ON invoice_payments
  FOR INSERT WITH CHECK (can_access_company_rls(company_id));

CREATE POLICY "invoice_payments_update" ON invoice_payments
  FOR UPDATE USING (can_access_company_rls(company_id));

CREATE POLICY "invoice_payments_delete" ON invoice_payments
  FOR DELETE USING (
    can_access_company_rls(company_id) OR is_super_admin()
  );

-- 時間戳觸發器
DROP TRIGGER IF EXISTS update_invoice_payments_updated_at ON invoice_payments;
CREATE TRIGGER update_invoice_payments_updated_at
  BEFORE UPDATE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. 新增權限
-- ============================================================================

INSERT INTO permissions (resource, action, name, description) VALUES
  ('invoice_payments', 'read', 'invoice_payments:read', '檢視付款記錄'),
  ('invoice_payments', 'write', 'invoice_payments:write', '建立/編輯付款記錄'),
  ('invoice_payments', 'delete', 'invoice_payments:delete', '刪除付款記錄')
ON CONFLICT (name) DO NOTHING;

-- Super Admin：所有付款權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
  AND p.resource = 'invoice_payments'
ON CONFLICT DO NOTHING;

-- Company Owner：所有付款權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'company_owner'
  AND p.resource = 'invoice_payments'
ON CONFLICT DO NOTHING;

-- Accountant：所有付款權限（除刪除）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'accountant'
  AND p.name IN ('invoice_payments:read', 'invoice_payments:write')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. 記錄遷移
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('048_fix_accounting_schema.sql')
ON CONFLICT (filename) DO NOTHING;

NOTIFY pgrst, 'reload schema';

SELECT 'Migration 048: Accounting schema fixed! Added columns and invoice_payments table.' as status;
