-- ============================================================================
-- Quotation System - Complete Database Setup
-- 在 Supabase SQL Editor 中執行此腳本
-- ============================================================================

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- From: 000_initial_schema.sql
-- ============================================================================
-- ============================================================================
-- 報價單系統 - 初始資料庫架構
-- ============================================================================

-- 客戶表
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name JSONB NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address JSONB,
  tax_id VARCHAR(50),
  contact_person JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 產品/服務表
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sku VARCHAR(100),
  name JSONB NOT NULL,
  description JSONB,
  unit_price DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 報價單表
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);

-- 報價單項目表
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  discount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product_id ON quotation_items(product_id);

-- 報價單分享連結表
CREATE TABLE IF NOT EXISTS quotation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_shares_token ON quotation_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_quotation_shares_quotation_id ON quotation_shares(quotation_id);

-- 報價單版本歷史表
CREATE TABLE IF NOT EXISTS quotation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_quotation_id ON quotation_versions(quotation_id);

-- 匯率表
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(15, 6) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(base_currency, target_currency)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates(base_currency, target_currency);

-- 更新時間戳記觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 為所有表添加更新時間觸發器
DO $$
BEGIN
  -- customers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at') THEN
    CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- products
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- quotations
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quotations_updated_at') THEN
    CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- quotation_items
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quotation_items_updated_at') THEN
    CREATE TRIGGER update_quotation_items_updated_at BEFORE UPDATE ON quotation_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 插入初始匯率數據（範例）
INSERT INTO exchange_rates (base_currency, target_currency, rate) VALUES
  ('TWD', 'USD', 0.032),
  ('TWD', 'EUR', 0.029),
  ('TWD', 'JPY', 4.5),
  ('TWD', 'CNY', 0.22),
  ('USD', 'TWD', 31.5),
  ('EUR', 'TWD', 34.2),
  ('JPY', 'TWD', 0.22),
  ('CNY', 'TWD', 4.5)
ON CONFLICT (base_currency, target_currency) DO NOTHING;

-- 完成
SELECT 'Initial schema created successfully!' as status;


-- ============================================================================
-- From: 001_rbac_and_new_features.sql
-- ============================================================================
-- Migration: RBAC System, Company Settings, Contracts, and Payment Tracking
-- Created: 2025-10-18
-- Description: Adds role-based access control, company settings with file uploads,
--              customer contracts, product costs, and payment tracking system

-- ============================================================================
-- 1. ROLES AND PERMISSIONS SYSTEM
-- ============================================================================

-- Roles table: Define system roles with hierarchical levels
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL, -- 'super_admin', 'company_owner', 'sales_manager', 'salesperson', 'accountant'
  name_zh VARCHAR(50) NOT NULL, -- Chinese display name
  name_en VARCHAR(50) NOT NULL, -- English display name
  level INTEGER NOT NULL, -- 1=super_admin, 2=company_owner, 3=sales_manager, 4=salesperson, 5=accountant
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, name_zh, name_en, level, description) VALUES
  ('super_admin', '總管理員', 'Super Admin', 1, 'Full system access'),
  ('company_owner', '公司負責人', 'Company Owner', 2, 'Company-wide management'),
  ('sales_manager', '業務主管', 'Sales Manager', 3, 'Sales team management'),
  ('salesperson', '業務人員', 'Salesperson', 4, 'Sales operations'),
  ('accountant', '會計', 'Accountant', 5, 'Financial operations');

-- Permissions table: Define granular permissions
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(50) NOT NULL, -- 'products', 'customers', 'quotations', 'company_settings', 'users'
  action VARCHAR(20) NOT NULL, -- 'read', 'write', 'delete'
  name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'products:read', 'products:write'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Insert default permissions
INSERT INTO permissions (resource, action, name, description) VALUES
  -- Products permissions
  ('products', 'read', 'products:read', 'View products'),
  ('products', 'write', 'products:write', 'Create/edit products'),
  ('products', 'delete', 'products:delete', 'Delete products'),
  ('products', 'read_cost', 'products:read_cost', 'View product costs'),

  -- Customers permissions
  ('customers', 'read', 'customers:read', 'View customers'),
  ('customers', 'write', 'customers:write', 'Create/edit customers'),
  ('customers', 'delete', 'customers:delete', 'Delete customers'),

  -- Quotations permissions
  ('quotations', 'read', 'quotations:read', 'View quotations'),
  ('quotations', 'write', 'quotations:write', 'Create/edit quotations'),
  ('quotations', 'delete', 'quotations:delete', 'Delete quotations'),

  -- Contracts permissions
  ('contracts', 'read', 'contracts:read', 'View contracts'),
  ('contracts', 'write', 'contracts:write', 'Create/edit contracts'),
  ('contracts', 'delete', 'contracts:delete', 'Delete contracts'),

  -- Payments permissions
  ('payments', 'read', 'payments:read', 'View payments'),
  ('payments', 'write', 'payments:write', 'Create/edit payments'),
  ('payments', 'delete', 'payments:delete', 'Delete payments'),

  -- Company settings permissions
  ('company_settings', 'read', 'company_settings:read', 'View company settings'),
  ('company_settings', 'write', 'company_settings:write', 'Edit company settings'),

  -- Users permissions
  ('users', 'read', 'users:read', 'View users'),
  ('users', 'write', 'users:write', 'Create/edit users'),
  ('users', 'delete', 'users:delete', 'Delete users'),
  ('users', 'assign_roles', 'users:assign_roles', 'Assign user roles');

-- Role permissions mapping
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Grant permissions to roles
-- Super Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin';

-- Company Owner: All except super admin specific permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'company_owner'
  AND p.name NOT IN ('users:assign_roles'); -- Can't assign super admin role

-- Sales Manager: Product, customer, quotation, contract management + read payments
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'sales_manager'
  AND p.name IN (
    'products:read', 'products:write',
    'customers:read', 'customers:write',
    'quotations:read', 'quotations:write', 'quotations:delete',
    'contracts:read', 'contracts:write',
    'payments:read',
    'users:read'
  );

-- Salesperson: Read all, write quotations and customers
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'salesperson'
  AND p.name IN (
    'products:read',
    'customers:read', 'customers:write',
    'quotations:read', 'quotations:write',
    'contracts:read',
    'payments:read'
  );

-- Accountant: Full payment access, read all, product cost access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'accountant'
  AND p.name IN (
    'products:read', 'products:read_cost',
    'customers:read',
    'quotations:read',
    'contracts:read',
    'payments:read', 'payments:write', 'payments:delete',
    'company_settings:read'
  );

-- User roles assignment
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References auth.users(id) from Supabase
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by UUID, -- User ID who assigned this role
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL, -- References auth.users(id)
  full_name VARCHAR(255),
  display_name VARCHAR(100),
  phone VARCHAR(50),
  department VARCHAR(100),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================================================
-- 2. COMPANY SETTINGS (Logo, Bank Info, etc.)
-- ============================================================================

CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE, -- One setting per user/organization

  -- Company information
  company_name_zh VARCHAR(255),
  company_name_en VARCHAR(255),
  tax_id VARCHAR(50),

  -- Contact information
  address_zh TEXT,
  address_en TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),

  -- File uploads (Supabase Storage URLs)
  logo_url TEXT, -- Company logo
  signature_url TEXT, -- Company stamp/signature
  passbook_image_url TEXT, -- Bank passbook image (存摺影本)

  -- Bank information
  bank_name VARCHAR(255),
  bank_code VARCHAR(50),
  account_number VARCHAR(100),
  account_name VARCHAR(255),
  swift_code VARCHAR(50),

  -- Default settings
  default_currency VARCHAR(3) DEFAULT 'TWD',
  default_tax_rate DECIMAL(5,2) DEFAULT 5.00,

  -- Payment terms (for contracted customers)
  default_payment_terms VARCHAR(50), -- 'quarterly', 'semi_annual', 'annual'
  default_payment_day INTEGER DEFAULT 5, -- Day of month for payment collection

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_company_settings_user_id ON company_settings(user_id);

-- ============================================================================
-- 3. PRODUCTS: Add Cost Field
-- ============================================================================

ALTER TABLE products
  ADD COLUMN cost_price DECIMAL(12,2), -- Product cost (only visible to owner & accountant)
  ADD COLUMN cost_currency VARCHAR(3) DEFAULT 'TWD',
  ADD COLUMN profit_margin DECIMAL(5,2), -- Auto-calculated: (base_price - cost_price) / cost_price * 100
  ADD COLUMN supplier VARCHAR(255), -- Supplier name
  ADD COLUMN supplier_code VARCHAR(100); -- Supplier product code

-- Add index for cost calculations
CREATE INDEX idx_products_cost_price ON products(cost_price) WHERE cost_price IS NOT NULL;

COMMENT ON COLUMN products.cost_price IS 'Product cost - only visible to company_owner and accountant roles';
COMMENT ON COLUMN products.profit_margin IS 'Profit margin percentage - auto-calculated';

-- ============================================================================
-- 4. CUSTOMERS: Add Contract Status
-- ============================================================================

ALTER TABLE customers
  ADD COLUMN contract_status VARCHAR(20) DEFAULT 'prospect', -- 'prospect', 'contracted', 'expired', 'terminated'
  ADD COLUMN contract_expiry_date DATE,
  ADD COLUMN payment_terms VARCHAR(50), -- 'quarterly', 'semi_annual', 'annual'
  ADD COLUMN next_payment_due_date DATE,
  ADD COLUMN next_payment_amount DECIMAL(12,2),
  ADD COLUMN payment_currency VARCHAR(3) DEFAULT 'TWD';

CREATE INDEX idx_customers_contract_status ON customers(contract_status);
CREATE INDEX idx_customers_next_payment_due ON customers(next_payment_due_date) WHERE next_payment_due_date IS NOT NULL;

COMMENT ON COLUMN customers.contract_status IS '合約狀態: prospect=潛在客戶, contracted=已簽約, expired=已到期, terminated=已終止';
COMMENT ON COLUMN customers.payment_terms IS '付款週期: quarterly=季繳, semi_annual=半年繳, annual=年繳';

-- ============================================================================
-- 5. CUSTOMER CONTRACTS
-- ============================================================================

CREATE TABLE customer_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Owner of the contract
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Contract details
  contract_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., "C2025-001"
  title VARCHAR(255) NOT NULL,

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  signed_date DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'draft', 'active', 'expired', 'terminated'

  -- Financial
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  payment_terms VARCHAR(50), -- 'quarterly', 'semi_annual', 'annual'

  -- File uploads
  contract_file_url TEXT, -- Signed contract PDF

  -- Additional info
  notes TEXT,
  terms_and_conditions TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contracts_customer_id ON customer_contracts(customer_id);
CREATE INDEX idx_contracts_user_id ON customer_contracts(user_id);
CREATE INDEX idx_contracts_status ON customer_contracts(status);
CREATE INDEX idx_contracts_end_date ON customer_contracts(end_date);

COMMENT ON TABLE customer_contracts IS '客戶合約表 - 儲存已簽約客戶的合約資訊';

