-- Migration: Add referral_code to user_profiles
-- Date: 2026-01-19
-- Description: 新增推薦碼欄位以支援聯盟行銷系統

-- 新增 referral_code 欄位到 user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) UNIQUE;

-- 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code
ON user_profiles(referral_code);

-- 為現有用戶生成推薦碼（可選，也可以讓用戶首次訪問時生成）
-- UPDATE user_profiles
-- SET referral_code = upper(substring(encode(gen_random_bytes(4), 'base64'), 1, 8))
-- WHERE referral_code IS NULL;

-- 新增註解
COMMENT ON COLUMN user_profiles.referral_code IS '用戶的推薦碼（8碼大寫英數字，用於聯盟行銷系統）';

-- 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('080_add_referral_code_to_user_profiles.sql')
ON CONFLICT (filename) DO NOTHING;
