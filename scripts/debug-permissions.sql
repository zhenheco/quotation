-- 檢查 user_permissions 視圖是否存在
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'user_permissions';

-- 檢查視圖定義
SELECT 
  pg_get_viewdef('user_permissions'::regclass, true) as view_definition;

-- 檢查相關表是否存在
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_roles', 'roles', 'role_permissions', 'permissions')
ORDER BY table_name;

-- 檢查是否有任何權限資料
SELECT COUNT(*) as permission_count FROM permissions;
SELECT COUNT(*) as role_count FROM roles;
SELECT COUNT(*) as user_role_count FROM user_roles;
SELECT COUNT(*) as role_permission_count FROM role_permissions;