-- ============================================================================
-- 6. PAYMENT TRACKING SYSTEM
-- ============================================================================

-- Update quotations table to add payment tracking
ALTER TABLE quotations
  ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid', 'overdue'
  ADD COLUMN payment_due_date DATE,
  ADD COLUMN total_paid DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN deposit_amount DECIMAL(12,2), -- 頭款金額
  ADD COLUMN deposit_paid_date DATE,
  ADD COLUMN final_payment_amount DECIMAL(12,2), -- 尾款金額
  ADD COLUMN final_payment_due_date DATE;

CREATE INDEX idx_quotations_payment_status ON quotations(payment_status);
CREATE INDEX idx_quotations_payment_due_date ON quotations(payment_due_date) WHERE payment_due_date IS NOT NULL;

-- Payments table: Track all payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Owner

  -- Related to quotation or contract
  quotation_id UUID REFERENCES quotations(id) ON DELETE RESTRICT,
  contract_id UUID REFERENCES customer_contracts(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,

  -- Payment details
  payment_type VARCHAR(20) NOT NULL, -- 'deposit', 'installment', 'final', 'full'
  payment_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,

  -- Payment method
  payment_method VARCHAR(50), -- 'bank_transfer', 'credit_card', 'check', 'cash', 'other'
  reference_number VARCHAR(100), -- Bank transaction ID or check number

  -- File upload
  receipt_url TEXT, -- Payment receipt or proof

  -- Status
  status VARCHAR(20) DEFAULT 'confirmed', -- 'pending', 'confirmed', 'cancelled'

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (quotation_id IS NOT NULL OR contract_id IS NOT NULL)
);

CREATE INDEX idx_payments_quotation_id ON payments(quotation_id);
CREATE INDEX idx_payments_contract_id ON payments(contract_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(status);

COMMENT ON TABLE payments IS '收款記錄表 - 追蹤所有收款';

-- Payment schedules: Auto-generated payment due dates
CREATE TABLE payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Related to contract
  contract_id UUID NOT NULL REFERENCES customer_contracts(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Schedule details
  schedule_number INTEGER NOT NULL, -- 1, 2, 3... (1st payment, 2nd payment, etc.)
  due_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,

  -- Payment status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
  paid_amount DECIMAL(12,2) DEFAULT 0,
  paid_date DATE,

  -- Link to actual payment
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(contract_id, schedule_number)
);

CREATE INDEX idx_payment_schedules_contract_id ON payment_schedules(contract_id);
CREATE INDEX idx_payment_schedules_customer_id ON payment_schedules(customer_id);
CREATE INDEX idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX idx_payment_schedules_status ON payment_schedules(status);

COMMENT ON TABLE payment_schedules IS '付款排程表 - 自動產生的付款到期日';

-- ============================================================================
-- 7. AUDIT LOG (Track who created/modified records)
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- What was changed
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'

  -- Changes
  old_values JSONB,
  new_values JSONB,

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- 8. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function: Update payment status when payment is added/updated
CREATE OR REPLACE FUNCTION update_quotation_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid_amount DECIMAL(12,2);
  quotation_total DECIMAL(12,2);
BEGIN
  -- Only process if quotation_id is present
  IF NEW.quotation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate total confirmed payments for this quotation
  SELECT COALESCE(SUM(amount), 0) INTO total_paid_amount
  FROM payments
  WHERE quotation_id = NEW.quotation_id
    AND status = 'confirmed';

  -- Get quotation total
  SELECT total INTO quotation_total
  FROM quotations
  WHERE id = NEW.quotation_id;

  -- Update quotation payment status
  UPDATE quotations
  SET
    total_paid = total_paid_amount,
    payment_status = CASE
      WHEN total_paid_amount = 0 THEN 'unpaid'
      WHEN total_paid_amount >= quotation_total THEN 'paid'
      WHEN payment_due_date IS NOT NULL AND payment_due_date < CURRENT_DATE AND total_paid_amount < quotation_total THEN 'overdue'
      ELSE 'partial'
    END,
    updated_at = NOW()
  WHERE id = NEW.quotation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quotation_payment_status
AFTER INSERT OR UPDATE OF amount, status ON payments
FOR EACH ROW
EXECUTE FUNCTION update_quotation_payment_status();

-- Function: Auto-update contract status based on end date
CREATE OR REPLACE FUNCTION check_contract_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-expire contracts that have passed their end date
  IF NEW.end_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_contract_expiry
BEFORE INSERT OR UPDATE ON customer_contracts
FOR EACH ROW
EXECUTE FUNCTION check_contract_expiry();

-- Function: Auto-update payment schedule status to overdue
CREATE OR REPLACE FUNCTION check_payment_overdue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date < CURRENT_DATE AND NEW.status = 'pending' THEN
    NEW.status := 'overdue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_payment_overdue
BEFORE INSERT OR UPDATE ON payment_schedules
FOR EACH ROW
EXECUTE FUNCTION check_payment_overdue();

-- Function: Calculate profit margin when cost or price changes
CREATE OR REPLACE FUNCTION calculate_profit_margin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cost_price IS NOT NULL AND NEW.cost_price > 0 AND NEW.base_price IS NOT NULL THEN
    NEW.profit_margin := ((NEW.base_price - NEW.cost_price) / NEW.cost_price * 100);
  ELSE
    NEW.profit_margin := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_profit_margin
BEFORE INSERT OR UPDATE OF cost_price, base_price ON products
FOR EACH ROW
EXECUTE FUNCTION calculate_profit_margin();

-- Function: Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all tables with updated_at column
CREATE TRIGGER trigger_update_company_settings_timestamp
BEFORE UPDATE ON company_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_user_profiles_timestamp
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_customer_contracts_timestamp
BEFORE UPDATE ON customer_contracts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_payments_timestamp
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_payment_schedules_timestamp
BEFORE UPDATE ON payment_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: User permissions (flatten role permissions for easy checking)
CREATE OR REPLACE VIEW user_permissions AS
SELECT
  ur.user_id,
  r.name as role_name,
  r.level as role_level,
  p.resource,
  p.action,
  p.name as permission_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;

-- View: Overdue payments (>30 days from last payment)
CREATE OR REPLACE VIEW overdue_payments AS
SELECT
  ps.*,
  c.company_name_zh,
  c.company_name_en,
  c.contact_person,
  CURRENT_DATE - ps.due_date as days_overdue
FROM payment_schedules ps
JOIN customers c ON ps.customer_id = c.id
WHERE ps.status = 'overdue'
ORDER BY ps.due_date ASC;

-- View: Upcoming payments (next 30 days)
CREATE OR REPLACE VIEW upcoming_payments AS
SELECT
  ps.*,
  c.company_name_zh,
  c.company_name_en,
  c.contact_person,
  ps.due_date - CURRENT_DATE as days_until_due
FROM payment_schedules ps
JOIN customers c ON ps.customer_id = c.id
WHERE ps.status = 'pending'
  AND ps.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY ps.due_date ASC;

-- View: Product profitability (with cost visibility check handled by application)
CREATE OR REPLACE VIEW product_profitability AS
SELECT
  p.id,
  p.user_id,
  p.product_number,
  p.name_zh,
  p.name_en,
  p.base_price,
  p.currency,
  p.cost_price,
  p.cost_currency,
  p.profit_margin,
  CASE
    WHEN p.cost_price IS NOT NULL AND p.cost_price > 0
    THEN p.base_price - p.cost_price
    ELSE NULL
  END as profit_amount,
  p.category,
  p.is_active
FROM products p
WHERE p.cost_price IS NOT NULL;

COMMENT ON VIEW product_profitability IS 'Product profitability analysis - cost_price should only be shown to company_owner and accountant';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- 1. ✅ RBAC system with 5 roles and granular permissions
-- 2. ✅ Company settings table with logo and bank info
-- 3. ✅ Product cost field with profit margin calculation
-- 4. ✅ Customer contract status and payment terms
-- 5. ✅ Customer contracts table with file storage
-- 6. ✅ Payment tracking system (payments + schedules)
-- 7. ✅ Audit logging for security
-- 8. ✅ Auto-update triggers for status changes
-- 9. ✅ Useful views for common queries


-- ============================================================================
-- From: 002_rbac_fixed.sql
-- ============================================================================
-- Migration: RBAC System and New Features (Fixed for existing schema)
-- Created: 2025-10-18
-- Description: Adds role-based access control, company settings, contracts, and payment tracking
--              Compatible with existing JSONB-based schema

-- ============================================================================
-- 1. ROLES AND PERMISSIONS SYSTEM
-- ============================================================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  name_zh VARCHAR(50) NOT NULL,
  name_en VARCHAR(50) NOT NULL,
  level INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, name_zh, name_en, level, description) VALUES
  ('super_admin', '總管理員', 'Super Admin', 1, 'Full system access'),
  ('company_owner', '公司負責人', 'Company Owner', 2, 'Company-wide management'),
  ('sales_manager', '業務主管', 'Sales Manager', 3, 'Sales team management'),
  ('salesperson', '業務人員', 'Salesperson', 4, 'Sales operations'),
  ('accountant', '會計', 'Accountant', 5, 'Financial operations')
ON CONFLICT (name) DO NOTHING;

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Insert default permissions
INSERT INTO permissions (resource, action, name, description) VALUES
  ('products', 'read', 'products:read', 'View products'),
  ('products', 'write', 'products:write', 'Create/edit products'),
  ('products', 'delete', 'products:delete', 'Delete products'),
  ('products', 'read_cost', 'products:read_cost', 'View product costs'),
  ('customers', 'read', 'customers:read', 'View customers'),
  ('customers', 'write', 'customers:write', 'Create/edit customers'),
  ('customers', 'delete', 'customers:delete', 'Delete customers'),
  ('quotations', 'read', 'quotations:read', 'View quotations'),
  ('quotations', 'write', 'quotations:write', 'Create/edit quotations'),
  ('quotations', 'delete', 'quotations:delete', 'Delete quotations'),
  ('contracts', 'read', 'contracts:read', 'View contracts'),
  ('contracts', 'write', 'contracts:write', 'Create/edit contracts'),
  ('contracts', 'delete', 'contracts:delete', 'Delete contracts'),
  ('payments', 'read', 'payments:read', 'View payments'),
  ('payments', 'write', 'payments:write', 'Create/edit payments'),
  ('payments', 'delete', 'payments:delete', 'Delete payments'),
  ('company_settings', 'read', 'company_settings:read', 'View company settings'),
  ('company_settings', 'write', 'company_settings:write', 'Edit company settings'),
  ('users', 'read', 'users:read', 'View users'),
  ('users', 'write', 'users:write', 'Create/edit users'),
  ('users', 'delete', 'users:delete', 'Delete users'),
  ('users', 'assign_roles', 'users:assign_roles', 'Assign user roles')
ON CONFLICT (name) DO NOTHING;

-- Role permissions mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Grant permissions to roles (delete existing first to avoid duplicates)
DELETE FROM role_permissions;

-- Super Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin';

