# 資料庫 Migration 執行指南

## 問題

產品價格無法更新，因為資料庫欄位名稱不一致：
- 資料庫使用：`unit_price`, `currency`
- 程式碼使用：`base_price`, `base_currency`

## 解決方案

執行 migration 將資料庫欄位重命名。

## 執行步驟

### 方法 1：使用 Supabase Dashboard（推薦）

1. 打開 Supabase Dashboard
   - 前往：https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby

2. 點選左側選單的 **SQL Editor**

3. 點選 **New Query**

4. 複製以下 SQL 並貼上：

```sql
-- Migration: Ensure products table has base_price and base_currency columns
-- This migration handles cases where the table might have unit_price instead

-- Check and rename unit_price to base_price if needed
DO $$
BEGIN
    -- Check if unit_price exists and base_price doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'unit_price'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'base_price'
    ) THEN
        -- Rename unit_price to base_price
        ALTER TABLE products RENAME COLUMN unit_price TO base_price;
        RAISE NOTICE 'Renamed unit_price to base_price';
    END IF;

    -- Check if currency exists and base_currency doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'currency'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'base_currency'
    ) THEN
        -- Rename currency to base_currency
        ALTER TABLE products RENAME COLUMN currency TO base_currency;
        RAISE NOTICE 'Renamed currency to base_currency';
    END IF;

    -- If base_price doesn't exist at all, create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'base_price'
    ) THEN
        ALTER TABLE products ADD COLUMN base_price DECIMAL(12, 2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Created base_price column';
    END IF;

    -- If base_currency doesn't exist at all, create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'base_currency'
    ) THEN
        ALTER TABLE products ADD COLUMN base_currency VARCHAR(3) NOT NULL DEFAULT 'TWD';
        RAISE NOTICE 'Created base_currency column';
    END IF;
END $$;

-- Update the profit margin trigger to use base_price
CREATE OR REPLACE FUNCTION calculate_profit_margin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cost_price IS NOT NULL AND NEW.cost_price > 0 AND NEW.base_price IS NOT NULL THEN
    NEW.profit_margin := ((NEW.base_price - NEW.cost_price) / NEW.cost_price * 100);
  ELSE
    NEW.profit_margin := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_calculate_profit_margin ON products;
CREATE TRIGGER trigger_calculate_profit_margin
BEFORE INSERT OR UPDATE OF cost_price, base_price ON products
FOR EACH ROW
EXECUTE FUNCTION calculate_profit_margin();

-- Verify the changes
DO $$
DECLARE
    has_base_price BOOLEAN;
    has_base_currency BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'base_price'
    ) INTO has_base_price;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'base_currency'
    ) INTO has_base_currency;

    IF has_base_price AND has_base_currency THEN
        RAISE NOTICE 'Migration successful: base_price and base_currency columns exist';
    ELSE
        RAISE EXCEPTION 'Migration failed: missing required columns';
    END IF;
END $$;
```

5. 點選 **Run** 按鈕執行

6. 確認出現成功訊息：
   ```
   Migration successful: base_price and base_currency columns exist
   ```

### 方法 2：驗證 Migration 結果

執行以下腳本檢查欄位是否正確更新：

```bash
npx tsx scripts/check-products-schema.ts
```

預期輸出：
```
✅ 資料庫結構正確！
💡 欄位檢查：
   - base_price: ✅ 存在
   - base_currency: ✅ 存在
   - unit_price: ✅ 已移除
   - currency: ✅ 已移除
```

## 完成後

1. 重新部署應用程式：
   ```bash
   pnpm run deploy:cf
   ```

2. 測試產品價格更新功能：
   - 建立新產品
   - 編輯現有產品價格
   - 確認價格正確儲存

## 問題排查

如果 migration 失敗，檢查：

1. **權限問題**：確認你使用的是 Service Role Key
2. **連線問題**：確認 Supabase 專案可以訪問
3. **欄位衝突**：檢查是否已有 `base_price` 欄位但格式不同

如需協助，請查看 migrations/016_ensure_products_base_price.sql 檔案。
