-- ============================================================================
-- 修復訂單與出貨單權限 - Fix Orders & Shipments Permissions
-- ============================================================================
-- 執行此腳本以修復 403 Forbidden 問題
--
-- 問題：訂單管理和出貨管理頁面顯示 Forbidden
-- 原因：permissions 和 role_permissions 表缺少對應記錄
-- ============================================================================

-- 1. 首先檢查現有權限
DO $$
BEGIN
  RAISE NOTICE '=== 檢查現有權限 ===';
END $$;

SELECT name, description FROM permissions WHERE name LIKE 'orders%' OR name LIKE 'shipments%';

-- 2. 新增訂單相關權限（如果不存在）
INSERT INTO permissions (id, name, description, resource, action, created_at)
VALUES
  (gen_random_uuid(), 'orders:read', '查看訂單', 'orders', 'read', NOW()),
  (gen_random_uuid(), 'orders:write', '建立/編輯訂單', 'orders', 'write', NOW()),
  (gen_random_uuid(), 'orders:delete', '刪除訂單', 'orders', 'delete', NOW())
ON CONFLICT (name) DO NOTHING;

-- 3. 新增出貨單相關權限（如果不存在）
INSERT INTO permissions (id, name, description, resource, action, created_at)
VALUES
  (gen_random_uuid(), 'shipments:read', '查看出貨單', 'shipments', 'read', NOW()),
  (gen_random_uuid(), 'shipments:write', '建立/編輯出貨單', 'shipments', 'write', NOW()),
  (gen_random_uuid(), 'shipments:delete', '刪除出貨單', 'shipments', 'delete', NOW())
ON CONFLICT (name) DO NOTHING;

-- 4. 分配權限給 company_owner（所有權限）
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'company_owner'
  AND p.name IN ('orders:read', 'orders:write', 'orders:delete',
                 'shipments:read', 'shipments:write', 'shipments:delete')
ON CONFLICT DO NOTHING;

-- 5. 分配權限給 sales_manager（所有權限）
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'sales_manager'
  AND p.name IN ('orders:read', 'orders:write', 'orders:delete',
                 'shipments:read', 'shipments:write', 'shipments:delete')
ON CONFLICT DO NOTHING;

-- 6. 分配權限給 accountant（只讀權限）
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'accountant'
  AND p.name IN ('orders:read', 'shipments:read')
ON CONFLICT DO NOTHING;

-- 7. 分配權限給 super_admin（所有權限）
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'super_admin'
  AND p.name IN ('orders:read', 'orders:write', 'orders:delete',
                 'shipments:read', 'shipments:write', 'shipments:delete')
ON CONFLICT DO NOTHING;

-- 8. 驗證權限分配結果
DO $$
BEGIN
  RAISE NOTICE '=== 驗證權限分配結果 ===';
END $$;

SELECT r.name as role_name, p.name as permission_name
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE p.name LIKE 'orders%' OR p.name LIKE 'shipments%'
ORDER BY r.name, p.name;

-- 完成
SELECT 'Orders and Shipments permissions fix completed!' as status;