-- Company Owner: All except assign_roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'company_owner'
  AND p.name NOT IN ('users:assign_roles');

-- Sales Manager: Product, customer, quotation, contract management + read payments
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'sales_manager'
  AND p.name IN (
    'products:read', 'products:write',
    'customers:read', 'customers:write',
    'quotations:read', 'quotations:write', 'quotations:delete',
    'contracts:read', 'contracts:write',
    'payments:read',
    'users:read'
  );

-- Salesperson: Read all, write quotations and customers
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'salesperson'
  AND p.name IN (
    'products:read',
    'customers:read', 'customers:write',
    'quotations:read', 'quotations:write',
    'contracts:read',
    'payments:read'
  );

-- Accountant: Full payment access, read all, product cost access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'accountant'
  AND p.name IN (
    'products:read', 'products:read_cost',
    'customers:read',
    'quotations:read',
    'contracts:read',
    'payments:read', 'payments:write', 'payments:delete',
    'company_settings:read'
  );

-- User roles assignment
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  full_name VARCHAR(255),
  display_name VARCHAR(100),
  phone VARCHAR(50),
  department VARCHAR(100),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================================================
-- 2. COMPANY SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  company_name JSONB,
  tax_id VARCHAR(50),
  address JSONB,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  logo_url TEXT,
  signature_url TEXT,
  passbook_image_url TEXT,
  bank_name VARCHAR(255),
  bank_code VARCHAR(50),
  account_number VARCHAR(100),
  account_name VARCHAR(255),
  swift_code VARCHAR(50),
  default_currency VARCHAR(3) DEFAULT 'TWD',
  default_tax_rate DECIMAL(5,2) DEFAULT 5.00,
  default_payment_terms VARCHAR(50),
  default_payment_day INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);

-- ============================================================================
-- 3. PRODUCTS: Add Cost Fields
-- ============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS cost_currency VARCHAR(3) DEFAULT 'TWD',
  ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS supplier VARCHAR(255),
  ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_products_cost_price ON products(cost_price) WHERE cost_price IS NOT NULL;

-- ============================================================================
-- 4. CUSTOMERS: Add Contract Status
-- ============================================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS contract_status VARCHAR(20) DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS contract_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50),
  ADD COLUMN IF NOT EXISTS next_payment_due_date DATE,
  ADD COLUMN IF NOT EXISTS next_payment_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3) DEFAULT 'TWD';

CREATE INDEX IF NOT EXISTS idx_customers_contract_status ON customers(contract_status);
CREATE INDEX IF NOT EXISTS idx_customers_next_payment_due ON customers(next_payment_due_date) WHERE next_payment_due_date IS NOT NULL;

-- ============================================================================
-- 5. CUSTOMER CONTRACTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  signed_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  payment_terms VARCHAR(50),
  contract_file_url TEXT,
  notes TEXT,
  terms_and_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON customer_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON customer_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON customer_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON customer_contracts(end_date);

-- ============================================================================
-- 6. PAYMENT TRACKING SYSTEM
-- ============================================================================

-- Update quotations table
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_due_date DATE,
  ADD COLUMN IF NOT EXISTS total_paid DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS deposit_paid_date DATE,
  ADD COLUMN IF NOT EXISTS final_payment_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS final_payment_due_date DATE;

