-- ============================================================================
-- 報價單系統 - D1 (SQLite) 初始資料庫架構
-- ============================================================================
-- 轉換說明：
-- 1. UUID → TEXT (使用 crypto.randomUUID() 生成)
-- 2. JSONB → TEXT (使用 JSON.stringify/parse)
-- 3. DECIMAL → REAL (SQLite 只有 REAL)
-- 4. TIMESTAMP → TEXT (ISO-8601 格式)
-- 5. 移除 REFERENCES auth.users (應用層檢查)
-- 6. 移除觸發器（應用層處理 updated_at）
-- ============================================================================

-- 1. 角色表 (Roles)
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  level INTEGER NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 插入預設角色
INSERT INTO roles (id, name, name_zh, name_en, level, description) VALUES
  ('role-super-admin', 'super_admin', '總管理員', 'Super Admin', 1, 'Full system access'),
  ('role-company-owner', 'company_owner', '公司負責人', 'Company Owner', 2, 'Company-wide management'),
  ('role-sales-manager', 'sales_manager', '業務主管', 'Sales Manager', 3, 'Sales team management'),
  ('role-salesperson', 'salesperson', '業務人員', 'Salesperson', 4, 'Sales operations'),
  ('role-accountant', 'accountant', '會計', 'Accountant', 5, 'Financial operations');

-- 2. 權限表 (Permissions)
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(resource, action)
);

-- 插入預設權限
INSERT INTO permissions (id, resource, action, name, description) VALUES
  -- Products
  ('perm-products-read', 'products', 'read', 'products:read', 'View products'),
  ('perm-products-write', 'products', 'write', 'products:write', 'Create/edit products'),
  ('perm-products-delete', 'products', 'delete', 'products:delete', 'Delete products'),
  ('perm-products-read-cost', 'products', 'read_cost', 'products:read_cost', 'View product costs'),
  ('perm-products-write-cost', 'products', 'write_cost', 'products:write_cost', 'Edit product costs'),
  -- Customers
  ('perm-customers-read', 'customers', 'read', 'customers:read', 'View customers'),
  ('perm-customers-write', 'customers', 'write', 'customers:write', 'Create/edit customers'),
  ('perm-customers-delete', 'customers', 'delete', 'customers:delete', 'Delete customers'),
  -- Quotations
  ('perm-quotations-read', 'quotations', 'read', 'quotations:read', 'View quotations'),
  ('perm-quotations-write', 'quotations', 'write', 'quotations:write', 'Create/edit quotations'),
  ('perm-quotations-delete', 'quotations', 'delete', 'quotations:delete', 'Delete quotations'),
  -- Contracts
  ('perm-contracts-read', 'contracts', 'read', 'contracts:read', 'View contracts'),
  ('perm-contracts-write', 'contracts', 'write', 'contracts:write', 'Create/edit contracts'),
  ('perm-contracts-delete', 'contracts', 'delete', 'contracts:delete', 'Delete contracts'),
  -- Payments
  ('perm-payments-read', 'payments', 'read', 'payments:read', 'View payments'),
  ('perm-payments-write', 'payments', 'write', 'payments:write', 'Create/edit payments'),
  ('perm-payments-delete', 'payments', 'delete', 'payments:delete', 'Delete payments'),
  -- Company settings
  ('perm-company-read', 'company_settings', 'read', 'company_settings:read', 'View company settings'),
  ('perm-company-write', 'company_settings', 'write', 'company_settings:write', 'Edit company settings'),
  -- Users
  ('perm-users-read', 'users', 'read', 'users:read', 'View users'),
  ('perm-users-write', 'users', 'write', 'users:write', 'Manage users'),
  ('perm-users-assign-roles', 'users', 'assign_roles', 'users:assign_roles', 'Assign roles to users');

-- 3. 角色權限關聯表
CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- 4. 使用者角色表
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, role_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- 5. 公司表
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  signature_url TEXT,
  passbook_url TEXT,
  tax_id TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_companies_tax_id ON companies(tax_id);

