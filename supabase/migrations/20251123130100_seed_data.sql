-- ============================================================================
-- Quotation System - 種子資料
-- ============================================================================

-- ============================================================================
-- 種子資料：角色
-- ============================================================================

INSERT INTO roles (id, name, name_zh, name_en, level, description) VALUES
  (uuid_generate_v4(), 'super_admin', '超級管理員', 'Super Admin', 100, '系統最高權限'),
  (uuid_generate_v4(), 'company_owner', '公司負責人', 'Company Owner', 80, '公司擁有者'),
  (uuid_generate_v4(), 'sales_manager', '銷售主管', 'Sales Manager', 60, '銷售部門主管'),
  (uuid_generate_v4(), 'salesperson', '業務人員', 'Salesperson', 40, '一般業務人員'),
  (uuid_generate_v4(), 'accountant', '會計', 'Accountant', 50, '財務會計人員')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 種子資料：權限
-- ============================================================================

INSERT INTO permissions (id, resource, action, name, description) VALUES
  -- 客戶權限
  (uuid_generate_v4(), 'customers', 'read', 'customers:read', '檢視客戶'),
  (uuid_generate_v4(), 'customers', 'write', 'customers:write', '編輯客戶'),
  (uuid_generate_v4(), 'customers', 'delete', 'customers:delete', '刪除客戶'),
  -- 產品權限
  (uuid_generate_v4(), 'products', 'read', 'products:read', '檢視產品'),
  (uuid_generate_v4(), 'products', 'write', 'products:write', '編輯產品'),
  (uuid_generate_v4(), 'products', 'delete', 'products:delete', '刪除產品'),
  (uuid_generate_v4(), 'products', 'read_cost', 'products:read_cost', '檢視成本'),
  (uuid_generate_v4(), 'products', 'write_cost', 'products:write_cost', '編輯成本'),
  -- 報價單權限
  (uuid_generate_v4(), 'quotations', 'read', 'quotations:read', '檢視報價單'),
  (uuid_generate_v4(), 'quotations', 'write', 'quotations:write', '編輯報價單'),
  (uuid_generate_v4(), 'quotations', 'delete', 'quotations:delete', '刪除報價單'),
  (uuid_generate_v4(), 'quotations', 'send', 'quotations:send', '發送報價單'),
  -- 合約權限
  (uuid_generate_v4(), 'contracts', 'read', 'contracts:read', '檢視合約'),
  (uuid_generate_v4(), 'contracts', 'write', 'contracts:write', '編輯合約'),
  (uuid_generate_v4(), 'contracts', 'delete', 'contracts:delete', '刪除合約'),
  -- 支付權限
  (uuid_generate_v4(), 'payments', 'read', 'payments:read', '檢視付款'),
  (uuid_generate_v4(), 'payments', 'write', 'payments:write', '編輯付款'),
  (uuid_generate_v4(), 'payments', 'delete', 'payments:delete', '刪除付款'),
  -- 公司設定權限
  (uuid_generate_v4(), 'company_settings', 'read', 'company_settings:read', '檢視公司設定'),
  (uuid_generate_v4(), 'company_settings', 'write', 'company_settings:write', '編輯公司設定'),
  -- 使用者管理權限
  (uuid_generate_v4(), 'users', 'read', 'users:read', '檢視使用者'),
  (uuid_generate_v4(), 'users', 'write', 'users:write', '編輯使用者'),
  (uuid_generate_v4(), 'users', 'assign_roles', 'users:assign_roles', '分配角色'),
  -- 分析統計權限
  (uuid_generate_v4(), 'analytics', 'read', 'analytics:read', '檢視統計'),
  -- 匯率權限
  (uuid_generate_v4(), 'exchange_rates', 'read', 'exchange_rates:read', '檢視匯率'),
  (uuid_generate_v4(), 'exchange_rates', 'write', 'exchange_rates:write', '編輯匯率')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 種子資料：角色權限關聯
-- ============================================================================

-- Super Admin: 所有權限
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Company Owner: 所有權限
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'company_owner'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Sales Manager: 業務相關權限
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_manager'
  AND (
    (p.resource IN ('products', 'customers', 'quotations', 'contracts', 'payments', 'analytics')
     AND p.action IN ('read', 'write'))
    OR (p.resource = 'company_settings' AND p.action = 'read')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Salesperson: 基本業務權限
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'salesperson'
  AND (
    (p.resource IN ('products', 'customers', 'quotations') AND p.action IN ('read', 'write'))
    OR (p.resource = 'company_settings' AND p.action = 'read')
    OR (p.resource = 'analytics' AND p.action = 'read')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Accountant: 財務相關權限
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'accountant'
  AND (
    (p.resource IN ('payments', 'contracts', 'quotations', 'analytics', 'customers') AND p.action = 'read')
    OR (p.resource = 'company_settings' AND p.action = 'read')
    OR (p.resource = 'payments' AND p.action = 'write')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 種子資料：預設匯率
-- ============================================================================

INSERT INTO exchange_rates (base_currency, target_currency, rate, source) VALUES
  ('USD', 'TWD', 31.50, 'seed'),
  ('EUR', 'TWD', 34.20, 'seed'),
  ('JPY', 'TWD', 0.21, 'seed'),
  ('CNY', 'TWD', 4.35, 'seed'),
  ('GBP', 'TWD', 39.80, 'seed'),
  ('TWD', 'USD', 0.0317, 'seed'),
  ('TWD', 'EUR', 0.0292, 'seed'),
  ('TWD', 'JPY', 4.76, 'seed'),
  ('TWD', 'CNY', 0.23, 'seed'),
  ('TWD', 'GBP', 0.0251, 'seed')
ON CONFLICT (base_currency, target_currency) DO UPDATE SET rate = EXCLUDED.rate;

-- ============================================================================
-- 驗證
-- ============================================================================

SELECT 'Schema and seed data created successfully!' as status;
SELECT 'Roles: ' || COUNT(*) FROM roles;
SELECT 'Permissions: ' || COUNT(*) FROM permissions;
SELECT 'Role Permissions: ' || COUNT(*) FROM role_permissions;
SELECT 'Exchange Rates: ' || COUNT(*) FROM exchange_rates;
