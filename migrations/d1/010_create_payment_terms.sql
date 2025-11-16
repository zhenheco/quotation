-- ============================================================================
-- Migration 010: Create Payment Terms Table
-- Created: 2025-11-16
-- Description: 建立付款條款表，用於報價單的付款期數管理
-- ============================================================================

-- 建立付款條款表
CREATE TABLE IF NOT EXISTS payment_terms (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  term_number INTEGER NOT NULL,
  term_name TEXT,
  percentage REAL NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT,
  paid_amount REAL DEFAULT 0,
  paid_date TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  UNIQUE(quotation_id, term_number)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_payment_terms_quotation ON payment_terms(quotation_id);
CREATE INDEX IF NOT EXISTS idx_payment_terms_status ON payment_terms(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_terms_due_date ON payment_terms(due_date);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 010 completed successfully!' as status,
       'Created payment_terms table for quotation payment tracking' as description;