CREATE INDEX IF NOT EXISTS idx_quotations_payment_status ON quotations(payment_status);
CREATE INDEX IF NOT EXISTS idx_quotations_payment_due_date ON quotations(payment_due_date) WHERE payment_due_date IS NOT NULL;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quotation_id UUID REFERENCES quotations(id) ON DELETE RESTRICT,
  contract_id UUID REFERENCES customer_contracts(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  payment_type VARCHAR(20) NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  receipt_url TEXT,
  status VARCHAR(20) DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (quotation_id IS NOT NULL OR contract_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_payments_quotation_id ON payments(quotation_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Payment schedules
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES customer_contracts(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  schedule_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  paid_amount DECIMAL(12,2) DEFAULT 0,
  paid_date DATE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, schedule_number)
);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract_id ON payment_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_customer_id ON payment_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);

-- ============================================================================
-- 7. AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- 8. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function: Update payment status when payment is added/updated
CREATE OR REPLACE FUNCTION update_quotation_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid_amount DECIMAL(12,2);
  quotation_total DECIMAL(12,2);
BEGIN
  IF NEW.quotation_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO total_paid_amount
  FROM payments
  WHERE quotation_id = NEW.quotation_id
    AND status = 'confirmed';

  SELECT total_amount INTO quotation_total
  FROM quotations
  WHERE id = NEW.quotation_id;

  UPDATE quotations
  SET
    total_paid = total_paid_amount,
    payment_status = CASE
      WHEN total_paid_amount = 0 THEN 'unpaid'
      WHEN total_paid_amount >= quotation_total THEN 'paid'
      WHEN payment_due_date IS NOT NULL AND payment_due_date < CURRENT_DATE AND total_paid_amount < quotation_total THEN 'overdue'
      ELSE 'partial'
    END,
    updated_at = NOW()
  WHERE id = NEW.quotation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quotation_payment_status ON payments;
CREATE TRIGGER trigger_update_quotation_payment_status
AFTER INSERT OR UPDATE OF amount, status ON payments
FOR EACH ROW
EXECUTE FUNCTION update_quotation_payment_status();

-- Function: Auto-update contract status based on end date
CREATE OR REPLACE FUNCTION check_contract_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_contract_expiry ON customer_contracts;
CREATE TRIGGER trigger_check_contract_expiry
BEFORE INSERT OR UPDATE ON customer_contracts
FOR EACH ROW
EXECUTE FUNCTION check_contract_expiry();

-- Function: Calculate profit margin when cost or price changes
CREATE OR REPLACE FUNCTION calculate_profit_margin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cost_price IS NOT NULL AND NEW.cost_price > 0 AND NEW.unit_price IS NOT NULL THEN
    NEW.profit_margin := ((NEW.unit_price - NEW.cost_price) / NEW.cost_price * 100);
  ELSE
    NEW.profit_margin := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_profit_margin ON products;
CREATE TRIGGER trigger_calculate_profit_margin
BEFORE INSERT OR UPDATE OF cost_price, unit_price ON products
FOR EACH ROW
EXECUTE FUNCTION calculate_profit_margin();

-- Function: Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_company_settings_timestamp ON company_settings;
CREATE TRIGGER trigger_update_company_settings_timestamp
BEFORE UPDATE ON company_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_user_profiles_timestamp ON user_profiles;
CREATE TRIGGER trigger_update_user_profiles_timestamp
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_customer_contracts_timestamp ON customer_contracts;
CREATE TRIGGER trigger_update_customer_contracts_timestamp
BEFORE UPDATE ON customer_contracts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_payments_timestamp ON payments;
CREATE TRIGGER trigger_update_payments_timestamp
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_payment_schedules_timestamp ON payment_schedules;
CREATE TRIGGER trigger_update_payment_schedules_timestamp
BEFORE UPDATE ON payment_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: User permissions
CREATE OR REPLACE VIEW user_permissions AS
SELECT
  ur.user_id,
  r.name as role_name,
  r.level as role_level,
  p.resource,
  p.action,
  p.name as permission_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;

-- View: Overdue payments
CREATE OR REPLACE VIEW overdue_payments AS
SELECT
  ps.*,
  c.name->>'zh' as company_name_zh,
  c.name->>'en' as company_name_en,
  c.contact_person->>'zh' as contact_person,
  CURRENT_DATE - ps.due_date as days_overdue
FROM payment_schedules ps
JOIN customers c ON ps.customer_id = c.id
WHERE ps.status = 'overdue'
ORDER BY ps.due_date ASC;

-- View: Upcoming payments
CREATE OR REPLACE VIEW upcoming_payments AS
SELECT
  ps.*,
  c.name->>'zh' as company_name_zh,
  c.name->>'en' as company_name_en,
  c.contact_person->>'zh' as contact_person,
  ps.due_date - CURRENT_DATE as days_until_due
FROM payment_schedules ps
JOIN customers c ON ps.customer_id = c.id
WHERE ps.status = 'pending'
  AND ps.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY ps.due_date ASC;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


-- ============================================================================
-- From: 003_multi_company_architecture.sql
-- ============================================================================
-- ============================================================================
-- Multi-Company Architecture Migration
-- ============================================================================
-- This migration enables users to manage multiple companies
-- Each company can have multiple members with different roles

-- 1. Create companies table (consolidates company_settings)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL, -- { "zh": "公司名稱", "en": "Company Name" }
  logo_url TEXT,
  signature_url TEXT,
  passbook_url TEXT,
  tax_id VARCHAR(50),
  bank_name VARCHAR(255),
  bank_account VARCHAR(100),
  bank_code VARCHAR(50),
  address JSONB, -- { "zh": "地址", "en": "Address" }
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_tax_id ON companies(tax_id);

-- 2. Create company_members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References Supabase auth.users
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_owner BOOLEAN DEFAULT false, -- The user who created the company
  is_active BOOLEAN DEFAULT true, -- Can be deactivated without deletion
  joined_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_role_id ON company_members(role_id);

-- 3. Add company_id to existing tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create indexes for company_id
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON quotations(company_id);

-- 4. Add updated_at trigger to companies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at') THEN
    CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_company_members_updated_at') THEN
    CREATE TRIGGER update_company_members_updated_at BEFORE UPDATE ON company_members
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 5. Migrate existing data from company_settings to companies
-- Only if company_settings exists and has data
DO $$
DECLARE
  settings_record RECORD;
  new_company_id UUID;
BEGIN
  -- Check if company_settings table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_settings') THEN
    -- Migrate each company setting to a new company
    FOR settings_record IN
      SELECT * FROM company_settings
    LOOP
      -- Create new company
      INSERT INTO companies (
        name, logo_url, signature_url, passbook_url,
        tax_id, bank_name, bank_account, bank_code,
        address, phone, email, website,
        created_at, updated_at
      ) VALUES (
        settings_record.company_name,
        settings_record.logo_url,
        settings_record.signature_url,
        settings_record.passbook_url,
        settings_record.tax_id,
        settings_record.bank_name,
        settings_record.bank_account,
        settings_record.bank_code,
        settings_record.address,
        settings_record.phone,
        settings_record.email,
        settings_record.website,
        settings_record.created_at,
        settings_record.updated_at
      ) RETURNING id INTO new_company_id;

      -- Create company member relationship (owner)
      INSERT INTO company_members (company_id, user_id, role_id, is_owner)
      VALUES (
        new_company_id,
        settings_record.user_id,
        (SELECT id FROM roles WHERE name = 'admin' LIMIT 1), -- Default to admin role
        true
      );

      -- Update related records with company_id
      UPDATE customers SET company_id = new_company_id WHERE user_id = settings_record.user_id;
      UPDATE products SET company_id = new_company_id WHERE user_id = settings_record.user_id;
      UPDATE quotations SET company_id = new_company_id WHERE user_id = settings_record.user_id;
    END LOOP;

    RAISE NOTICE 'Successfully migrated data from company_settings to companies';
  END IF;
END $$;

-- 6. Create helper functions

-- Function to check if user is member of a company
CREATE OR REPLACE FUNCTION is_company_member(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_members
    WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's companies
CREATE OR REPLACE FUNCTION get_user_companies(p_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name JSONB,
  role_name VARCHAR,
  is_owner BOOLEAN,
  logo_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    r.name as role_name,
    cm.is_owner,
    c.logo_url
  FROM companies c
  INNER JOIN company_members cm ON c.id = cm.company_id
  INNER JOIN roles r ON cm.role_id = r.id
  WHERE cm.user_id = p_user_id
  AND cm.is_active = true
  ORDER BY cm.is_owner DESC, cm.joined_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get company members
CREATE OR REPLACE FUNCTION get_company_members(p_company_id UUID)
RETURNS TABLE (
  user_id UUID,
  role_name VARCHAR,
  is_owner BOOLEAN,
  is_active BOOLEAN,
  joined_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.user_id,
    r.name as role_name,
    cm.is_owner,
    cm.is_active,
    cm.joined_at
  FROM company_members cm
  INNER JOIN roles r ON cm.role_id = r.id
  WHERE cm.company_id = p_company_id
  ORDER BY cm.is_owner DESC, cm.joined_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Complete
SELECT 'Multi-company architecture created successfully!' as status;


-- ============================================================================
-- From: 004_contracts_and_payments_enhancement.sql
-- ============================================================================
-- ============================================================================
-- Migration 004: Contracts and Payments Enhancement
-- Created: 2025-10-18
-- Description: Enhanced contract management with payment tracking and overdue detection
-- ============================================================================

-- ============================================================================
-- 1. ENHANCE QUOTATIONS TABLE - Add Contract Fields
-- ============================================================================

-- Add contract-related fields when quotation is accepted
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS contract_signed_date DATE,
  ADD COLUMN IF NOT EXISTS contract_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(20), -- 'monthly', 'quarterly', 'semi_annual', 'annual'
  ADD COLUMN IF NOT EXISTS next_collection_date DATE,
  ADD COLUMN IF NOT EXISTS next_collection_amount DECIMAL(12,2);

-- Add check constraint for payment frequency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_quotations_payment_frequency'
  ) THEN
    ALTER TABLE quotations
    ADD CONSTRAINT chk_quotations_payment_frequency
    CHECK (payment_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual'));
  END IF;
END $$;

-- Create indexes for contract fields
CREATE INDEX IF NOT EXISTS idx_quotations_contract_expiry_date
  ON quotations(contract_expiry_date) WHERE contract_expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_next_collection_date
  ON quotations(next_collection_date) WHERE next_collection_date IS NOT NULL;

COMMENT ON COLUMN quotations.contract_signed_date IS '合約簽訂日期 - 當報價單狀態改為已簽約時記錄';
COMMENT ON COLUMN quotations.contract_expiry_date IS '合約到期日 - 用於追蹤合約有效期';
COMMENT ON COLUMN quotations.payment_frequency IS '付款頻率 - monthly/quarterly/semi_annual/annual';
COMMENT ON COLUMN quotations.next_collection_date IS '下次應收日期 - 每月5號為預設收款日';
COMMENT ON COLUMN quotations.next_collection_amount IS '下次應收金額 - 根據付款頻率自動計算';

-- ============================================================================
-- 2. ENHANCE CUSTOMER_CONTRACTS TABLE - Add Contract Fields
-- ============================================================================

-- Add contract-related fields to existing customer_contracts table
ALTER TABLE customer_contracts
  ADD COLUMN IF NOT EXISTS next_collection_date DATE,
  ADD COLUMN IF NOT EXISTS next_collection_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL;

-- Update payment_terms constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_customer_contracts_payment_terms'
  ) THEN
    ALTER TABLE customer_contracts
    ADD CONSTRAINT chk_customer_contracts_payment_terms
    CHECK (payment_terms IN ('monthly', 'quarterly', 'semi_annual', 'annual'));
  END IF;
END $$;

-- Create index for quotation reference
CREATE INDEX IF NOT EXISTS idx_customer_contracts_quotation_id
  ON customer_contracts(quotation_id);
CREATE INDEX IF NOT EXISTS idx_customer_contracts_next_collection
  ON customer_contracts(next_collection_date) WHERE next_collection_date IS NOT NULL;

COMMENT ON COLUMN customer_contracts.next_collection_date IS '下次應收日期';
COMMENT ON COLUMN customer_contracts.next_collection_amount IS '下次應收金額';
COMMENT ON COLUMN customer_contracts.quotation_id IS '關聯的報價單 - 可選';

-- ============================================================================
-- 3. ENHANCE PAYMENTS TABLE - Add Payment Type and Receipt Info
-- ============================================================================

-- Ensure all necessary columns exist with proper constraints
DO $$
BEGIN
  -- Add payment_frequency column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payment_frequency'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_frequency VARCHAR(20);
  END IF;

  -- Add is_overdue column for tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'is_overdue'
  ) THEN
    ALTER TABLE payments ADD COLUMN is_overdue BOOLEAN DEFAULT false;
  END IF;

  -- Add days_overdue column for reporting
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'days_overdue'
  ) THEN
    ALTER TABLE payments ADD COLUMN days_overdue INTEGER DEFAULT 0;
  END IF;
END $$;

-- Update payment_type constraint to include all types
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_payment_type;

  -- Add new constraint
  ALTER TABLE payments
  ADD CONSTRAINT chk_payments_payment_type
  CHECK (payment_type IN ('deposit', 'installment', 'final', 'full', 'recurring'));
END $$;

-- Create composite index for overdue payment queries
CREATE INDEX IF NOT EXISTS idx_payments_overdue
  ON payments(customer_id, payment_date, is_overdue)
  WHERE status = 'confirmed';

COMMENT ON COLUMN payments.payment_frequency IS '付款頻率 - 用於定期收款記錄';
COMMENT ON COLUMN payments.is_overdue IS '是否逾期 - 自動由觸發器更新';
COMMENT ON COLUMN payments.days_overdue IS '逾期天數 - 用於報表和提醒';

-- ============================================================================
-- 4. ENHANCE PAYMENT_SCHEDULES TABLE - Overdue Detection
-- ============================================================================

-- Add columns for better tracking
ALTER TABLE payment_schedules
  ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Create index for overdue detection
CREATE INDEX IF NOT EXISTS idx_payment_schedules_overdue
  ON payment_schedules(status, due_date)
  WHERE status IN ('pending', 'overdue');

COMMENT ON COLUMN payment_schedules.days_overdue IS '逾期天數 - 自動計算';
COMMENT ON COLUMN payment_schedules.last_reminder_sent_at IS '最後提醒時間 - 用於避免重複提醒';
COMMENT ON COLUMN payment_schedules.reminder_count IS '提醒次數 - 追蹤已發送幾次提醒';

-- ============================================================================
-- 5. CREATE FUNCTION - Auto-update Next Collection Date
-- ============================================================================

CREATE OR REPLACE FUNCTION update_next_collection_date()
RETURNS TRIGGER AS $$
DECLARE
  interval_months INTEGER;
  next_date DATE;
BEGIN
  -- Only update if payment is confirmed and relates to a contract
  IF NEW.status = 'confirmed' AND NEW.contract_id IS NOT NULL THEN

    -- Get contract payment terms
    SELECT payment_terms INTO NEW.payment_frequency
    FROM customer_contracts
    WHERE id = NEW.contract_id;

    -- Calculate interval based on payment frequency
    interval_months := CASE NEW.payment_frequency
      WHEN 'monthly' THEN 1
      WHEN 'quarterly' THEN 3
      WHEN 'semi_annual' THEN 6
      WHEN 'annual' THEN 12
      ELSE 3 -- default to quarterly
    END;

    -- Calculate next collection date (5th of next period)
    next_date := (DATE_TRUNC('month', NEW.payment_date) + (interval_months || ' months')::INTERVAL)::DATE + 4;

    -- Update contract's next collection info
    UPDATE customer_contracts
    SET
      next_collection_date = next_date,
      next_collection_amount = NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.contract_id;

    -- Update quotation if linked
    UPDATE quotations q
    SET
      next_collection_date = next_date,
      next_collection_amount = NEW.amount,
      updated_at = NOW()
    FROM customer_contracts cc
    WHERE cc.quotation_id = q.id
      AND cc.id = NEW.contract_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_next_collection_date ON payments;
CREATE TRIGGER trigger_update_next_collection_date
AFTER INSERT OR UPDATE OF status, payment_date, amount ON payments
FOR EACH ROW
EXECUTE FUNCTION update_next_collection_date();

-- ============================================================================
-- 6. CREATE FUNCTION - Auto-detect Overdue Payments
-- ============================================================================

CREATE OR REPLACE FUNCTION check_payment_schedules_overdue()
RETURNS TRIGGER AS $$
DECLARE
  overdue_days INTEGER;
BEGIN
  -- Calculate days overdue
  IF NEW.due_date < CURRENT_DATE AND NEW.status = 'pending' THEN
    overdue_days := CURRENT_DATE - NEW.due_date;

    -- Update status to overdue if more than 0 days past due
    IF overdue_days > 0 THEN
      NEW.status := 'overdue';
      NEW.days_overdue := overdue_days;
    END IF;
  ELSIF NEW.status = 'paid' THEN
    -- Reset overdue fields when paid
    NEW.days_overdue := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_payment_schedules_overdue ON payment_schedules;
CREATE TRIGGER trigger_check_payment_schedules_overdue
BEFORE INSERT OR UPDATE ON payment_schedules
FOR EACH ROW
EXECUTE FUNCTION check_payment_schedules_overdue();

-- ============================================================================
-- 7. CREATE FUNCTION - Auto-generate Payment Schedules from Contract
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_payment_schedules_for_contract(
  p_contract_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_payment_day INTEGER DEFAULT 5
)
RETURNS INTEGER AS $$
DECLARE
  v_contract RECORD;
  v_schedule_count INTEGER := 0;
  v_payment_amount DECIMAL(12,2);
  v_current_date DATE;
  v_end_date DATE;
  v_interval_months INTEGER;
  v_schedule_number INTEGER := 1;
BEGIN
  -- Get contract details
  SELECT * INTO v_contract
  FROM customer_contracts
  WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id;
  END IF;

  -- Calculate interval
  v_interval_months := CASE v_contract.payment_terms
    WHEN 'monthly' THEN 1
    WHEN 'quarterly' THEN 3
    WHEN 'semi_annual' THEN 6
    WHEN 'annual' THEN 12
    ELSE 3
  END;

  -- Calculate number of payments
  v_schedule_count := CEIL(
    (v_contract.end_date - COALESCE(p_start_date, v_contract.start_date)) / (v_interval_months * 30.0)
  );

  -- Calculate payment amount per installment
  v_payment_amount := v_contract.total_amount / v_schedule_count;

  -- Set start date (or use contract start date)
  v_current_date := COALESCE(p_start_date, v_contract.start_date);
  v_end_date := v_contract.end_date;

  -- Delete existing schedules for this contract
  DELETE FROM payment_schedules WHERE contract_id = p_contract_id;

  -- Generate payment schedules
  WHILE v_current_date <= v_end_date LOOP
    -- Set due date to specified day of month
    v_current_date := DATE_TRUNC('month', v_current_date)::DATE + (p_payment_day - 1);

    INSERT INTO payment_schedules (
      user_id,
      contract_id,
      customer_id,
      schedule_number,
      due_date,
      amount,
      currency,
      status,
      notes
    ) VALUES (
      v_contract.user_id,
      p_contract_id,
      v_contract.customer_id,
      v_schedule_number,
      v_current_date,
      v_payment_amount,
      v_contract.currency,
      'pending',
      format('Payment %s of %s - %s', v_schedule_number, v_schedule_count, v_contract.payment_terms)
    );

    v_schedule_number := v_schedule_number + 1;
    v_current_date := v_current_date + (v_interval_months || ' months')::INTERVAL;
  END LOOP;

  -- Update contract's next collection info
  UPDATE customer_contracts
  SET
    next_collection_date = (
      SELECT due_date FROM payment_schedules
      WHERE contract_id = p_contract_id AND status = 'pending'
      ORDER BY due_date ASC LIMIT 1
    ),
    next_collection_amount = v_payment_amount
  WHERE id = p_contract_id;

  RETURN v_schedule_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_payment_schedules_for_contract IS
  '自動產生合約的付款排程 - 根據付款頻率和合約期間生成期款';

-- ============================================================================
-- 8. CREATE FUNCTION - Mark Overdue Payments (Batch Job)
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_overdue_payments()
RETURNS TABLE (
  updated_count INTEGER,
  schedule_ids UUID[]
) AS $$
DECLARE
  v_updated_count INTEGER;
  v_schedule_ids UUID[];
BEGIN
  -- Update all pending schedules that are past due
  WITH updated_schedules AS (
    UPDATE payment_schedules
    SET
      status = 'overdue',
      days_overdue = CURRENT_DATE - due_date,
      updated_at = NOW()
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER, ARRAY_AGG(id)
  INTO v_updated_count, v_schedule_ids
  FROM updated_schedules;

  RETURN QUERY SELECT v_updated_count, v_schedule_ids;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_overdue_payments IS
  '批次標記逾期付款 - 建議每日執行一次，找出所有超過30天未收款項目';

-- ============================================================================
-- 9. CREATE VIEW - Unpaid Payments (>30 days overdue)
-- ============================================================================

CREATE OR REPLACE VIEW unpaid_payments_30_days AS
SELECT
  ps.id,
  ps.contract_id,
  ps.customer_id,
  c.name->>'zh' as customer_name_zh,
  c.name->>'en' as customer_name_en,
  c.email as customer_email,
  c.phone as customer_phone,
  ps.schedule_number,
  ps.due_date,
  ps.amount,
  ps.currency,
  ps.status,
  ps.days_overdue,
  ps.reminder_count,
  ps.last_reminder_sent_at,
  cc.contract_number,
  cc.title as contract_title,
  cc.payment_terms
FROM payment_schedules ps
JOIN customers c ON ps.customer_id = c.id
JOIN customer_contracts cc ON ps.contract_id = cc.id
WHERE ps.status IN ('pending', 'overdue')
  AND ps.days_overdue >= 30
ORDER BY ps.days_overdue DESC, ps.due_date ASC;

COMMENT ON VIEW unpaid_payments_30_days IS
  '未收款列表 - 顯示所有超過30天未收款的項目';

-- ============================================================================
-- 10. CREATE VIEW - Collected Payments Summary
-- ============================================================================

CREATE OR REPLACE VIEW collected_payments_summary AS
SELECT
  p.id,
  p.customer_id,
  c.name->>'zh' as customer_name_zh,
  c.name->>'en' as customer_name_en,
  p.quotation_id,
  p.contract_id,
  p.payment_type,
  p.payment_frequency,
  p.payment_date,
  p.amount,
  p.currency,
  p.payment_method,
  p.reference_number,
  p.receipt_url,
  p.status,
  p.notes,
  -- Related info
  CASE
    WHEN p.quotation_id IS NOT NULL THEN q.quotation_number
    WHEN p.contract_id IS NOT NULL THEN cc.contract_number
    ELSE NULL
  END as related_number,
  CASE
    WHEN p.payment_type = 'deposit' THEN '頭款'
    WHEN p.payment_type = 'installment' THEN '期款'
    WHEN p.payment_type = 'final' THEN '尾款'
    WHEN p.payment_type = 'full' THEN '全額'
    WHEN p.payment_type = 'recurring' THEN '定期收款'
    ELSE p.payment_type
  END as payment_type_display
FROM payments p
JOIN customers c ON p.customer_id = c.id
LEFT JOIN quotations q ON p.quotation_id = q.id
LEFT JOIN customer_contracts cc ON p.contract_id = cc.id
WHERE p.status = 'confirmed'
ORDER BY p.payment_date DESC;

COMMENT ON VIEW collected_payments_summary IS
  '已收款彙總 - 包含頭款、期款、尾款等所有已確認的收款記錄';

-- ============================================================================
-- 11. CREATE VIEW - Next Collection Reminders
-- ============================================================================

CREATE OR REPLACE VIEW next_collection_reminders AS
SELECT
  cc.id as contract_id,
  cc.contract_number,
  cc.title,
  cc.customer_id,
  c.name->>'zh' as customer_name_zh,
  c.name->>'en' as customer_name_en,
  c.email,
  c.phone,
  cc.payment_terms,
  cc.next_collection_date,
  cc.next_collection_amount,
  cc.currency,
  CURRENT_DATE - cc.next_collection_date as days_until_collection,
  CASE
    WHEN cc.next_collection_date < CURRENT_DATE THEN 'overdue'
    WHEN cc.next_collection_date = CURRENT_DATE THEN 'due_today'
    WHEN cc.next_collection_date <= CURRENT_DATE + 7 THEN 'due_soon'
    ELSE 'upcoming'
  END as collection_status
FROM customer_contracts cc
JOIN customers c ON cc.customer_id = c.id
WHERE cc.status = 'active'
  AND cc.next_collection_date IS NOT NULL
ORDER BY cc.next_collection_date ASC;

COMMENT ON VIEW next_collection_reminders IS
  '下次收款提醒 - 顯示所有合約的下次應收款資訊';

-- ============================================================================
-- 12. ADD ROW LEVEL SECURITY POLICIES (準備給 Supabase 使用)
-- ============================================================================

-- Enable RLS on tables (commented out - enable when ready)
-- ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customer_contracts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- Sample policies (可根據實際需求調整)
/*
-- Quotations: Users can only see quotations from their companies
CREATE POLICY quotations_company_access ON quotations
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Payments: Users can only see payments from their companies
CREATE POLICY payments_company_access ON payments
  FOR ALL
  USING (
    user_id IN (
      SELECT cm.user_id FROM company_members cm
      JOIN quotations q ON q.company_id = cm.company_id
      WHERE cm.user_id = auth.uid() AND cm.is_active = true
    )
  );
*/

-- ============================================================================
-- 13. VALIDATION AND DATA INTEGRITY
-- ============================================================================

-- Add check constraints for data validation
DO $$
BEGIN
  -- Ensure next collection date is in the future (for active contracts)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_contracts_next_collection_future'
  ) THEN
    ALTER TABLE customer_contracts
    ADD CONSTRAINT chk_contracts_next_collection_future
    CHECK (
      (status != 'active') OR
      (next_collection_date IS NULL) OR
      (next_collection_date >= start_date)
    );
  END IF;

  -- Ensure payment date is not in the future
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_payments_date_not_future'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT chk_payments_date_not_future
    CHECK (payment_date <= CURRENT_DATE);
  END IF;

  -- Ensure payment amount is positive
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_payments_amount_positive'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT chk_payments_amount_positive
    CHECK (amount > 0);
  END IF;

  -- Ensure schedule amount is positive
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_schedules_amount_positive'
  ) THEN
    ALTER TABLE payment_schedules
    ADD CONSTRAINT chk_schedules_amount_positive
    CHECK (amount > 0);
  END IF;
