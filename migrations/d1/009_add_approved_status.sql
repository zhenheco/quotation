-- Migration: Add 'approved' status to quotations
-- Description: Extend quotation status to include 'approved' state
-- Created: 2025-11-16
-- D1 (SQLite) compatible version

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints
-- We need to recreate the table with the new constraint

-- Step 1: Create new table with updated constraint
CREATE TABLE quotations_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  customer_id TEXT NOT NULL,
  quotation_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'approved')),
  issue_date TEXT NOT NULL DEFAULT (date('now')),
  valid_until TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TWD',
  subtotal REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 5.00,
  tax_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  payment_method TEXT NULL,
  payment_notes TEXT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Step 2: Copy data from old table
INSERT INTO quotations_new
SELECT * FROM quotations;

-- Step 3: Drop old table
DROP TABLE quotations;

-- Step 4: Rename new table
ALTER TABLE quotations_new RENAME TO quotations;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_issue_date ON quotations(issue_date);
