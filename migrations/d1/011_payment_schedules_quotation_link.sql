-- ============================================================================
-- Payment Schedules 表修改：移除合約依賴，支援報價單直連
-- ============================================================================

-- 1. 新增 quotation_id 欄位
ALTER TABLE payment_schedules ADD COLUMN quotation_id TEXT;

-- 2. 新增 source_type 欄位，標記收款來源
ALTER TABLE payment_schedules ADD COLUMN source_type TEXT DEFAULT 'contract'
  CHECK (source_type IN ('quotation', 'manual', 'contract'));

-- 3. 新增 description 欄位（用於手動新增的收款說明）
ALTER TABLE payment_schedules ADD COLUMN description TEXT;

-- 4. 建立索引
CREATE INDEX IF NOT EXISTS idx_payment_schedules_quotation ON payment_schedules(quotation_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_source ON payment_schedules(source_type);

-- 5. 重建表以移除 contract_id 的 NOT NULL 約束
-- SQLite 不支援直接修改欄位約束，需要重建表

-- 5.1 建立新表（contract_id 改為可選）
CREATE TABLE payment_schedules_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  contract_id TEXT,  -- 改為可選
  quotation_id TEXT, -- 新增：直接關聯報價單
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
  description TEXT, -- 新增：收款說明
  source_type TEXT DEFAULT 'contract' CHECK (source_type IN ('quotation', 'manual', 'contract')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contract_id) REFERENCES customer_contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

-- 5.2 複製現有資料
INSERT INTO payment_schedules_new (
  id, user_id, contract_id, quotation_id, customer_id, schedule_number,
  due_date, amount, currency, status, paid_amount, paid_date,
  payment_id, notes, description, source_type, created_at, updated_at
)
SELECT
  id, user_id, contract_id, quotation_id, customer_id, schedule_number,
  due_date, amount, currency, status, paid_amount, paid_date,
  payment_id, notes, description, source_type, created_at, updated_at
FROM payment_schedules;

-- 5.3 刪除舊表
DROP TABLE payment_schedules;

-- 5.4 重命名新表
ALTER TABLE payment_schedules_new RENAME TO payment_schedules;

-- 5.5 重建索引
CREATE INDEX idx_payment_schedules_contract ON payment_schedules(contract_id);
CREATE INDEX idx_payment_schedules_customer ON payment_schedules(customer_id);
CREATE INDEX idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX idx_payment_schedules_user ON payment_schedules(user_id);
CREATE INDEX idx_payment_schedules_quotation ON payment_schedules(quotation_id);
CREATE INDEX idx_payment_schedules_source ON payment_schedules(source_type);

-- 完成
SELECT 'Payment schedules table updated for quotation direct link!' as status;
