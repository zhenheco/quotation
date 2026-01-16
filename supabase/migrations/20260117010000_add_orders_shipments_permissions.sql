-- ============================================================================
-- 訂單與出貨單權限設定 - Orders & Shipments Permissions Migration
-- ============================================================================
-- 為訂單和出貨模組建立權限並分配給適當的角色
--
-- 說明：
-- - 新增功能模組時，除了建立資料表和 RLS 政策，還需要在 permissions 表新增權限記錄
-- - 然後將權限分配給相關角色（role_permissions 表）
-- - API middleware (withAuth) 會檢查使用者是否有該權限

-- 1. 新增訂單相關權限
INSERT INTO permissions (name, description, resource, action)
VALUES
  ('orders:read', '查看訂單', 'orders', 'read'),
  ('orders:write', '建立/編輯訂單', 'orders', 'write'),
  ('orders:delete', '刪除訂單', 'orders', 'delete')
ON CONFLICT (name) DO NOTHING;

-- 2. 新增出貨單相關權限
INSERT INTO permissions (name, description, resource, action)
VALUES
  ('shipments:read', '查看出貨單', 'shipments', 'read'),
  ('shipments:write', '建立/編輯出貨單', 'shipments', 'write'),
  ('shipments:delete', '刪除出貨單', 'shipments', 'delete')
ON CONFLICT (name) DO NOTHING;

-- 3. 分配權限給 company_owner（所有權限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'company_owner'
  AND p.name IN ('orders:read', 'orders:write', 'orders:delete',
                 'shipments:read', 'shipments:write', 'shipments:delete')
ON CONFLICT DO NOTHING;

-- 4. 分配權限給 sales_manager（所有權限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_manager'
  AND p.name IN ('orders:read', 'orders:write', 'orders:delete',
                 'shipments:read', 'shipments:write', 'shipments:delete')
ON CONFLICT DO NOTHING;

-- 5. 分配權限給 accountant（只讀權限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'accountant'
  AND p.name IN ('orders:read', 'shipments:read')
ON CONFLICT DO NOTHING;

-- 6. 驗證權限分配
SELECT r.name as role_name, p.name as permission_name
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE p.name LIKE 'orders%' OR p.name LIKE 'shipments%'
ORDER BY r.name, p.name;

-- 完成
SELECT 'Orders and Shipments permissions added successfully!' as status;
