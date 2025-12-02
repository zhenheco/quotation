-- Migration: 030_fix_rpc_email_type.sql
-- 修復 RPC function 的 email 類型不匹配問題
-- auth.users.email 是 VARCHAR(255)，但原函數宣告回傳 TEXT

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
