-- ============================================================================
-- 修復 RBAC 相關表的 RLS 策略
-- 在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- ============================================================================
-- STEP 1: 刪除現有的不完整策略
-- ============================================================================

-- Roles table
DROP POLICY IF EXISTS "Authenticated users can read roles" ON roles;

-- Permissions table
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON permissions;

-- Role permissions table
DROP POLICY IF EXISTS "Authenticated users can read role_permissions" ON role_permissions;

-- User profiles table
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- ============================================================================
-- STEP 2: 建立完整的 RLS 策略
-- ============================================================================

-- ============================================================================
-- Roles 表策略（角色管理 - 所有已登入使用者可完整操作）
-- ============================================================================

CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete roles"
  ON roles FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- Permissions 表策略（權限管理 - 所有已登入使用者可完整操作）
-- ============================================================================

CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete permissions"
  ON permissions FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- Role_Permissions 表策略（角色權限關聯 - 所有已登入使用者可完整操作）
-- ============================================================================

CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert role permissions"
  ON role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update role permissions"
  ON role_permissions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete role permissions"
  ON role_permissions FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- User_Profiles 表策略（使用者資料 - 使用者只能操作自己的資料）
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- User_Roles 表策略（使用者角色 - 所有已登入使用者可完整操作）
-- ============================================================================

CREATE POLICY "Authenticated users can view user roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert user roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update user roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete user roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- STEP 3: 驗證策略
-- ============================================================================

-- 檢查所有策略
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('roles', 'permissions', 'role_permissions', 'user_profiles', 'user_roles')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- 預期結果：
-- roles: 4 個策略 (SELECT, INSERT, UPDATE, DELETE)
-- permissions: 4 個策略 (SELECT, INSERT, UPDATE, DELETE)
-- role_permissions: 4 個策略 (SELECT, INSERT, UPDATE, DELETE)
-- user_profiles: 4 個策略 (SELECT, INSERT, UPDATE, DELETE)
-- user_roles: 4 個策略 (SELECT, INSERT, UPDATE, DELETE)
-- ============================================================================
