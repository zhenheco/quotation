-- ============================================================================
-- 檢查實際的表結構
-- 在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 1. 檢查 customers 表的欄位
SELECT
  'customers' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- 2. 檢查 products 表的欄位
SELECT
  'products' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
ORDER BY ordinal_position;

-- 3. 檢查 RLS 是否啟用
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'products');

-- 4. 檢查現有的 RLS 策略
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('customers', 'products')
ORDER BY tablename, cmd, policyname;
