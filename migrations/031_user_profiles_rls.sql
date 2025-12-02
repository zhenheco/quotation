-- Migration: 031_user_profiles_rls.sql
-- 為 user_profiles 表新增 RLS 策略

-- 啟用 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

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
