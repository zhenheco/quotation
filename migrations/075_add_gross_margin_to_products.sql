-- Migration: 075_add_gross_margin_to_products.sql
-- 新增毛利率欄位並更新計算觸發器
--
-- 現有的 profit_margin 是成本加成率 (Markup)：(售價-成本)/成本
-- 新增的 gross_margin 是毛利率 (Gross Margin)：(售價-成本)/售價

-- 1. 新增 gross_margin 欄位
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS gross_margin DECIMAL(5,2);

COMMENT ON COLUMN products.gross_margin IS 'Gross margin percentage - auto-calculated: (base_price - cost_price) / base_price * 100';

-- 2. 更新計算函數，同時計算兩種利潤率
CREATE OR REPLACE FUNCTION calculate_profit_margin()
RETURNS TRIGGER AS $$
BEGIN
  -- 計算成本加成率 (Markup): (售價-成本)/成本
  IF NEW.cost_price IS NOT NULL AND NEW.cost_price > 0 AND NEW.base_price IS NOT NULL THEN
    NEW.profit_margin := ((NEW.base_price - NEW.cost_price) / NEW.cost_price * 100);
  ELSE
    NEW.profit_margin := NULL;
  END IF;

  -- 計算毛利率 (Gross Margin): (售價-成本)/售價
  IF NEW.base_price IS NOT NULL AND NEW.base_price > 0 AND NEW.cost_price IS NOT NULL THEN
    NEW.gross_margin := ((NEW.base_price - NEW.cost_price) / NEW.base_price * 100);
  ELSE
    NEW.gross_margin := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 更新現有資料的 gross_margin
UPDATE products
SET gross_margin = CASE
  WHEN base_price IS NOT NULL AND base_price > 0 AND cost_price IS NOT NULL
  THEN ((base_price - cost_price) / base_price * 100)
  ELSE NULL
END
WHERE gross_margin IS NULL;

-- 4. 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('075_add_gross_margin_to_products.sql')
ON CONFLICT (filename) DO NOTHING;

-- 通知 PostgREST 重新載入 schema
NOTIFY pgrst, 'reload schema';
