-- ============================================================================
-- 補充角色權限關聯資料
-- ============================================================================
-- 問題：001_initial_schema.sql 建立了 role_permissions 表但沒有插入資料
-- 此 migration 為所有角色分配適當的權限
-- ============================================================================

-- Super Admin: 所有權限
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT
  'rp-super-admin-' || p.id,
  'role-super-admin',
  p.id
FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Company Owner: 所有權限（包含使用者管理）
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT
  'rp-company-owner-' || p.id,
  'role-company-owner',
  p.id
FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Sales Manager: 業務相關權限（讀寫）+ 公司設定（讀）
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT
  'rp-sales-manager-' || p.id,
  'role-sales-manager',
  p.id
FROM permissions p
WHERE (p.resource IN ('products', 'customers', 'quotations', 'contracts', 'payments', 'analytics')
  AND p.action IN ('read', 'write'))
  OR (p.resource = 'company_settings' AND p.action = 'read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Salesperson: 基本業務權限
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT
  'rp-salesperson-' || p.id,
  'role-salesperson',
  p.id
FROM permissions p
WHERE (p.resource IN ('products', 'customers', 'quotations') AND p.action IN ('read', 'write'))
  OR (p.resource = 'company_settings' AND p.action = 'read')
  OR (p.resource = 'analytics' AND p.action = 'read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Accountant: 財務相關權限
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT
  'rp-accountant-' || p.id,
  'role-accountant',
  p.id
FROM permissions p
WHERE (p.resource IN ('payments', 'contracts', 'quotations', 'analytics', 'customers') AND p.action = 'read')
  OR (p.resource = 'company_settings' AND p.action = 'read')
  OR (p.resource = 'payments' AND p.action = 'write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================
SELECT 'Role permissions seeded successfully!' as status;
SELECT r.name as role, COUNT(*) as permission_count
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
GROUP BY r.name;
