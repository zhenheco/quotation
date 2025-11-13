-- ============================================================================
-- D1 遠端資料庫 Schema 修復腳本
-- 修復缺失的 payment_schedules 表和 customer_contracts 欄位
-- ============================================================================

-- 1. 創建 payment_schedules 表
CREATE TABLE IF NOT EXISTS payment_schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  schedule_number INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_amount REAL DEFAULT 0,
  paid_date TEXT,
  payment_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(contract_id, schedule_number),
  FOREIGN KEY (contract_id) REFERENCES customer_contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract ON payment_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_customer ON payment_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_user ON payment_schedules(user_id);

-- 2. 添加 customer_contracts 缺失的欄位
ALTER TABLE customer_contracts ADD COLUMN next_collection_date TEXT;
ALTER TABLE customer_contracts ADD COLUMN next_collection_amount REAL;
ALTER TABLE customer_contracts ADD COLUMN quotation_id TEXT;

-- 3. 創建索引
CREATE INDEX IF NOT EXISTS idx_customer_contracts_quotation ON customer_contracts(quotation_id);
CREATE INDEX IF NOT EXISTS idx_customer_contracts_next_collection ON customer_contracts(next_collection_date);

-- 完成
SELECT 'Schema repair completed successfully!' as status;
