-- ============================================================================
-- 客戶新增欄位：次要聯絡人與引薦人
-- ============================================================================
-- 新增 secondary_contact 和 referrer 兩個 JSONB 欄位
-- 結構: { name, phone, email, title, notes }

-- 1. 新增次要聯絡人欄位
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS secondary_contact JSONB DEFAULT NULL;

COMMENT ON COLUMN customers.secondary_contact IS '次要聯絡人: { name, phone, email, title, notes }';

-- 2. 新增引薦人欄位
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS referrer JSONB DEFAULT NULL;

COMMENT ON COLUMN customers.referrer IS '引薦人: { name, phone, email, title, notes }';

-- 3. 驗證欄位已新增
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
  AND column_name IN ('secondary_contact', 'referrer');

-- 完成
SELECT 'Customer contact fields added successfully!' as status;
