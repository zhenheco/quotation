-- ============================================================================
-- 檢查 Migration 預設資料插入狀態
-- 請在 Supabase Dashboard SQL Editor 執行此腳本
-- ============================================================================

-- 1. 檢查 roles 表的資料
SELECT
  '1. ROLES 資料檢查' as check_category,
  COUNT(*) as total_rows
FROM roles;

-- 顯示所有 roles
SELECT
  '1a. ROLES 詳細資料' as category,
  name,
  name_zh,
  level,
  description
FROM roles
ORDER BY level;

-- 2. 檢查 permissions 表的資料
SELECT
  '2. PERMISSIONS 資料檢查' as check_category,
  COUNT(*) as total_rows
FROM permissions;

-- 顯示 permissions 範例（前 10 筆）
SELECT
  '2a. PERMISSIONS 範例' as category,
  name,
  name_zh,
  category,
  description
FROM permissions
ORDER BY id
LIMIT 10;

-- 3. 檢查 role_permissions 對應
SELECT
  '3. ROLE_PERMISSIONS 對應檢查' as check_category,
  COUNT(*) as total_mappings
FROM role_permissions;

-- 顯示每個角色的權限數量
SELECT
  '3a. 每個角色的權限數量' as category,
  r.name as role_name,
  r.name_zh as role_name_zh,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.name_zh
ORDER BY r.level;

-- 4. 檢查所有表是否存在
SELECT
  '4. 表存在性檢查' as category,
  table_name,
  CASE
    WHEN table_name IN (
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    ) THEN '✅ 存在'
    ELSE '❌ 不存在'
  END as status
FROM (
  VALUES
    ('roles'),
    ('permissions'),
    ('role_permissions'),
    ('user_roles'),
    ('user_profiles'),
    ('companies'),
    ('company_members'),
    ('company_settings'),
    ('customer_contracts'),
    ('payments'),
    ('payment_schedules'),
    ('audit_logs'),
    ('quotation_shares'),
    ('quotation_versions')
) AS expected_tables(table_name)
ORDER BY table_name;

-- 5. 檢查 RLS 狀態
SELECT
  '5. RLS 政策狀態' as category,
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 6. 檢查觸發器狀態
SELECT
  '6. 觸發器狀態' as category,
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname LIKE 'trigger_%'
  AND tgrelid::regclass::text LIKE 'public.%'
ORDER BY tgname;

-- 7. 檢查索引數量
SELECT
  '7. 索引檢查' as category,
  schemaname,
  COUNT(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY schemaname;

-- 8. 檢查外鍵數量
SELECT
  '8. 外鍵檢查' as category,
  table_schema,
  COUNT(*) as total_foreign_keys
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type = 'FOREIGN KEY'
GROUP BY table_schema;

-- ============================================================================
-- 預期結果：
-- 1. roles: 應該有 5 筆資料
-- 2. permissions: 應該有 21 筆資料
-- 3. role_permissions: 應該有 21+ 筆對應
-- 4. 所有 14 個表都應該存在
-- 5. RLS 政策應該已啟用
-- 6. 觸發器應該已建立
-- ============================================================================
