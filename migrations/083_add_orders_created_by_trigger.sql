-- ============================================================================
-- Migration 083: 新增 orders 表的 created_by 自動修正觸發器
-- ============================================================================
-- 問題：API 可能傳入 auth.users.id 而非 user_profiles.id
-- 解法：在 INSERT 前自動驗證並轉換 created_by 值
-- ============================================================================

-- 建立觸發器函數
CREATE OR REPLACE FUNCTION fix_orders_created_by()
RETURNS TRIGGER AS $$
DECLARE
  v_valid_profile_id UUID;
BEGIN
  -- 如果 created_by 為 NULL，直接通過
  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- 檢查 created_by 是否是有效的 user_profiles.id
  SELECT id INTO v_valid_profile_id
  FROM user_profiles
  WHERE id = NEW.created_by;

  -- 如果找到，直接通過
  IF v_valid_profile_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 如果找不到，嘗試將 created_by 當作 auth.users.id 查詢
  SELECT id INTO v_valid_profile_id
  FROM user_profiles
  WHERE user_id = NEW.created_by;

  -- 如果找到對應的 user_profiles.id，使用它
  IF v_valid_profile_id IS NOT NULL THEN
    NEW.created_by := v_valid_profile_id;
    RETURN NEW;
  END IF;

  -- 如果都找不到，設為 NULL（避免外鍵約束錯誤）
  NEW.created_by := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 移除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS fix_orders_created_by_trigger ON orders;

-- 建立新觸發器（在 INSERT 前執行）
CREATE TRIGGER fix_orders_created_by_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fix_orders_created_by();

-- 為 UPDATE 也加上相同的保護
DROP TRIGGER IF EXISTS fix_orders_created_by_update_trigger ON orders;
CREATE TRIGGER fix_orders_created_by_update_trigger
  BEFORE UPDATE OF created_by ON orders
  FOR EACH ROW
  WHEN (NEW.created_by IS DISTINCT FROM OLD.created_by)
  EXECUTE FUNCTION fix_orders_created_by();

-- 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('083_add_orders_created_by_trigger.sql')
ON CONFLICT (filename) DO NOTHING;

-- 驗證訊息
DO $$
BEGIN
  RAISE NOTICE 'Migration 083: orders.created_by 觸發器已建立';
END $$;
