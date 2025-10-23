-- ============================================================================
-- ⭐ 完整 Supabase Migration - 正確執行順序
-- ============================================================================
-- 此腳本包含：
-- PART 1: 基礎表（customers, products, quotations 等）
-- PART 2: RBAC 系統（roles, permissions, user_profiles 等）
-- PART 3: 多公司架構（companies, company_members 等）
-- PART 4: 合約收款（customer_contracts, payments 等）
-- PART 5: 審計擴充（audit_logs, quotation_shares 等）
-- PART 6: 預設資料（roles, permissions, role_permissions）
-- ============================================================================
-- 執行時間：約 15-20 秒
-- 執行環境：Supabase Dashboard SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 1: 基礎業務表（5 個表）
-- ============================================================================

-- 1.1 客戶表
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name JSONB NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address JSONB,
  tax_id VARCHAR(50),
  contact_person JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 1.2 產品表
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sku VARCHAR(100),
  name JSONB NOT NULL,
  description JSONB,
  unit_price DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 1.3 報價單表
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);

-- 1.4 報價單項目表
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
  subtotal DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product_id ON quotation_items(product_id);

-- 1.5 匯率表
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10, 6) NOT NULL,
  date DATE NOT NULL,
  source VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies_date ON exchange_rates(from_currency, to_currency, date);

-- ============================================================================
-- PART 2: RBAC 系統（5 個表）
-- ============================================================================

-- 2.1 角色表
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

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);

-- 2.2 權限表
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  name_zh VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

-- 2.3 角色權限對應表
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 2.4 使用者資料表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 2.5 使用者角色表
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  company_id UUID,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON user_roles(company_id);

-- ============================================================================
-- PART 3: 多公司架構（3 個表）
-- ============================================================================

-- 3.1 公司表
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  website VARCHAR(255),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_tax_id ON companies(tax_id);

-- 3.2 公司成員表
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  position VARCHAR(100),
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);

-- 3.3 公司設定表
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  default_currency VARCHAR(3) DEFAULT 'TWD',
  default_tax_rate DECIMAL(5,2) DEFAULT 5.00,
  quotation_prefix VARCHAR(20) DEFAULT 'QT',
  quotation_number_format VARCHAR(50) DEFAULT '{prefix}-{year}{month}-{seq}',
  quotation_validity_days INTEGER DEFAULT 30,
  terms_and_conditions TEXT,
  payment_terms TEXT,
  email_signature TEXT,
  notification_settings JSONB DEFAULT '{}',
  feature_flags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON company_settings(company_id);

-- ============================================================================
-- PART 4: 合約與收款管理（3 個表）
-- ============================================================================

-- 4.1 客戶合約表
CREATE TABLE IF NOT EXISTS customer_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  contract_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'draft',
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  payment_type VARCHAR(20) NOT NULL,
  payment_terms TEXT,
  installments INTEGER,
  start_date DATE,
  end_date DATE,
  signed_date DATE,
  contract_file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_contracts_user_id ON customer_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_contracts_customer_id ON customer_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contracts_quotation_id ON customer_contracts(quotation_id);
CREATE INDEX IF NOT EXISTS idx_customer_contracts_status ON customer_contracts(status);

-- 4.2 收款記錄表
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
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
  payment_frequency VARCHAR(20),
  is_overdue BOOLEAN DEFAULT false,
  days_overdue INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (quotation_id IS NOT NULL OR contract_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_quotation_id ON payments(quotation_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 4.3 付款排程表
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  days_overdue INTEGER DEFAULT 0,
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, schedule_number)
);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract_id ON payment_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_customer_id ON payment_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);

-- ============================================================================
-- PART 5: 審計與進階功能（3 個表）
-- ============================================================================

