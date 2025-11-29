-- ============================================================================
-- Migration 023: Create Payment Terms Table and Exchange Rates Permissions
-- Created: 2025-11-29
-- Description:
--   1. 建立 payment_terms 表格，用於報價單的付款期數管理
--   2. 新增 exchange_rates 權限並分配給角色
-- ============================================================================

-- ============================================================================
-- 1. 建立 payment_terms 表格
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  term_number INTEGER NOT NULL,
  term_name TEXT,
  percentage NUMERIC(5,2) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  due_date DATE,
  paid_amount NUMERIC(15,2) DEFAULT 0,
  paid_date DATE,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quotation_id, term_number)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_payment_terms_quotation ON payment_terms(quotation_id);
CREATE INDEX IF NOT EXISTS idx_payment_terms_status ON payment_terms(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_terms_due_date ON payment_terms(due_date);

-- 啟用 RLS
ALTER TABLE payment_terms ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage payment terms for their company quotations"
ON payment_terms FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM quotations q
    JOIN company_members cm ON cm.company_id = q.company_id
    WHERE q.id = payment_terms.quotation_id
    AND cm.user_id = auth.uid()
  )
);

-- ============================================================================
-- 2. 新增 exchange_rates 權限
-- ============================================================================

INSERT INTO permissions (resource, action, name, description) VALUES
  ('exchange_rates', 'read', 'exchange_rates:read', '查看匯率'),
  ('exchange_rates', 'write', 'exchange_rates:write', '編輯匯率')
ON CONFLICT (resource, action) DO NOTHING;

-- 分配權限給角色（super_admin, company_owner, sales_manager, accountant）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'company_owner', 'sales_manager', 'accountant')
AND p.resource = 'exchange_rates'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
