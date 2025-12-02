-- Migration: 032_complete_fix.sql
-- 完整修復團隊成員顯示問題
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案

-- ============================================
-- 第一步：修復 RPC 函數（修正 email 類型）
-- ============================================
CREATE OR REPLACE FUNCTION get_auth_users_metadata(user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  email VARCHAR(255),
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id as user_id,
    au.email,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      split_part(au.email::text, '@', 1)
    )::TEXT as full_name,
    COALESCE(
      au.raw_user_meta_data->>'avatar_url',
      au.raw_user_meta_data->>'picture',
      NULL
    )::TEXT as avatar_url
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION get_auth_users_metadata(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_users_metadata(UUID[]) TO service_role;

-- ============================================
-- 第二步：補建 user_profiles 資料
-- ============================================
INSERT INTO user_profiles (user_id, email, full_name, display_name, avatar_url, updated_at)
SELECT
  id as user_id,
  email,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  ) as full_name,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  ) as display_name,
  COALESCE(
    raw_user_meta_data->>'avatar_url',
    raw_user_meta_data->>'picture'
  ) as avatar_url,
  NOW() as updated_at
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW();

-- ============================================
-- 第三步：設定 RLS 策略
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 刪除舊策略（如存在）
DROP POLICY IF EXISTS "Users can view company members profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON user_profiles;

-- 用戶可讀取同公司成員的 profile 或自己的 profile
CREATE POLICY "Users can view company members profiles"
ON user_profiles FOR SELECT
USING (
  user_id IN (
    SELECT cm.user_id FROM company_members cm
    WHERE cm.company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  )
  OR user_id = auth.uid()
);

-- 用戶可更新自己的 profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (user_id = auth.uid());

-- 用戶可插入自己的 profile
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Service role 完全存取
CREATE POLICY "Service role full access"
ON user_profiles FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- 驗證結果
-- ============================================
SELECT
  up.user_id,
  up.email,
  up.full_name,
  cm.company_id
FROM user_profiles up
JOIN company_members cm ON cm.user_id = up.user_id
WHERE cm.is_active = true;
