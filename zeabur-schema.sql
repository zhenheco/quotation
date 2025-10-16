-- Zeabur PostgreSQL Schema (Standard PostgreSQL, without Supabase-specific features)
-- 此檔案適用於標準 PostgreSQL,不包含 Supabase 的 auth 系統

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Exchange rates table (獨立表,不需要 auth)
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

-- Create index for better performance
CREATE INDEX idx_exchange_rates_currencies_date ON exchange_rates(from_currency, to_currency, date);

-- 注意: 其他表 (customers, products, quotations, quotation_items) 依賴 Supabase 的 auth.users
-- 這些表需要在有實際用戶系統時才能建立
-- 目前僅建立 exchange_rates 表以支援匯率功能

-- Grant permissions to root user (標準 PostgreSQL 權限管理)
GRANT ALL PRIVILEGES ON TABLE exchange_rates TO root;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO root;