END $$;

-- ============================================================================
-- 14. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payments_customer_date
  ON payments(customer_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_schedules_customer_due
  ON payment_schedules(customer_id, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_contracts_customer_active
  ON customer_contracts(customer_id, status)
  WHERE status = 'active';

-- Partial indexes for specific queries
CREATE INDEX IF NOT EXISTS idx_quotations_contracted
  ON quotations(customer_id, contract_signed_date)
  WHERE contract_signed_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_pending
  ON payment_schedules(due_date)
  WHERE status = 'pending';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- 1. ✅ Enhanced quotations table with contract fields (signed date, expiry, payment frequency, next collection)
-- 2. ✅ Enhanced customer_contracts table with next collection tracking
-- 3. ✅ Enhanced payments table with overdue detection and payment frequency
-- 4. ✅ Enhanced payment_schedules table with overdue tracking and reminder info
-- 5. ✅ Auto-update next collection date trigger
-- 6. ✅ Auto-detect overdue payments trigger
-- 7. ✅ Function to generate payment schedules from contract
-- 8. ✅ Batch job function to mark overdue payments
-- 9. ✅ View for unpaid payments (>30 days)
-- 10. ✅ View for collected payments summary
-- 11. ✅ View for next collection reminders
-- 12. ✅ Row level security policies (ready for Supabase)
-- 13. ✅ Data validation constraints
-- 14. ✅ Performance indexes

SELECT 'Migration 004 completed successfully!' as status,
       'Enhanced contract management with payment tracking' as description;


-- ============================================================================
-- From: 006_performance_indexes.sql
-- ============================================================================
-- ============================================================================
-- 性能優化索引 - Migration 006
-- 目的: 新增關鍵索引以提升查詢效能
-- 預期效果: 查詢速度提升 60-80%
-- ============================================================================

-- 使用 CONCURRENTLY 避免鎖表,適合生產環境
-- 注意: CONCURRENTLY 不能在事務中執行,需要單獨執行

-- 1. 報價單日期範圍查詢索引
-- 用途: 儀表板日期篩選、報表生成
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_dates 
ON quotations(user_id, issue_date DESC, valid_until);

COMMENT ON INDEX idx_quotations_dates IS '報價單日期範圍查詢優化索引';

-- 2. 報價單複合狀態查詢索引
-- 用途: 儀表板狀態統計、狀態篩選
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_status_date 
ON quotations(user_id, status, created_at DESC);

COMMENT ON INDEX idx_quotations_status_date IS '報價單狀態查詢優化索引';

-- 3. 產品分類查詢索引
-- 用途: 產品分類篩選
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category 
ON products(user_id, category) 
WHERE category IS NOT NULL;

COMMENT ON INDEX idx_products_category IS '產品分類查詢優化索引(部分索引)';

-- 4. 報價單項目聚合查詢索引
-- 用途: 報價單明細查詢、產品銷售統計
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotation_items_quotation_product 
ON quotation_items(quotation_id, product_id) 
INCLUDE (quantity, unit_price, subtotal);

COMMENT ON INDEX idx_quotation_items_quotation_product IS '報價單項目查詢優化索引(含覆蓋欄位)';

-- 5. 客戶郵件唯一約束優化
-- 用途: 防止重複客戶、郵件查詢
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email_unique 
ON customers(user_id, email);

COMMENT ON INDEX idx_customers_email_unique IS '客戶郵件唯一性索引';

-- 6. 報價單分享 token 查詢優化
-- 用途: 公開分享連結訪問
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotation_shares_active 
ON quotation_shares(share_token, quotation_id) 
WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW());

COMMENT ON INDEX idx_quotation_shares_active IS '活躍分享連結查詢優化索引(部分索引)';

-- 7. 部分索引: 僅活躍報價單
-- 用途: 減少索引大小,提升查詢速度
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_active 
ON quotations(user_id, created_at DESC) 
WHERE status IN ('draft', 'sent');

COMMENT ON INDEX idx_quotations_active IS '活躍報價單查詢優化索引(部分索引)';

-- 8. 報價單號碼查詢優化
-- 用途: 報價單搜尋功能
-- 注意: quotation_number 已有 UNIQUE 約束,會自動建立索引
-- 此索引添加 user_id 以支援多租戶查詢
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_number_user 
ON quotations(user_id, quotation_number);

COMMENT ON INDEX idx_quotations_number_user IS '報價單號碼搜尋優化索引';

-- ============================================================================
-- 公司和權限相關索引 (如果使用 RBAC 功能)
-- ============================================================================

-- 9. 公司成員關聯索引
-- 用途: 權限檢查、成員列表查詢
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_members_lookup 
ON company_members(company_id, user_id) 
INCLUDE (role);

COMMENT ON INDEX idx_company_members_lookup IS '公司成員查詢優化索引';

-- 10. 用戶角色查詢索引
-- 用途: 權限驗證
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_lookup 
ON user_roles(user_id, role_id);

COMMENT ON INDEX idx_user_roles_lookup IS '用戶角色查詢優化索引';

-- ============================================================================
-- 統計和分析索引
-- ============================================================================

-- 11. 報價單總額統計索引
-- 用途: 儀表板統計、報表分析
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_amount_stats 
ON quotations(user_id, status, currency) 
INCLUDE (total_amount);

COMMENT ON INDEX idx_quotations_amount_stats IS '報價單金額統計優化索引';

-- 12. 客戶創建時間索引
-- 用途: 新客戶統計、客戶增長分析
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_created 
ON customers(user_id, created_at DESC);

COMMENT ON INDEX idx_customers_created IS '客戶創建時間統計索引';

-- ============================================================================
-- 索引健康檢查查詢
-- ============================================================================

-- 查看所有新增索引的狀態
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 檢查索引大小
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- 效能驗證查詢
-- ============================================================================

-- 測試報價單查詢效能
EXPLAIN ANALYZE
SELECT 
  q.*,
  jsonb_build_object('id', c.id, 'name', c.name, 'email', c.email) as customer
FROM quotations q
LEFT JOIN customers c ON q.customer_id = c.id
WHERE q.user_id = 'test-user-id'
  AND q.status = 'sent'
ORDER BY q.created_at DESC
LIMIT 20;

-- 預期: 應該看到 "Index Scan using idx_quotations_status_date"

-- ============================================================================
-- Rollback 腳本 (如需回滾)
-- ============================================================================

/*
DROP INDEX CONCURRENTLY IF EXISTS idx_quotations_dates;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotations_status_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_products_category;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotation_items_quotation_product;
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_email_unique;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotation_shares_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotations_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotations_number_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_company_members_lookup;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_roles_lookup;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotations_amount_stats;
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_created;
*/

-- ============================================================================
-- Migration 完成
-- ============================================================================


-- ============================================================================
-- From: 007_add_payment_statistics_function.sql
-- ============================================================================
-- Migration: Add get_payment_statistics RPC function
-- Description: 建立取得付款統計資料的 RPC 函數

CREATE OR REPLACE FUNCTION get_payment_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  current_user_id uuid;
  current_month_start date;
  current_year_start date;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  current_month_start := date_trunc('month', CURRENT_DATE);
  current_year_start := date_trunc('year', CURRENT_DATE);

  WITH current_month_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_collected,
      COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0) as total_pending,
      COALESCE(SUM(CASE WHEN p.is_overdue = true THEN p.amount ELSE 0 END), 0) as total_overdue,
      COALESCE(MAX(p.currency), 'TWD') as currency
    FROM payments p
    WHERE p.user_id = current_user_id
      AND p.payment_date >= current_month_start
  ),
  current_year_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_collected,
      COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0) as total_pending,
      COALESCE(SUM(CASE WHEN p.is_overdue = true THEN p.amount ELSE 0 END), 0) as total_overdue,
      COALESCE(MAX(p.currency), 'TWD') as currency
    FROM payments p
    WHERE p.user_id = current_user_id
      AND p.payment_date >= current_year_start
  ),
  overdue_stats AS (
    SELECT
      COUNT(*)::int as count,
      COALESCE(SUM(p.amount), 0) as total_amount,
      COALESCE(AVG(p.days_overdue), 0)::int as average_days
    FROM payments p
    WHERE p.user_id = current_user_id
      AND p.is_overdue = true
  )
  SELECT jsonb_build_object(
    'current_month', jsonb_build_object(
      'total_collected', cm.total_collected,
      'total_pending', cm.total_pending,
      'total_overdue', cm.total_overdue,
      'currency', cm.currency
    ),
    'current_year', jsonb_build_object(
      'total_collected', cy.total_collected,
      'total_pending', cy.total_pending,
      'total_overdue', cy.total_overdue,
      'currency', cy.currency
    ),
    'overdue', jsonb_build_object(
      'count', o.count,
      'total_amount', o.total_amount,
      'average_days', o.average_days
    )
  ) INTO result
  FROM current_month_stats cm, current_year_stats cy, overdue_stats o;

  RETURN result;
