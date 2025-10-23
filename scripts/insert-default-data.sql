-- ============================================================================
-- 補充插入預設資料
-- 此腳本僅包含預設資料的插入語句
-- 請在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 清除現有資料（如果需要重新插入）
-- TRUNCATE role_permissions CASCADE;
-- TRUNCATE permissions CASCADE;
-- TRUNCATE roles CASCADE;

-- ============================================================================
-- 1. 插入預設角色 (5 個)
-- ============================================================================
INSERT INTO roles (name, name_zh, name_en, level, description) VALUES
  ('super_admin', '總管理員', 'Super Admin', 1, 'Full system access'),
  ('company_owner', '公司負責人', 'Company Owner', 2, 'Company-wide management'),
  ('sales_manager', '業務主管', 'Sales Manager', 3, 'Sales team management'),
  ('salesperson', '業務人員', 'Salesperson', 4, 'Sales operations'),
  ('accountant', '會計', 'Accountant', 5, 'Financial operations')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. 插入預設權限 (21 個)
-- ============================================================================
INSERT INTO permissions (name, name_zh, name_en, category, description) VALUES
  -- 客戶管理權限 (4)
  ('view_customers', '查看客戶', 'View Customers', 'customer_management', 'View customer list and details'),
  ('create_customers', '建立客戶', 'Create Customers', 'customer_management', 'Create new customers'),
  ('edit_customers', '編輯客戶', 'Edit Customers', 'customer_management', 'Edit customer information'),
  ('delete_customers', '刪除客戶', 'Delete Customers', 'customer_management', 'Delete customers'),

  -- 產品管理權限 (4)
  ('view_products', '查看產品', 'View Products', 'product_management', 'View product list'),
  ('create_products', '建立產品', 'Create Products', 'product_management', 'Create new products'),
  ('edit_products', '編輯產品', 'Edit Products', 'product_management', 'Edit product information'),
  ('delete_products', '刪除產品', 'Delete Products', 'product_management', 'Delete products'),

  -- 報價單管理權限 (4)
  ('view_quotations', '查看報價單', 'View Quotations', 'quotation_management', 'View quotation list'),
  ('create_quotations', '建立報價單', 'Create Quotations', 'quotation_management', 'Create new quotations'),
  ('edit_quotations', '編輯報價單', 'Edit Quotations', 'quotation_management', 'Edit quotation information'),
  ('delete_quotations', '刪除報價單', 'Delete Quotations', 'quotation_management', 'Delete quotations'),

  -- 財務管理權限 (4)
  ('view_payments', '查看收款', 'View Payments', 'financial_management', 'View payment records'),
  ('create_payments', '建立收款', 'Create Payments', 'financial_management', 'Record new payments'),
  ('edit_payments', '編輯收款', 'Edit Payments', 'financial_management', 'Edit payment information'),
  ('delete_payments', '刪除收款', 'Delete Payments', 'financial_management', 'Delete payment records'),

  -- 系統管理權限 (5)
  ('manage_users', '管理使用者', 'Manage Users', 'system_management', 'Manage user accounts'),
  ('manage_roles', '管理角色', 'Manage Roles', 'system_management', 'Manage roles and permissions'),
  ('manage_company', '管理公司', 'Manage Company', 'system_management', 'Manage company settings'),
  ('view_reports', '查看報表', 'View Reports', 'system_management', 'View system reports'),
  ('view_audit_logs', '查看審計日誌', 'View Audit Logs', 'system_management', 'View audit logs')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. 設定角色權限對應 (21 個映射)
-- ============================================================================

-- 3.1 總管理員 (super_admin) - 所有權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'super_admin'),
  id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3.2 公司負責人 (company_owner) - 所有權限（與總管理員相同）
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'company_owner'),
  id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3.3 業務主管 (sales_manager) - 除了系統管理外的所有權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'sales_manager'),
  id
FROM permissions
WHERE category IN ('customer_management', 'product_management', 'quotation_management', 'financial_management')
   OR name IN ('view_reports')  -- 可以查看報表
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3.4 業務人員 (salesperson) - 基本業務操作權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'salesperson'),
  id
FROM permissions
WHERE name IN (
  -- 客戶管理
  'view_customers', 'create_customers', 'edit_customers',
  -- 產品管理
  'view_products',
  -- 報價單管理
  'view_quotations', 'create_quotations', 'edit_quotations',
  -- 財務管理（僅查看）
  'view_payments'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3.5 會計 (accountant) - 財務相關權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'accountant'),
  id
FROM permissions
WHERE category = 'financial_management'
   OR name IN ('view_customers', 'view_quotations', 'view_reports')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 驗證插入結果
-- ============================================================================

-- 檢查 roles
SELECT '✅ ROLES 資料' as category, COUNT(*) as count FROM roles;
SELECT name, name_zh, level FROM roles ORDER BY level;

-- 檢查 permissions
SELECT '✅ PERMISSIONS 資料' as category, COUNT(*) as count FROM permissions;

-- 檢查 role_permissions 對應
SELECT '✅ ROLE_PERMISSIONS 對應' as category, COUNT(*) as count FROM role_permissions;

-- 每個角色的權限數量
SELECT
  r.name as role_name,
  r.name_zh as role_name_zh,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.name_zh
ORDER BY r.level;

-- ============================================================================
-- 完成！
-- 預期結果：
-- - roles: 5 筆
-- - permissions: 21 筆
-- - role_permissions: 約 80+ 筆（super_admin 和 company_owner 各 21，其他角色較少）
-- ============================================================================
