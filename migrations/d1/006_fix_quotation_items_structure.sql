-- ============================================================================
-- 修復 quotation_items 表的 description 欄位位置錯誤
-- Date: 2025-11-14
-- ============================================================================

-- 1. 備份現有資料到臨時表
CREATE TABLE quotation_items_backup AS
SELECT * FROM quotation_items;

-- 2. 刪除原表
DROP TABLE quotation_items;

-- 3. 重新建立表，欄位順序正確
CREATE TABLE quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT,  -- 正確位置：第4個欄位
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- 4. 還原資料（如果有）
INSERT INTO quotation_items (
  id, quotation_id, product_id, description, quantity,
  unit_price, discount, subtotal, created_at, updated_at
)
SELECT
  id, quotation_id, product_id, description, quantity,
  unit_price, discount, subtotal, created_at, updated_at
FROM quotation_items_backup;

-- 5. 刪除備份表
DROP TABLE quotation_items_backup;

-- ============================================================================
-- 驗證腳本
-- ============================================================================
-- 執行後請確認：
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='quotation_items';
-- 應該看到 description 在正確的位置（第4個欄位）