-- 6. 公司成員表
CREATE TABLE IF NOT EXISTS company_members (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  is_owner INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  joined_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, user_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_company_members_role ON company_members(role_id);

-- 7. 客戶表
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  contact_person TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_email ON customers(email);

-- 8. 產品/服務表
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  unit_price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TWD',
  category TEXT,
  cost_price REAL,
  cost_currency TEXT,
  profit_margin REAL,
  supplier TEXT,
  base_price REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_products_user ON products(user_id);
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_sku ON products(sku);

-- 9. 報價單表
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  customer_id TEXT NOT NULL,
  quotation_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  issue_date TEXT NOT NULL DEFAULT (date('now')),
  valid_until TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TWD',
  subtotal REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 5.00,
  tax_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_quotations_user ON quotations(user_id);
CREATE INDEX idx_quotations_company ON quotations(company_id);
CREATE INDEX idx_quotations_customer ON quotations(customer_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_number ON quotations(quotation_number);

-- 10. 報價單項目表
CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  product_id TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX idx_quotation_items_product ON quotation_items(product_id);

-- 11. 報價單分享連結表
CREATE TABLE IF NOT EXISTS quotation_shares (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  expires_at TEXT,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
);

CREATE INDEX idx_quotation_shares_token ON quotation_shares(share_token);
CREATE INDEX idx_quotation_shares_quotation ON quotation_shares(quotation_id);

-- 12. 報價單版本歷史表
CREATE TABLE IF NOT EXISTS quotation_versions (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
);

CREATE INDEX idx_quotation_versions_quotation ON quotation_versions(quotation_id);

-- 13. 合約表
CREATE TABLE IF NOT EXISTS customer_contracts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  customer_id TEXT NOT NULL,
  contract_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  signed_date TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  total_amount REAL NOT NULL,
  currency TEXT NOT NULL,
  payment_terms TEXT,
  contract_file_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_contracts_user ON customer_contracts(user_id);
CREATE INDEX idx_contracts_company ON customer_contracts(company_id);
CREATE INDEX idx_contracts_customer ON customer_contracts(customer_id);
CREATE INDEX idx_contracts_status ON customer_contracts(status);

-- 14. 付款表
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  quotation_id TEXT,
  contract_id TEXT,
  customer_id TEXT NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'installment', 'final', 'full')),
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  receipt_url TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT,
  FOREIGN KEY (contract_id) REFERENCES customer_contracts(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_company ON payments(company_id);
CREATE INDEX idx_payments_quotation ON payments(quotation_id);
CREATE INDEX idx_payments_contract ON payments(contract_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);

-- 15. 付款排程表 (Payment Schedules)
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

CREATE INDEX idx_payment_schedules_contract ON payment_schedules(contract_id);
CREATE INDEX idx_payment_schedules_customer ON payment_schedules(customer_id);
CREATE INDEX idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX idx_payment_schedules_user ON payment_schedules(user_id);

-- 16. 匯率表
CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate REAL NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(base_currency, target_currency)
);

CREATE INDEX idx_exchange_rates_pair ON exchange_rates(base_currency, target_currency);

-- 插入初始匯率數據
INSERT INTO exchange_rates (id, base_currency, target_currency, rate) VALUES
  ('rate-twd-usd', 'TWD', 'USD', 0.032),
  ('rate-twd-eur', 'TWD', 'EUR', 0.029),
  ('rate-twd-jpy', 'TWD', 'JPY', 4.5),
  ('rate-twd-cny', 'TWD', 'CNY', 0.22),
  ('rate-usd-twd', 'USD', 'TWD', 31.5),
  ('rate-eur-twd', 'EUR', 'TWD', 34.2),
  ('rate-jpy-twd', 'JPY', 'TWD', 0.22),
  ('rate-cny-twd', 'CNY', 'TWD', 4.5)
ON CONFLICT (base_currency, target_currency) DO NOTHING;

-- 17. 審計日誌表
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  changes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================================
-- 完成
-- ============================================================================
SELECT 'D1 initial schema created successfully!' as status;
