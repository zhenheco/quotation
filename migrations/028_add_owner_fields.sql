-- 028_add_owner_fields.sql
-- 為 quotations 和 customers 表新增 owner_id 欄位
-- 用於實現資料負責人指派功能

-- 為 quotations 表新增 owner_id 欄位
-- 注意：外鍵指向 user_profiles(user_id)，不是 user_profiles(id)
-- 因為 owner_id 存儲的是 auth.users.id，對應 user_profiles.user_id
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES user_profiles(user_id);

-- 為 customers 表新增 owner_id 欄位
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES user_profiles(user_id);

-- 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_quotations_owner_id ON quotations(owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON customers(owner_id);

-- 新增複合索引以支援公司 + 負責人查詢
CREATE INDEX IF NOT EXISTS idx_quotations_company_owner ON quotations(company_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_owner ON customers(company_id, owner_id);

-- 將現有資料的 owner_id 設為 user_id（預設自己負責自己的資料）
UPDATE quotations SET owner_id = user_id WHERE owner_id IS NULL;
UPDATE customers SET owner_id = user_id WHERE owner_id IS NULL;

-- 新增觸發器：當建立新記錄時，如果沒有指定 owner_id，則預設為 user_id
CREATE OR REPLACE FUNCTION set_default_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為 quotations 建立觸發器
DROP TRIGGER IF EXISTS tr_quotations_default_owner ON quotations;
CREATE TRIGGER tr_quotations_default_owner
  BEFORE INSERT ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION set_default_owner();

-- 為 customers 建立觸發器
DROP TRIGGER IF EXISTS tr_customers_default_owner ON customers;
CREATE TRIGGER tr_customers_default_owner
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_default_owner();

-- 新增註解
COMMENT ON COLUMN quotations.owner_id IS '負責此報價單的業務人員 ID';
COMMENT ON COLUMN customers.owner_id IS '負責此客戶的業務人員 ID';
