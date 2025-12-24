-- ============================================================================
-- Migration: 052_harden_function_security.sql
-- Created: 2025-12-24
-- Description: 強化 SECURITY DEFINER 函數的安全性
--
-- 問題：
-- 1. 所有 27 個 SECURITY DEFINER 函數都可被 anon 角色執行
-- 2. get_auth_users_metadata 沒有認證檢查，可洩漏用戶資料
-- 3. verify_user_pin 沒有認證檢查，可被暴力破解攻擊
--
-- 解決方案：
-- 1. 撤銷 anon 對非必要函數的執行權限
-- 2. 修改敏感函數加入認證檢查
-- ============================================================================

-- ============================================================================
-- 1. 保留 anon 執行權限的函數（用於 RLS 政策）
-- ============================================================================
-- 以下函數被 RLS 政策使用，必須保留 anon 執行權限：
-- - can_access_company_rls
-- - can_access_tenant_rls
-- - get_user_company_ids
-- - is_company_owner
-- - is_super_admin

-- ============================================================================
-- 2. 撤銷敏感函數的 PUBLIC 權限，只授予給 authenticated 和 service_role
-- ============================================================================
-- 注意：PostgreSQL 預設將 EXECUTE 權限授予 PUBLIC 角色
-- 必須先撤銷 PUBLIC 權限，再授予給特定角色

-- get_auth_users_metadata - 查詢用戶資料
REVOKE EXECUTE ON FUNCTION get_auth_users_metadata(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_auth_users_metadata(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_users_metadata(UUID[]) TO service_role;

-- verify_user_pin - 驗證用戶 PIN
REVOKE EXECUTE ON FUNCTION verify_user_pin(UUID, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_user_pin(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_user_pin(UUID, VARCHAR) TO service_role;

-- ============================================================================
-- 3. 修改 get_auth_users_metadata 加入認證和授權檢查
-- ============================================================================

CREATE OR REPLACE FUNCTION get_auth_users_metadata(user_ids uuid[])
RETURNS TABLE(user_id uuid, email varchar, full_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- 認證檢查
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 授權檢查：只能查詢同公司的用戶
  -- 透過 company_members 表驗證
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
  WHERE au.id = ANY(user_ids)
  AND (
    -- 可以查詢自己
    au.id = current_user_id
    -- 或者同公司的成員
    OR EXISTS (
      SELECT 1 FROM company_members cm1
      JOIN company_members cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = current_user_id
      AND cm2.user_id = au.id
    )
    -- 或者是超級管理員
    OR is_super_admin()
  );
END;
$$;

-- ============================================================================
-- 4. 修改 verify_user_pin 加入認證檢查
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_user_pin(p_user_id uuid, p_pin varchar)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pin_record RECORD;
  v_is_valid BOOLEAN;
  current_user_id uuid;
BEGIN
  -- 認證檢查：必須登入
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 授權檢查：只能驗證自己的 PIN
  IF p_user_id != current_user_id THEN
    RAISE EXCEPTION 'Cannot verify PIN for other users';
  END IF;

  SELECT * INTO v_pin_record
  FROM user_pins
  WHERE user_id = p_user_id;

  IF v_pin_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 檢查是否鎖定
  IF v_pin_record.locked_until IS NOT NULL AND v_pin_record.locked_until > NOW() THEN
    RETURN FALSE;
  END IF;

  -- 使用 pgcrypto 驗證（假設 bcrypt）
  v_is_valid := (v_pin_record.pin_hash = crypt(p_pin, v_pin_record.pin_hash));

  IF v_is_valid THEN
    -- 重置失敗次數
    UPDATE user_pins
    SET failed_attempts = 0,
        locked_until = NULL,
        last_used_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- 增加失敗次數
    UPDATE user_pins
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE
          WHEN failed_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
          ELSE NULL
        END
    WHERE user_id = p_user_id;
  END IF;

  RETURN v_is_valid;
END;
$$;

-- ============================================================================
-- 5. 記錄遷移
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('052_harden_function_security.sql')
ON CONFLICT (filename) DO NOTHING;

-- 刷新 Schema Cache
NOTIFY pgrst, 'reload schema';

SELECT 'Function security hardened! Restricted 2 sensitive functions to authenticated users only.' as status;