-- 5.1 審計日誌表
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 5.2 報價單分享表
CREATE TABLE IF NOT EXISTS quotation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_shares_quotation_id ON quotation_shares(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_shares_token ON quotation_shares(share_token);

-- 5.3 報價單版本表
CREATE TABLE IF NOT EXISTS quotation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quotation_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_quotation_id ON quotation_versions(quotation_id);

-- ============================================================================
-- PART 6: 觸發器函數
-- ============================================================================

-- 更新 updated_at 的觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為所有需要的表建立觸發器
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotations_updated_at ON quotations;
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotation_items_updated_at ON quotation_items;
CREATE TRIGGER update_quotation_items_updated_at BEFORE UPDATE ON quotation_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_roles_timestamp BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_permissions_timestamp BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_user_profiles_timestamp BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_user_roles_timestamp BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_companies_timestamp BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_company_members_timestamp BEFORE UPDATE ON company_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_company_settings_timestamp BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_customer_contracts_timestamp BEFORE UPDATE ON customer_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_payments_timestamp BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_payment_schedules_timestamp BEFORE UPDATE ON payment_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_quotation_shares_timestamp BEFORE UPDATE ON quotation_shares FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 7: RLS 政策
-- ============================================================================

-- 啟用 RLS（所有表）
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_versions ENABLE ROW LEVEL SECURITY;

-- Customers policies
DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
CREATE POLICY "Users can view their own customers" ON customers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
CREATE POLICY "Users can insert their own customers" ON customers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
CREATE POLICY "Users can update their own customers" ON customers FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;
CREATE POLICY "Users can delete their own customers" ON customers FOR DELETE USING (auth.uid() = user_id);

-- Products policies
DROP POLICY IF EXISTS "Users can view their own products" ON products;
CREATE POLICY "Users can view their own products" ON products FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own products" ON products;
CREATE POLICY "Users can insert their own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON products;
CREATE POLICY "Users can update their own products" ON products FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own products" ON products;
CREATE POLICY "Users can delete their own products" ON products FOR DELETE USING (auth.uid() = user_id);

-- Quotations policies
DROP POLICY IF EXISTS "Users can view their own quotations" ON quotations;
CREATE POLICY "Users can view their own quotations" ON quotations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quotations" ON quotations;
CREATE POLICY "Users can insert their own quotations" ON quotations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quotations" ON quotations;
CREATE POLICY "Users can update their own quotations" ON quotations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quotations" ON quotations;
CREATE POLICY "Users can delete their own quotations" ON quotations FOR DELETE USING (auth.uid() = user_id);

-- Quotation items policies
DROP POLICY IF EXISTS "Users can view quotation items" ON quotation_items;
CREATE POLICY "Users can view quotation items" ON quotation_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM quotations WHERE quotations.id = quotation_items.quotation_id AND quotations.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert quotation items" ON quotation_items;
CREATE POLICY "Users can insert quotation items" ON quotation_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM quotations WHERE quotations.id = quotation_items.quotation_id AND quotations.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update quotation items" ON quotation_items;
CREATE POLICY "Users can update quotation items" ON quotation_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM quotations WHERE quotations.id = quotation_items.quotation_id AND quotations.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete quotation items" ON quotation_items;
CREATE POLICY "Users can delete quotation items" ON quotation_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM quotations WHERE quotations.id = quotation_items.quotation_id AND quotations.user_id = auth.uid()));

-- Exchange rates policies
DROP POLICY IF EXISTS "Authenticated users can view exchange rates" ON exchange_rates;
CREATE POLICY "Authenticated users can view exchange rates" ON exchange_rates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert exchange rates" ON exchange_rates;
CREATE POLICY "Authenticated users can insert exchange rates" ON exchange_rates FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update exchange rates" ON exchange_rates;
CREATE POLICY "Authenticated users can update exchange rates" ON exchange_rates FOR UPDATE TO authenticated USING (true);

-- RBAC 表的 RLS policies
CREATE POLICY "Authenticated users can read roles" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read permissions" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);

-- 使用者資料 RLS policies
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- PART 8: 插入預設資料
-- ============================================================================

-- 8.1 插入預設角色 (5 個)
INSERT INTO roles (name, name_zh, name_en, level, description) VALUES
  ('super_admin', '總管理員', 'Super Admin', 1, 'Full system access'),
  ('company_owner', '公司負責人', 'Company Owner', 2, 'Company-wide management'),
  ('sales_manager', '業務主管', 'Sales Manager', 3, 'Sales team management'),
  ('salesperson', '業務人員', 'Salesperson', 4, 'Sales operations'),
  ('accountant', '會計', 'Accountant', 5, 'Financial operations')
ON CONFLICT (name) DO NOTHING;

