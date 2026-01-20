-- ========================================
-- 手動執行 SQL Migration
-- 請在 Supabase Dashboard 的 SQL Editor 中執行
-- ========================================

-- 步驟 1: 新增 referral_code 欄位
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) UNIQUE;

-- 步驟 2: 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code
ON user_profiles(referral_code);

-- 步驟 3: 新增欄位註解
COMMENT ON COLUMN user_profiles.referral_code IS '用戶的推薦碼（8碼大寫英數字，用於聯盟行銷系統）';

-- 步驟 4: 驗證欄位是否成功建立
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name = 'referral_code';
