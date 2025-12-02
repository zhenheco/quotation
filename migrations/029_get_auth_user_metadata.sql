-- Migration: 029_get_auth_user_metadata.sql
-- 建立 RPC function 從 auth.users 獲取用戶 metadata
-- 用於顯示團隊成員的 email、名稱和頭像

CREATE OR REPLACE FUNCTION get_auth_users_metadata(user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  email TEXT,
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
      ''
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

-- 授權給 authenticated 和 service_role 使用
GRANT EXECUTE ON FUNCTION get_auth_users_metadata(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_users_metadata(UUID[]) TO service_role;
