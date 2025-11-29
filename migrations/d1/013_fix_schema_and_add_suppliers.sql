-- ============================================================================
-- 修復 Schema 欄位不一致 + 新增多供應商支援
-- ============================================================================

-- 1. 修復 products 表 - 新增缺少的欄位
ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'piece';
ALTER TABLE products ADD COLUMN supplier_code TEXT;

-- 2. 修復 quotation_items 表 - 新增缺少的欄位
ALTER TABLE quotation_items ADD COLUMN description TEXT;
ALTER TABLE quotation_items ADD COLUMN unit TEXT DEFAULT 'piece';
ALTER TABLE quotation_items ADD COLUMN sort_order INTEGER DEFAULT 0;

-- 3. 修復 customers 表 - 新增缺少的欄位
ALTER TABLE customers ADD COLUMN notes TEXT;

-- 4. 建立產品供應商成本表（簡化版多供應商支援）
CREATE TABLE IF NOT EXISTS product_supplier_costs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_code TEXT,
  cost_price REAL NOT NULL,
  cost_currency TEXT NOT NULL DEFAULT 'TWD',
  is_preferred INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_supplier_costs_product ON product_supplier_costs(product_id);
CREATE INDEX idx_product_supplier_costs_preferred ON product_supplier_costs(is_preferred);

-- ============================================================================
-- 完成
-- ============================================================================
SELECT 'Schema fixes and supplier support added successfully!' as status;
