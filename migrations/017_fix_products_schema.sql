-- ============================================================================
-- 修復 products 表缺少的欄位
-- ============================================================================

-- 添加 unit 欄位（單位）
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'piece';

-- 添加 is_active 欄位
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 確保 currency 欄位存在
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TWD';

-- 添加 supplier_code 欄位（如果不存在）
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(100);

-- ============================================================================
-- 修復 quotation_items 表缺少的欄位
-- ============================================================================

-- 添加 description 欄位
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS description JSONB;

-- 添加 unit 欄位
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'piece';

-- 添加 sort_order 欄位
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ============================================================================
-- 修復 customers 表缺少的欄位
-- ============================================================================

-- 添加 notes 欄位
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- 建立產品供應商成本表（多供應商支援）
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_supplier_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_name VARCHAR(255) NOT NULL,
  supplier_code VARCHAR(100),
  cost_price DECIMAL(12,2) NOT NULL,
  cost_currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
  is_preferred BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_supplier_costs_product ON product_supplier_costs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_supplier_costs_preferred ON product_supplier_costs(is_preferred);

-- ============================================================================
-- 完成
-- ============================================================================
