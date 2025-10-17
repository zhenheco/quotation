-- ========================================
-- Zeabur PostgreSQL Schema
-- 移除 Supabase 專屬功能（RLS, auth.users）
-- ========================================

-- 步驟 1: 刪除所有現有表（按照依賴順序）
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;

-- 步驟 2: 刪除觸發器函數
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 步驟 3: 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 重建所有表（無 Supabase 依賴）
-- ========================================

-- 1. Customers table (客戶表)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,  -- 不再 REFERENCES auth.users
  name JSONB NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address JSONB,
  tax_id VARCHAR(50),
  contact_person JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products table (產品表)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,  -- 不再 REFERENCES auth.users
  sku VARCHAR(100),
  name JSONB NOT NULL,
  description JSONB,
  unit_price DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Quotations table (報價單表)
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,  -- 不再 REFERENCES auth.users
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  issue_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
  total_amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Quotation items table (報價單項目表)
CREATE TABLE quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
  subtotal DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Exchange rates table (匯率表)
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10, 6) NOT NULL,
  date DATE NOT NULL,
  source VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, date)
);

-- ========================================
-- 創建索引
-- ========================================
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_email ON customers(email);

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_sku ON products(sku);

CREATE INDEX idx_quotations_user_id ON quotations(user_id);
CREATE INDEX idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_number ON quotations(quotation_number);

CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX idx_quotation_items_product_id ON quotation_items(product_id);

CREATE INDEX idx_exchange_rates_currencies_date ON exchange_rates(from_currency, to_currency, date);

-- ========================================
-- 創建觸發器函數
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- 應用觸發器
-- ========================================
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotation_items_updated_at BEFORE UPDATE ON quotation_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 注意：無 RLS 策略
-- 用戶隔離將在應用層實現
-- ========================================

-- 完成！
SELECT 'Zeabur PostgreSQL schema created successfully! All tables, indexes, and triggers are in place.' AS status;
