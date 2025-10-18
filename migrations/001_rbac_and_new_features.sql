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
