-- ============================================================================
-- 建立測試使用者
-- 在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 使用 Supabase Auth 的內建函數建立使用者
-- 這會自動處理密碼加密和所有必要的設定

-- 方法：使用 Supabase 的 auth.users 插入功能

-- 注意：需要在 Supabase Dashboard > SQL Editor 執行此腳本
-- 因為需要管理員權限來操作 auth schema

-- 建立測試使用者 (已自動確認 Email)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  confirmation_token,
  recovery_token,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  now(),
  '',
  '',
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"測試使用者"}'
)
ON CONFLICT (email) DO NOTHING;

-- 驗證使用者已建立
SELECT
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'test@example.com';
