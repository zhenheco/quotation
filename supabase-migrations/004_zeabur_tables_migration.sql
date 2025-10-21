-- ============================================================================
-- Zeabur → Supabase 資料表遷移
-- ============================================================================
-- 建立 Zeabur 報價系統中缺少的 14 個表
-- 執行時間: 2025-10-21
--
-- 包含表:
-- 1. RBAC 系統 (5個): roles, permissions, role_permissions, user_roles, user_profiles
-- 2. 多公司架構 (3個): companies, company_members, company_settings
-- 3. 合約付款 (3個): customer_contracts, payments, payment_schedules
-- 4. 審計與擴充 (3個): audit_logs, quotation_shares, quotation_versions
-- ============================================================================

-- ============================================================================
-- Part 1: RBAC 系統
-- ============================================================================

-- 1.1 角色表
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

-- 插入預設角色
INSERT INTO roles (name, name_zh, name_en, level, description) VALUES
  ('super_admin', '總管理員', 'Super Admin', 1, 'Full system access'),
  ('company_owner', '公司負責人', 'Company Owner', 2, 'Company-wide management'),
  ('sales_manager', '業務主管', 'Sales Manager', 3, 'Sales team management'),
  ('salesperson', '業務人員', 'Salesperson', 4, 'Sales operations'),
  ('accountant', '會計', 'Accountant', 5, 'Financial operations')
ON CONFLICT (name) DO NOTHING;

-- 1.2 權限表
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- 插入預設權限
INSERT INTO permissions (resource, action, name, description) VALUES
  -- Products
  ('products', 'read', 'products:read', 'View products'),
  ('products', 'write', 'products:write', 'Create/edit products'),
  ('products', 'delete', 'products:delete', 'Delete products'),
  ('products', 'read_cost', 'products:read_cost', 'View product costs'),
  -- Customers
  ('customers', 'read', 'customers:read', 'View customers'),
  ('customers', 'write', 'customers:write', 'Create/edit customers'),
  ('customers', 'delete', 'customers:delete', 'Delete customers'),
  -- Quotations
  ('quotations', 'read', 'quotations:read', 'View quotations'),
  ('quotations', 'write', 'quotations:write', 'Create/edit quotations'),
  ('quotations', 'delete', 'quotations:delete', 'Delete quotations'),
  -- Contracts
  ('contracts', 'read', 'contracts:read', 'View contracts'),
  ('contracts', 'write', 'contracts:write', 'Create/edit contracts'),
  ('contracts', 'delete', 'contracts:delete', 'Delete contracts'),
  -- Payments
  ('payments', 'read', 'payments:read', 'View payments'),
  ('payments', 'write', 'payments:write', 'Create/edit payments'),
  ('payments', 'delete', 'payments:delete', 'Delete payments'),
  -- Company Settings
  ('company_settings', 'read', 'company_settings:read', 'View company settings'),
  ('company_settings', 'write', 'company_settings:write', 'Edit company settings'),
  -- Users
  ('users', 'read', 'users:read', 'View users'),
  ('users', 'write', 'users:write', 'Create/edit users'),
  ('users', 'delete', 'users:delete', 'Delete users'),
  ('users', 'assign_roles', 'users:assign_roles', 'Assign user roles')
ON CONFLICT (name) DO NOTHING;

-- 1.3 角色權限對應表
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- 分配權限給角色
DO $$
BEGIN
  -- 清空現有權限（重新分配）
  DELETE FROM role_permissions;

  -- Super Admin: 所有權限
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
  WHERE r.name = 'super_admin';

  -- Company Owner: 除了 assign_roles 外的所有權限
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
  WHERE r.name = 'company_owner'
    AND p.name NOT IN ('users:assign_roles');

  -- Sales Manager: 產品、客戶、報價單、合約管理 + 查看付款
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

  -- Salesperson: 查看全部，編輯報價單和客戶
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

  -- Accountant: 完整付款權限，查看全部，產品成本權限
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
END $$;

-- 1.4 使用者資料表
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

-- 1.5 使用者角色表
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ============================================================================
-- Part 2: 多公司架構
-- ============================================================================

-- 2.1 公司表
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL,
  logo_url TEXT,
  signature_url TEXT,
  passbook_url TEXT,
  tax_id VARCHAR(50),
  bank_name VARCHAR(255),
  bank_account VARCHAR(100),
  bank_code VARCHAR(50),
  address JSONB,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_tax_id ON companies(tax_id);

