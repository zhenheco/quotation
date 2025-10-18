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