-- 8.2 插入預設權限 (21 個)
INSERT INTO permissions (name, name_zh, name_en, category, description) VALUES
  ('view_customers', '查看客戶', 'View Customers', 'customer_management', 'View customer list and details'),
  ('create_customers', '建立客戶', 'Create Customers', 'customer_management', 'Create new customers'),
  ('edit_customers', '編輯客戶', 'Edit Customers', 'customer_management', 'Edit customer information'),
  ('delete_customers', '刪除客戶', 'Delete Customers', 'customer_management', 'Delete customers'),
  ('view_products', '查看產品', 'View Products', 'product_management', 'View product list'),
  ('create_products', '建立產品', 'Create Products', 'product_management', 'Create new products'),
  ('edit_products', '編輯產品', 'Edit Products', 'product_management', 'Edit product information'),
  ('delete_products', '刪除產品', 'Delete Products', 'product_management', 'Delete products'),
  ('view_quotations', '查看報價單', 'View Quotations', 'quotation_management', 'View quotation list'),
  ('create_quotations', '建立報價單', 'Create Quotations', 'quotation_management', 'Create new quotations'),
  ('edit_quotations', '編輯報價單', 'Edit Quotations', 'quotation_management', 'Edit quotation information'),
  ('delete_quotations', '刪除報價單', 'Delete Quotations', 'quotation_management', 'Delete quotations'),
  ('view_payments', '查看收款', 'View Payments', 'financial_management', 'View payment records'),
  ('create_payments', '建立收款', 'Create Payments', 'financial_management', 'Record new payments'),
  ('edit_payments', '編輯收款', 'Edit Payments', 'financial_management', 'Edit payment information'),
  ('delete_payments', '刪除收款', 'Delete Payments', 'financial_management', 'Delete payment records'),
  ('manage_users', '管理使用者', 'Manage Users', 'system_management', 'Manage user accounts'),
  ('manage_roles', '管理角色', 'Manage Roles', 'system_management', 'Manage roles and permissions'),
  ('manage_company', '管理公司', 'Manage Company', 'system_management', 'Manage company settings'),
  ('view_reports', '查看報表', 'View Reports', 'system_management', 'View system reports'),
  ('view_audit_logs', '查看審計日誌', 'View Audit Logs', 'system_management', 'View audit logs')
ON CONFLICT (name) DO NOTHING;

-- 8.3 設定角色權限對應
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'super_admin'), id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'company_owner'), id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'sales_manager'), id FROM permissions
WHERE category IN ('customer_management', 'product_management', 'quotation_management', 'financial_management') OR name = 'view_reports'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'salesperson'), id FROM permissions
WHERE name IN ('view_customers', 'create_customers', 'edit_customers', 'view_products', 'view_quotations', 'create_quotations', 'edit_quotations', 'view_payments')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'accountant'), id FROM permissions
WHERE category = 'financial_management' OR name IN ('view_customers', 'view_quotations', 'view_reports')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 驗證結果
-- ============================================================================
SELECT '✅ 完成！所有表已建立' as status;
SELECT '📊 基礎表' as category, COUNT(*) as count FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('customers', 'products', 'quotations', 'quotation_items', 'exchange_rates');
SELECT '🔐 RBAC 表' as category, COUNT(*) as count FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('roles', 'permissions', 'role_permissions', 'user_profiles', 'user_roles');
SELECT '🏢 公司表' as category, COUNT(*) as count FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('companies', 'company_members', 'company_settings');
SELECT '💰 合約收款表' as category, COUNT(*) as count FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('customer_contracts', 'payments', 'payment_schedules');
SELECT '📝 審計擴充表' as category, COUNT(*) as count FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('audit_logs', 'quotation_shares', 'quotation_versions');
SELECT '👥 角色資料' as category, COUNT(*) as count FROM roles;
SELECT '🔑 權限資料' as category, COUNT(*) as count FROM permissions;
SELECT '🔗 角色權限對應' as category, COUNT(*) as count FROM role_permissions;

-- ============================================================================
-- 預期結果：
-- ✅ 完成！所有表已建立
-- 📊 基礎表: 5
-- 🔐 RBAC 表: 5
-- 🏢 公司表: 3
-- 💰 合約收款表: 3
-- 📝 審計擴充表: 3
-- 👥 角色資料: 5
-- 🔑 權限資料: 21
-- 🔗 角色權限對應: 80+
-- ============================================================================