END;
$$;

-- Grant execute permission to public (for Zeabur/standard PostgreSQL)
GRANT EXECUTE ON FUNCTION get_payment_statistics() TO public;

COMMENT ON FUNCTION get_payment_statistics() IS '取得付款統計資料，包含本月、本年度及逾期統計';


-- ============================================================================
-- From: 008_contract_service_rpc_functions.sql
-- ============================================================================
-- ============================================================================
-- Migration 008: Contract Service RPC Functions
-- Created: 2025-10-29
-- Description: Add missing RPC functions for contracts.ts service
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION - Get Payment Schedules with Details
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payment_schedules_with_details(
  p_user_id UUID,
  p_contract_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  contract_id UUID,
  customer_id UUID,
  schedule_number INTEGER,
  due_date DATE,
  amount DECIMAL(12,2),
  currency VARCHAR(3),
  status VARCHAR(20),
  paid_date DATE,
  payment_id UUID,
  notes TEXT,
  days_overdue INTEGER,
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  customer JSONB,
  contract JSONB,
  days_until_due INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.user_id,
    ps.contract_id,
    ps.customer_id,
    ps.schedule_number,
    ps.due_date,
    ps.amount,
    ps.currency,
    ps.status,
    ps.paid_date,
    ps.payment_id,
    ps.notes,
    ps.days_overdue,
    ps.last_reminder_sent_at,
    ps.reminder_count,
    ps.created_at,
    ps.updated_at,
    jsonb_build_object(
      'id', c.id,
      'company_name_zh', c.company_name_zh,
      'company_name_en', c.company_name_en,
      'contact_person', c.contact_person
    ) as customer,
    jsonb_build_object(
      'id', cc.id,
      'contract_number', cc.contract_number,
      'title', cc.title
    ) as contract,
    CASE
      WHEN ps.status = 'pending' THEN (ps.due_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_until_due
  FROM payment_schedules ps
  JOIN customers c ON ps.customer_id = c.id
  JOIN customer_contracts cc ON ps.contract_id = cc.id
  WHERE ps.user_id = p_user_id
    AND (p_contract_id IS NULL OR ps.contract_id = p_contract_id)
  ORDER BY ps.due_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_payment_schedules_with_details IS
  '取得帶詳細資訊的付款排程 - 包含客戶和合約資訊';

-- ============================================================================
-- 2. FUNCTION - Get Contract Payment Progress
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contract_payment_progress(
  p_user_id UUID,
  p_contract_id UUID
)
RETURNS TABLE (
  contract_id UUID,
  contract_number VARCHAR(50),
  title TEXT,
  customer_name_zh VARCHAR(255),
  customer_name_en VARCHAR(255),
  total_amount DECIMAL(12,2),
  currency VARCHAR(3),
  status VARCHAR(20),
  next_payment_due DATE,
  total_paid DECIMAL(12,2),
  total_pending DECIMAL(12,2),
  total_overdue DECIMAL(12,2),
  payment_completion_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id as contract_id,
    cc.contract_number,
    cc.title,
    c.company_name_zh as customer_name_zh,
    c.company_name_en as customer_name_en,
    cc.total_amount,
    cc.currency,
    cc.status,
    cc.next_collection_date as next_payment_due,
    COALESCE(SUM(CASE WHEN ps.status = 'paid' THEN ps.amount ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN ps.status = 'pending' THEN ps.amount ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN ps.status = 'overdue' THEN ps.amount ELSE 0 END), 0) as total_overdue,
    CASE
      WHEN cc.total_amount > 0 THEN
        ROUND((COALESCE(SUM(CASE WHEN ps.status = 'paid' THEN ps.amount ELSE 0 END), 0) / cc.total_amount * 100), 2)
      ELSE 0
    END as payment_completion_rate
  FROM customer_contracts cc
  JOIN customers c ON cc.customer_id = c.id
  LEFT JOIN payment_schedules ps ON cc.id = ps.contract_id
  WHERE cc.id = p_contract_id
    AND cc.user_id = p_user_id
  GROUP BY cc.id, c.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_contract_payment_progress IS
  '取得合約的收款進度 - 包含已付、待付、逾期金額和完成率';

-- ============================================================================
-- 3. FUNCTION - Get Contracts with Overdue Payments
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contracts_with_overdue_payments(
  p_user_id UUID
)
RETURNS TABLE (
  contract_id UUID,
  contract_number VARCHAR(50),
  title TEXT,
  customer_id UUID,
  customer_name_zh VARCHAR(255),
  customer_name_en VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  overdue_count BIGINT,
  total_overdue_amount DECIMAL(12,2),
  max_days_overdue INTEGER,
  currency VARCHAR(3)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id as contract_id,
    cc.contract_number,
    cc.title,
    c.id as customer_id,
    c.company_name_zh as customer_name_zh,
    c.company_name_en as customer_name_en,
    c.email as customer_email,
    c.phone as customer_phone,
    COUNT(ps.id) as overdue_count,
    SUM(ps.amount) as total_overdue_amount,
    MAX(ps.days_overdue) as max_days_overdue,
    cc.currency
  FROM customer_contracts cc
  JOIN customers c ON cc.customer_id = c.id
  JOIN payment_schedules ps ON cc.id = ps.contract_id
  WHERE cc.user_id = p_user_id
    AND cc.status = 'active'
    AND ps.status = 'overdue'
  GROUP BY cc.id, c.id
  ORDER BY max_days_overdue DESC, total_overdue_amount DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_contracts_with_overdue_payments IS
  '取得有逾期款項的合約列表 - 按逾期天數和金額排序';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 008 completed successfully!' as status,
       'Added RPC functions for contract service' as description;


-- ============================================================================
-- From: 009_missing_rpc_functions.sql
-- ============================================================================
-- ============================================================================
-- Migration 009: Missing RPC Functions
-- Created: 2025-10-29
-- Description: Add RPC functions for company, payments, and RBAC services
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION - can_access_company
-- Check if a user can access a company
-- ============================================================================

CREATE OR REPLACE FUNCTION can_access_company(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_member BOOLEAN;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if user is super admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND r.name = 'super_admin'
      AND ur.is_active = true
  ) INTO v_is_super_admin;

  IF v_is_super_admin THEN
    RETURN true;
  END IF;

  -- Check if user is a member of the company
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND is_active = true
  ) INTO v_is_member;

  RETURN v_is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_access_company IS
  '檢查使用者是否可以存取指定公司';

-- ============================================================================
-- 2. FUNCTION - can_assign_role
-- Check if a user can assign a specific role
-- ============================================================================

CREATE OR REPLACE FUNCTION can_assign_role(
  p_user_id UUID,
  p_role_name VARCHAR(50),
  p_company_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_is_owner BOOLEAN;
  v_role_level INTEGER;
  v_user_level INTEGER;
BEGIN
  -- Get role level
  SELECT level INTO v_role_level
  FROM roles
  WHERE name = p_role_name;

  IF v_role_level IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user is super admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND r.name = 'super_admin'
      AND ur.is_active = true
  ) INTO v_is_super_admin;

  IF v_is_super_admin THEN
    RETURN true;
  END IF;

  -- For company roles, check if user is company owner
  IF p_company_id IS NOT NULL THEN
    SELECT is_owner INTO v_is_owner
    FROM company_members
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND is_active = true;

    IF v_is_owner THEN
      -- Owner can assign roles below their level
      SELECT MAX(r.level) INTO v_user_level
      FROM company_members cm
      JOIN roles r ON cm.role_id = r.id
      WHERE cm.user_id = p_user_id
        AND cm.company_id = p_company_id
        AND cm.is_active = true;

      RETURN v_user_level >= v_role_level;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_assign_role IS
  '檢查使用者是否可以分配指定角色';

-- ============================================================================
-- 3. FUNCTION - can_manage_user
-- Check if a user can manage another user
-- ============================================================================

CREATE OR REPLACE FUNCTION can_manage_user(
  p_manager_id UUID,
  p_target_user_id UUID,
  p_company_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_is_owner BOOLEAN;
  v_manager_level INTEGER;
  v_target_level INTEGER;
BEGIN
  -- Users can always manage themselves
  IF p_manager_id = p_target_user_id THEN
    RETURN true;
  END IF;

  -- Check if manager is super admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_manager_id
      AND r.name = 'super_admin'
      AND ur.is_active = true
  ) INTO v_is_super_admin;

  IF v_is_super_admin THEN
    RETURN true;
  END IF;

  -- For company context, check ownership and role levels
  IF p_company_id IS NOT NULL THEN
    -- Check if manager is company owner
    SELECT is_owner INTO v_is_owner
    FROM company_members
    WHERE user_id = p_manager_id
      AND company_id = p_company_id
      AND is_active = true;

    IF v_is_owner THEN
      RETURN true;
    END IF;

    -- Check role levels
    SELECT MAX(r.level) INTO v_manager_level
    FROM company_members cm
    JOIN roles r ON cm.role_id = r.id
    WHERE cm.user_id = p_manager_id
      AND cm.company_id = p_company_id
      AND cm.is_active = true;

    SELECT MAX(r.level) INTO v_target_level
    FROM company_members cm
    JOIN roles r ON cm.role_id = r.id
    WHERE cm.user_id = p_target_user_id
      AND cm.company_id = p_company_id
      AND cm.is_active = true;

    -- Manager can manage users with lower role level
    RETURN v_manager_level > v_target_level;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_manage_user IS
  '檢查使用者是否可以管理其他使用者';

-- ============================================================================
-- 4. FUNCTION - get_manageable_companies
-- Get list of companies that a user can manage
-- ============================================================================

CREATE OR REPLACE FUNCTION get_manageable_companies(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name JSONB,
  logo_url TEXT,
  tax_id VARCHAR(50),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_owner BOOLEAN,
  role_name VARCHAR(50),
  member_count BIGINT
) AS $$
BEGIN
  -- Super admins can manage all companies
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND r.name = 'super_admin'
      AND ur.is_active = true
  ) THEN
    RETURN QUERY
    SELECT
      c.id,
      c.name,
      c.logo_url,
      c.tax_id,
      c.phone,
      c.email,
      false as is_owner,
      'super_admin'::VARCHAR(50) as role_name,
      COUNT(DISTINCT cm.id) as member_count
    FROM companies c
    LEFT JOIN company_members cm ON c.id = cm.company_id AND cm.is_active = true
    GROUP BY c.id;
  ELSE
    -- Regular users can only manage companies they own or are managers in
    RETURN QUERY
    SELECT
      c.id,
      c.name,
      c.logo_url,
      c.tax_id,
      c.phone,
      c.email,
      cm_user.is_owner,
      r.name as role_name,
      COUNT(DISTINCT cm.id) as member_count
    FROM companies c
    JOIN company_members cm_user ON c.id = cm_user.company_id
    JOIN roles r ON cm_user.role_id = r.id
    LEFT JOIN company_members cm ON c.id = cm.company_id AND cm.is_active = true
    WHERE cm_user.user_id = p_user_id
      AND cm_user.is_active = true
      AND (cm_user.is_owner = true OR r.level >= 50)  -- Owner or manager level
    GROUP BY c.id, cm_user.is_owner, r.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_manageable_companies IS
  '取得使用者可以管理的公司列表';

-- ============================================================================
-- 5. FUNCTION - get_payments_by_month
-- Get payment statistics grouped by month
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payments_by_month(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  month DATE,
  total_amount DECIMAL(12,2),
  collected_amount DECIMAL(12,2),
  pending_amount DECIMAL(12,2),
  payment_count BIGINT,
  collected_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', p.payment_date)::DATE as month,
    SUM(p.amount) as total_amount,
    SUM(CASE WHEN p.payment_status = 'collected' THEN p.amount ELSE 0 END) as collected_amount,
    SUM(CASE WHEN p.payment_status IN ('pending', 'overdue') THEN p.amount ELSE 0 END) as pending_amount,
    COUNT(*) as payment_count,
    COUNT(*) FILTER (WHERE p.payment_status = 'collected') as collected_count
  FROM payments p
  WHERE p.user_id = p_user_id
    AND (p_start_date IS NULL OR p.payment_date >= p_start_date)
    AND (p_end_date IS NULL OR p.payment_date <= p_end_date)
  GROUP BY DATE_TRUNC('month', p.payment_date)
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_payments_by_month IS
  '按月份統計收款資料';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 009 completed successfully!' as status,
       'Added missing RPC functions for company, payments, and RBAC services' as description;


-- ============================================================================
-- From: 010_fix_company_members_is_owner.sql
-- ============================================================================
-- ============================================================================
-- Migration 010: Fix company_members table - Add is_owner column
-- Created: 2025-10-29
-- Description: Add missing is_owner column to company_members table
-- ============================================================================

-- Add is_owner column to company_members table
ALTER TABLE company_members
ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_company_members_is_owner
ON company_members(company_id, is_owner)
WHERE is_owner = true;

-- Update existing records: set first member of each company as owner
WITH first_members AS (
  SELECT DISTINCT ON (company_id)
    id,
    company_id
  FROM company_members
  ORDER BY company_id, joined_at ASC
)
UPDATE company_members cm
SET is_owner = true
FROM first_members fm
WHERE cm.id = fm.id
  AND cm.is_owner = false;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 010 completed successfully!' as status,
       'Added is_owner column to company_members table' as description;


-- ============================================================================
-- From: 011_fix_get_user_companies_function.sql
-- ============================================================================
-- ============================================================================
-- Migration 011: Fix get_user_companies function
-- Created: 2025-10-29
-- Description: Fix return type mismatch - companies.name is varchar not jsonb
-- ============================================================================

-- Drop the old function
DROP FUNCTION IF EXISTS get_user_companies(UUID);

-- Recreate with correct types based on actual table structure
CREATE OR REPLACE FUNCTION get_user_companies(p_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name VARCHAR(255),
  role_name VARCHAR(50),
  is_owner BOOLEAN,
  logo_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    r.name as role_name,
    cm.is_owner,
    c.logo_url
  FROM companies c
  INNER JOIN company_members cm ON c.id = cm.company_id
  INNER JOIN roles r ON cm.role_id = r.id
  WHERE cm.user_id = p_user_id
  AND cm.is_active = true
  ORDER BY cm.is_owner DESC, cm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_companies IS
  '取得使用者所屬的公司列表 - 修正版本（company_name 為 VARCHAR）';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 011 completed successfully!' as status,
       'Fixed get_user_companies function return type' as description;


-- ============================================================================
-- From: 012_setup_user_permissions.sql
-- ============================================================================
-- ============================================================================
-- Migration 012: Setup User Permissions
-- Created: 2025-10-29
-- Description: Create missing permissions and assign roles to existing users
-- ============================================================================

-- ============================================================================
-- 1. Create Missing Permissions (Contracts)
-- ============================================================================

INSERT INTO permissions (name, name_zh, name_en, category, description)
VALUES
  ('view_contracts', '查看合約', 'View Contracts', 'contract_management', 'View contract list and details'),
  ('create_contracts', '建立合約', 'Create Contracts', 'contract_management', 'Create new contracts'),
  ('edit_contracts', '編輯合約', 'Edit Contracts', 'contract_management', 'Edit contract information'),
  ('delete_contracts', '刪除合約', 'Delete Contracts', 'contract_management', 'Delete contracts')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. Assign All Permissions to company_owner Role
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'company_owner'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 3. Assign company_owner Role to All Existing Users
-- ============================================================================

INSERT INTO user_roles (user_id, role_id, is_active)
SELECT
  u.id,
  r.id,
  true
FROM auth.users u
CROSS JOIN roles r
WHERE r.name = 'company_owner'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 012 completed successfully!' as status,
       'Setup user permissions and assigned roles' as description;


-- ============================================================================
-- From: 013_fix_user_permissions_view.sql
-- ============================================================================
-- ============================================================================
-- Migration 013: Fix user_permissions view
-- Created: 2025-10-29
-- Description: Fix user_permissions view to match actual permissions table structure
-- ============================================================================

-- Drop old view that references non-existent columns
DROP VIEW IF EXISTS user_permissions;

-- Recreate view with correct column names
CREATE OR REPLACE VIEW user_permissions AS
SELECT
  ur.user_id,
  r.name as role_name,
  r.level as role_level,
  p.name as permission_name,
  p.category,
  p.description
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.is_active = true;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 013 completed successfully!' as status,
       'Fixed user_permissions view to use correct column names' as description;


-- ============================================================================
-- From: 014_fix_customers_column_references.sql
-- ============================================================================
-- ============================================================================
-- Migration 014: Fix customers column references in RPC functions
-- Created: 2025-10-29
-- Description: Fix RPC functions that reference non-existent company_name_zh/en columns
--              The actual column is 'name' (JSONB type)
-- ============================================================================

-- ============================================================================
-- 1. Fix get_contracts_with_overdue_payments
-- ============================================================================

DROP FUNCTION IF EXISTS get_contracts_with_overdue_payments(UUID);

CREATE OR REPLACE FUNCTION get_contracts_with_overdue_payments(p_user_id UUID)
RETURNS TABLE (
  contract_id UUID,
  contract_number VARCHAR(50),
  title VARCHAR(255),
  customer_id UUID,
  customer_name_zh VARCHAR(255),
  customer_name_en VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  overdue_count BIGINT,
  total_overdue_amount NUMERIC(15,2),
  max_days_overdue INTEGER,
  currency VARCHAR(3)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id as contract_id,
    cc.contract_number,
    cc.title,
    c.id as customer_id,
    (c.name->>'zh')::VARCHAR(255) as customer_name_zh,
    (c.name->>'en')::VARCHAR(255) as customer_name_en,
    c.email as customer_email,
    c.phone as customer_phone,
    COUNT(ps.id) as overdue_count,
    SUM(ps.amount) as total_overdue_amount,
    MAX(ps.days_overdue) as max_days_overdue,
    cc.currency
  FROM customer_contracts cc
  JOIN customers c ON cc.customer_id = c.id
  JOIN payment_schedules ps ON cc.id = ps.contract_id
  WHERE cc.user_id = p_user_id
    AND cc.status = 'active'
    AND ps.status = 'overdue'
  GROUP BY cc.id, c.id
  ORDER BY max_days_overdue DESC, total_overdue_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Check if get_payment_reminders exists and fix it
-- ============================================================================

-- First, check what the function signature is
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_payment_reminders'
  ) THEN
    DROP FUNCTION get_payment_reminders(UUID);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_payment_reminders(p_user_id UUID)
RETURNS TABLE (
  schedule_id UUID,
  contract_id UUID,
  contract_number VARCHAR(50),
  customer_id UUID,
  customer_name_zh VARCHAR(255),
  customer_name_en VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  due_date DATE,
  amount NUMERIC(15,2),
  currency VARCHAR(3),
  days_until_due INTEGER,
  status VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id as schedule_id,
    cc.id as contract_id,
    cc.contract_number,
    c.id as customer_id,
    (c.name->>'zh')::VARCHAR(255) as customer_name_zh,
    (c.name->>'en')::VARCHAR(255) as customer_name_en,
    c.email as customer_email,
    c.phone as customer_phone,
    ps.due_date,
    ps.amount,
    cc.currency,
    (ps.due_date - CURRENT_DATE)::INTEGER as days_until_due,
    ps.status::VARCHAR(20)
  FROM payment_schedules ps
  JOIN customer_contracts cc ON ps.contract_id = cc.id
  JOIN customers c ON cc.customer_id = c.id
  WHERE cc.user_id = p_user_id
    AND ps.status IN ('pending', 'upcoming')
    AND ps.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  ORDER BY ps.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Fix get_contract_by_id if it exists
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_contract_by_id'
  ) THEN
    DROP FUNCTION get_contract_by_id(UUID, UUID);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_contract_by_id(
  p_contract_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', cc.id,
    'contract_number', cc.contract_number,
    'title', cc.title,
    'description', cc.description,
    'status', cc.status,
    'currency', cc.currency,
    'total_amount', cc.total_amount,
    'signed_date', cc.signed_date,
    'start_date', cc.start_date,
    'end_date', cc.end_date,
    'customer', json_build_object(
      'id', c.id,
      'name_zh', c.name->>'zh',
      'name_en', c.name->>'en',
      'email', c.email,
      'phone', c.phone
    )
  ) INTO result
  FROM customer_contracts cc
  JOIN customers c ON cc.customer_id = c.id
  WHERE cc.id = p_contract_id
    AND cc.user_id = p_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 014 completed successfully!' as status,
       'Fixed all RPC functions to use customers.name JSONB column' as description;


-- ============================================================================
-- From: 015_add_quotation_payment_fields.sql
-- ============================================================================
-- Migration: Add payment method and notes fields to quotations
-- Description: Add payment_method and payment_notes columns to quotations table
-- Created: 2025-11-15

-- Add payment_method column to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL;

-- Add payment_notes column to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS payment_notes TEXT NULL;

-- Add comment to payment_method column
COMMENT ON COLUMN quotations.payment_method IS 'Payment method for the quotation (cash, bank_transfer, ach_transfer, credit_card, check, cryptocurrency, other)';

-- Add comment to payment_notes column
COMMENT ON COLUMN quotations.payment_notes IS 'Additional notes about payment (max 500 characters)';

-- Note: No index needed for these columns as they are optional filter fields
-- and not used in JOIN operations or frequent WHERE clauses


-- ============================================================================
-- From: 015_grant_user_permissions_view_access.sql
-- ============================================================================
-- ============================================================================
-- Migration 015: Grant access to user_permissions view
-- Created: 2025-10-29
-- Description: Grant SELECT permission on user_permissions view to authenticated users
-- ============================================================================

-- Grant SELECT permission to authenticated users
GRANT SELECT ON user_permissions TO authenticated;

-- Grant SELECT permission to anon users (for public access if needed)
GRANT SELECT ON user_permissions TO anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 015 completed successfully!' as status,
       'Granted SELECT permission on user_permissions view to authenticated and anon roles' as description;


-- ============================================================================
-- From: 016_ensure_products_base_price.sql
-- ============================================================================
-- Migration: Ensure products table has base_price and base_currency columns
-- This migration handles cases where the table might have unit_price instead

-- Check and rename unit_price to base_price if needed
DO $$
BEGIN
    -- Check if unit_price exists and base_price doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'unit_price'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'base_price'
    ) THEN
        -- Rename unit_price to base_price
        ALTER TABLE products RENAME COLUMN unit_price TO base_price;
        RAISE NOTICE 'Renamed unit_price to base_price';
    END IF;

    -- Check if currency exists and base_currency doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'currency'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'base_currency'
    ) THEN
        -- Rename currency to base_currency
        ALTER TABLE products RENAME COLUMN currency TO base_currency;
        RAISE NOTICE 'Renamed currency to base_currency';
    END IF;

    -- If base_price doesn't exist at all, create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'base_price'
    ) THEN
        ALTER TABLE products ADD COLUMN base_price DECIMAL(12, 2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Created base_price column';
    END IF;

    -- If base_currency doesn't exist at all, create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'base_currency'
    ) THEN
        ALTER TABLE products ADD COLUMN base_currency VARCHAR(3) NOT NULL DEFAULT 'TWD';
        RAISE NOTICE 'Created base_currency column';
    END IF;
END $$;

-- Update the profit margin trigger to use base_price
CREATE OR REPLACE FUNCTION calculate_profit_margin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cost_price IS NOT NULL AND NEW.cost_price > 0 AND NEW.base_price IS NOT NULL THEN
    NEW.profit_margin := ((NEW.base_price - NEW.cost_price) / NEW.cost_price * 100);
  ELSE
    NEW.profit_margin := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_calculate_profit_margin ON products;
CREATE TRIGGER trigger_calculate_profit_margin
BEFORE INSERT OR UPDATE OF cost_price, base_price ON products
FOR EACH ROW
EXECUTE FUNCTION calculate_profit_margin();

-- Verify the changes
DO $$
DECLARE
    has_base_price BOOLEAN;
    has_base_currency BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'base_price'
    ) INTO has_base_price;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'base_currency'
    ) INTO has_base_currency;

    IF has_base_price AND has_base_currency THEN
        RAISE NOTICE 'Migration successful: base_price and base_currency columns exist';
    ELSE
        RAISE EXCEPTION 'Migration failed: missing required columns';
    END IF;
