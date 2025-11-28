-- ============================================================================
-- Quotation System - Supabase Database Schema
-- 版本：1.0.0
-- 日期：2024-11
-- ============================================================================

-- 啟用必要的擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- RBAC 系統表
-- ============================================================================

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  name_zh VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 權限表
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  name VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- 角色權限關聯表
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- 使用者角色表
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- ============================================================================
-- 公司管理表
-- ============================================================================

-- 公司表
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name JSONB NOT NULL DEFAULT '{"zh": "", "en": ""}',
  logo_url TEXT,
  tax_id VARCHAR(50),
  address JSONB DEFAULT '{"zh": "", "en": ""}',
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 公司成員表
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id),
  is_owner BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- ============================================================================
-- 業務資料表
-- ============================================================================

-- 客戶表
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name JSONB NOT NULL DEFAULT '{"zh": "", "en": ""}',
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address JSONB DEFAULT '{"zh": "", "en": ""}',
  tax_id VARCHAR(50),
  contact_person JSONB DEFAULT '{"name": "", "phone": "", "email": ""}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 產品表
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  sku VARCHAR(100),
  name JSONB NOT NULL DEFAULT '{"zh": "", "en": ""}',
  description JSONB DEFAULT '{"zh": "", "en": ""}',
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'TWD',
  cost_price DECIMAL(15,2),
  cost_currency VARCHAR(10),
  profit_margin DECIMAL(5,2),
  supplier VARCHAR(255),
  unit VARCHAR(50) DEFAULT 'piece',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 報價單表
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'approved', 'expired')),
  issue_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  currency VARCHAR(10) DEFAULT 'TWD',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 5.00,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  notes JSONB DEFAULT '{"zh": "", "en": ""}',
  terms JSONB DEFAULT '{"zh": "", "en": ""}',
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 報價單項目表
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description JSONB NOT NULL DEFAULT '{"zh": "", "en": ""}',
  quantity DECIMAL(10,2) DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'piece',
  unit_price DECIMAL(15,2) NOT NULL,
  discount DECIMAL(5,2) DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 付款條款表
CREATE TABLE IF NOT EXISTS payment_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  term_type VARCHAR(50) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE,
  description JSONB DEFAULT '{"zh": "", "en": ""}',
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 合約管理表
-- ============================================================================

-- 合約表
CREATE TABLE IF NOT EXISTS customer_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled', 'expired')),
  total_amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'TWD',
  payment_collected DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 合約服務表
CREATE TABLE IF NOT EXISTS contract_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES customer_contracts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description JSONB NOT NULL DEFAULT '{"zh": "", "en": ""}',
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 支付管理表
-- ============================================================================

-- 支付記錄表
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES customer_contracts(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  payment_type VARCHAR(20) NOT NULL
    CHECK (payment_type IN ('deposit', 'installment', 'final', 'full', 'other')),
  payment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'TWD',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  status VARCHAR(20) DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 付款排程表
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES customer_contracts(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  schedule_number INTEGER NOT NULL,
  description VARCHAR(255),
  due_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'TWD',
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'collected', 'overdue')),
  paid_amount DECIMAL(15,2) DEFAULT 0,
  collected_at TIMESTAMPTZ,
  source_type VARCHAR(20) DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'quotation', 'contract')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 匯率表
-- ============================================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency VARCHAR(10) NOT NULL,
  target_currency VARCHAR(10) NOT NULL,
  rate DECIMAL(15,6) NOT NULL,
  source VARCHAR(50) DEFAULT 'manual',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_currency, target_currency)
);

-- ============================================================================
-- 監控與日誌表
-- ============================================================================

-- 審計日誌表
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 建立索引
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- 啟用 Row Level Security
-- ============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS 政策（基於 user_id）
-- ============================================================================

-- Customers
CREATE POLICY "Users can manage own customers" ON customers
  FOR ALL USING (auth.uid() = user_id);

-- Products
CREATE POLICY "Users can manage own products" ON products
  FOR ALL USING (auth.uid() = user_id);

-- Quotations
CREATE POLICY "Users can manage own quotations" ON quotations
  FOR ALL USING (auth.uid() = user_id);

-- Quotation Items（透過 quotation 關聯）
CREATE POLICY "Users can manage own quotation items" ON quotation_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_items.quotation_id
      AND q.user_id = auth.uid()
    )
  );

-- Payment Terms
CREATE POLICY "Users can manage own payment terms" ON payment_terms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = payment_terms.quotation_id
      AND q.user_id = auth.uid()
    )
  );

-- Contracts
CREATE POLICY "Users can manage own contracts" ON customer_contracts
  FOR ALL USING (auth.uid() = user_id);

-- Contract Services
CREATE POLICY "Users can manage own contract services" ON contract_services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customer_contracts c
      WHERE c.id = contract_services.contract_id
      AND c.user_id = auth.uid()
    )
  );

-- Payments
CREATE POLICY "Users can manage own payments" ON payments
  FOR ALL USING (auth.uid() = user_id);

-- Payment Schedules
CREATE POLICY "Users can manage own payment schedules" ON payment_schedules
  FOR ALL USING (auth.uid() = user_id);