-- 2.2 公司成員表
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_owner BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_role_id ON company_members(role_id);

-- 2.3 公司設定表
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
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
-- Part 3: 合約與付款
-- ============================================================================

-- 3.1 客戶合約表
CREATE TABLE IF NOT EXISTS customer_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
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
  next_collection_date DATE,
  next_collection_amount DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON customer_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON customer_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_quotation_id ON customer_contracts(quotation_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON customer_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON customer_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_active ON customer_contracts(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_contracts_next_collection ON customer_contracts(next_collection_date);

-- 3.2 付款記錄表
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_payments_customer_date ON payments(customer_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_overdue ON payments(is_overdue) WHERE is_overdue = true;

-- 3.3 付款排程表
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
CREATE INDEX IF NOT EXISTS idx_schedules_customer_due ON payment_schedules(customer_id, due_date);
CREATE INDEX IF NOT EXISTS idx_schedules_pending ON payment_schedules(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_schedules_overdue ON payment_schedules(days_overdue) WHERE days_overdue > 0;

-- ============================================================================
-- Part 4: 審計與擴充功能
-- ============================================================================

-- 4.1 審計日誌表
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 4.2 報價單分享表
CREATE TABLE IF NOT EXISTS quotation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_shares_quotation_id ON quotation_shares(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_shares_token ON quotation_shares(share_token);

-- 4.3 報價單版本控制表
CREATE TABLE IF NOT EXISTS quotation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_quotation_id ON quotation_versions(quotation_id);

-- ============================================================================
-- Part 5: Triggers 和 Functions
-- ============================================================================

-- 5.1 自動更新 updated_at 欄位的函式
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 為所有表套用 updated_at trigger
DO $$
BEGIN
  -- roles
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_roles_timestamp') THEN
    CREATE TRIGGER trigger_update_roles_timestamp
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- user_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_user_profiles_timestamp') THEN
    CREATE TRIGGER trigger_update_user_profiles_timestamp
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- user_roles
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_user_roles_timestamp') THEN
    CREATE TRIGGER trigger_update_user_roles_timestamp
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- companies
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_companies_timestamp') THEN
    CREATE TRIGGER trigger_update_companies_timestamp
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- company_members
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_company_members_timestamp') THEN
    CREATE TRIGGER trigger_update_company_members_timestamp
    BEFORE UPDATE ON company_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- company_settings
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_company_settings_timestamp') THEN
    CREATE TRIGGER trigger_update_company_settings_timestamp
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- customer_contracts
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_customer_contracts_timestamp') THEN
    CREATE TRIGGER trigger_update_customer_contracts_timestamp
    BEFORE UPDATE ON customer_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- payments
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_payments_timestamp') THEN
    CREATE TRIGGER trigger_update_payments_timestamp
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- payment_schedules
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_payment_schedules_timestamp') THEN
    CREATE TRIGGER trigger_update_payment_schedules_timestamp
    BEFORE UPDATE ON payment_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- Part 6: RLS Policies (Row Level Security)
-- ============================================================================

-- 啟用 RLS
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

-- RBAC 表的 RLS policies (所有認證用戶可讀)
CREATE POLICY "Authenticated users can read roles" ON roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read permissions" ON permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read role_permissions" ON role_permissions
  FOR SELECT TO authenticated
  USING (true);

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Company settings policies
CREATE POLICY "Users can view own company settings" ON company_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own company settings" ON company_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company settings" ON company_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Customer contracts policies
CREATE POLICY "Users can view own contracts" ON customer_contracts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contracts" ON customer_contracts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts" ON customer_contracts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments" ON payments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Payment schedules policies
CREATE POLICY "Users can view own payment schedules" ON payment_schedules
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payment schedules" ON payment_schedules
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment schedules" ON payment_schedules
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Audit logs policies
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Quotation shares policies (public read for active shares)
CREATE POLICY "Anyone can view active shares" ON quotation_shares
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Quotation versions policies
CREATE POLICY "Users can view quotation versions" ON quotation_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quotations
    WHERE quotations.id = quotation_versions.quotation_id
    AND quotations.user_id = auth.uid()
  ));

-- ============================================================================
-- 完成
-- ============================================================================

SELECT
  '✅ Schema migration 完成!' as status,
  '已建立 14 個新表和所有必要的索引、外鍵、RLS policies' as message,
  NOW() as executed_at;
