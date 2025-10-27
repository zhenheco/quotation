-- ============================================================================
-- 修復 RLS 策略
-- 在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 先刪除現有的策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;

DROP POLICY IF EXISTS "Users can view their own products" ON products;
DROP POLICY IF EXISTS "Users can insert their own products" ON products;
DROP POLICY IF EXISTS "Users can update their own products" ON products;
DROP POLICY IF EXISTS "Users can delete their own products" ON products;

-- 重新建立 customers 的策略
CREATE POLICY "Users can view their own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
  ON customers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 重新建立 products 的策略
CREATE POLICY "Users can view their own products"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 驗證策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('customers', 'products')
ORDER BY tablename, policyname;
