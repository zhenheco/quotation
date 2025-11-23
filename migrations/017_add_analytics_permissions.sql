-- ============================================================================
-- 新增 Analytics 權限
-- ============================================================================
-- 說明：新增儀表板分析權限並分配給需要查看報表的角色
-- 日期：2025-11-13
-- ============================================================================

-- 插入 analytics 權限
INSERT INTO permissions (resource, action, name, description) VALUES
  ('analytics', 'read', 'analytics:read', 'View dashboard analytics and reports')
ON CONFLICT (resource, action) DO NOTHING;

-- 授予以下角色 analytics:read 權限：
-- - super_admin: 總管理員需要查看所有分析數據
-- - company_owner: 公司負責人需要查看公司營運數據
-- - sales_manager: 業務主管需要查看團隊績效和營收趨勢
-- - accountant: 會計需要查看財務統計和收款數據
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  roles.id,
  permissions.id
FROM roles, permissions
WHERE roles.name IN ('super_admin', 'company_owner', 'sales_manager', 'accountant')
  AND permissions.resource = 'analytics'
  AND permissions.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 完成
-- ============================================================================
SELECT 'Analytics permissions added successfully!' as status;