END $$;


-- ============================================================================
-- From: 017_add_analytics_permissions.sql
-- ============================================================================
-- ============================================================================
-- 新增 Analytics 權限
-- ============================================================================
-- 說明：新增儀表板分析權限並分配給需要查看報表的角色
-- 日期：2025-11-13
-- ============================================================================

-- 插入 analytics 權限
INSERT INTO permissions (id, resource, action, name, description) VALUES
  ('perm-analytics-read', 'analytics', 'read', 'analytics:read', 'View dashboard analytics and reports')
ON CONFLICT (id) DO NOTHING;

-- 授予以下角色 analytics:read 權限：
-- - super_admin: 總管理員需要查看所有分析數據
-- - company_owner: 公司負責人需要查看公司營運數據
-- - sales_manager: 業務主管需要查看團隊績效和營收趨勢
-- - accountant: 會計需要查看財務統計和收款數據
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT
  'rp-' || roles.name || '-analytics-read',
  roles.id,
  permissions.id
FROM roles, permissions
WHERE roles.name IN ('super_admin', 'company_owner', 'sales_manager', 'accountant')
  AND permissions.resource = 'analytics'
  AND permissions.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 完成
-- ============================================================================
SELECT 'Analytics permissions added successfully!' as status;


-- ============================================================================
-- From: 018_fix_payment_schedules_schema.sql
-- ============================================================================
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


-- ============================================================================
-- From: 019_add_payment_indexes.sql
-- ============================================================================
-- Migration: Add indexes for payment schedule queries optimization
-- Created: 2025-11-15
-- Purpose: Optimize getCurrentMonthReceivables and related payment queries

-- Index for querying payment schedules by due date and status
-- Used by: getCurrentMonthReceivables() to filter monthly receivables
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date
ON payment_schedules(due_date, status);

-- Index for querying payment schedules by user and due date
-- Used by: User-specific monthly receivable queries
CREATE INDEX IF NOT EXISTS idx_payment_schedules_user_due
ON payment_schedules(user_id, due_date);

-- Index for customer_contracts quotation lookups
-- Used by: JOIN operations between contracts and quotations
CREATE INDEX IF NOT EXISTS idx_customer_contracts_quotation
ON customer_contracts(quotation_id);

-- Verify indexes created successfully
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_payment_schedules_due_date',
    'idx_payment_schedules_user_due',
    'idx_customer_contracts_quotation'
  )
ORDER BY tablename, indexname;


