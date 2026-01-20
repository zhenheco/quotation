-- Migration: 078_fix_nested_bilingual_fields.sql
-- 修復因 API bug 導致的巢狀雙語欄位格式
-- 錯誤格式: { "zh": { "zh": "xxx", "en": "yyy" }, "en": { "zh": "xxx", "en": "yyy" } }
-- 正確格式: { "zh": "xxx", "en": "yyy" }

-- ============================================================================
-- 1. 首先檢查有多少筆損壞的資料
-- ============================================================================

-- 檢查 products 表的 name 欄位
DO $$
DECLARE
  damaged_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO damaged_count
  FROM products
  WHERE jsonb_typeof(name->'zh') = 'object';

  RAISE NOTICE '發現 % 筆 products.name 欄位損壞的資料', damaged_count;
END $$;

-- 檢查 products 表的 description 欄位
DO $$
DECLARE
  damaged_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO damaged_count
  FROM products
  WHERE description IS NOT NULL
    AND jsonb_typeof(description->'zh') = 'object';

  RAISE NOTICE '發現 % 筆 products.description 欄位損壞的資料', damaged_count;
END $$;

-- ============================================================================
-- 2. 修復 products.name 欄位
-- ============================================================================

UPDATE products
SET name = jsonb_build_object(
  'zh', COALESCE(
    -- 嘗試從巢狀結構中取出 zh
    name->'zh'->>'zh',
    -- 如果失敗，嘗試直接取字串
    name->>'zh',
    ''
  ),
  'en', COALESCE(
    -- 嘗試從巢狀結構中取出 en
    name->'zh'->>'en',
    name->'en'->>'en',
    name->>'en',
    ''
  )
)
WHERE jsonb_typeof(name->'zh') = 'object';

-- ============================================================================
-- 3. 修復 products.description 欄位
-- ============================================================================

UPDATE products
SET description = jsonb_build_object(
  'zh', COALESCE(
    description->'zh'->>'zh',
    description->>'zh',
    ''
  ),
  'en', COALESCE(
    description->'zh'->>'en',
    description->'en'->>'en',
    description->>'en',
    ''
  )
)
WHERE description IS NOT NULL
  AND jsonb_typeof(description->'zh') = 'object';

-- ============================================================================
-- 4. 檢查其他可能受影響的表 (customers, quotations 等)
-- ============================================================================

-- 檢查 customers 表
DO $$
DECLARE
  damaged_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO damaged_count
  FROM customers
  WHERE name IS NOT NULL
    AND jsonb_typeof(name) = 'object'
    AND jsonb_typeof(name->'zh') = 'object';

  IF damaged_count > 0 THEN
    RAISE NOTICE '發現 % 筆 customers.name 欄位損壞的資料', damaged_count;
  END IF;
END $$;

-- 修復 customers.name (如果有)
UPDATE customers
SET name = jsonb_build_object(
  'zh', COALESCE(name->'zh'->>'zh', name->>'zh', ''),
  'en', COALESCE(name->'zh'->>'en', name->'en'->>'en', name->>'en', '')
)
WHERE name IS NOT NULL
  AND jsonb_typeof(name) = 'object'
  AND jsonb_typeof(name->'zh') = 'object';

-- ============================================================================
-- 5. 驗證修復結果
-- ============================================================================

DO $$
DECLARE
  remaining_products INTEGER;
  remaining_customers INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_products
  FROM products
  WHERE jsonb_typeof(name->'zh') = 'object';

  SELECT COUNT(*) INTO remaining_customers
  FROM customers
  WHERE name IS NOT NULL
    AND jsonb_typeof(name) = 'object'
    AND jsonb_typeof(name->'zh') = 'object';

  IF remaining_products = 0 AND remaining_customers = 0 THEN
    RAISE NOTICE '✅ 所有損壞的雙語欄位已修復完成';
  ELSE
    RAISE WARNING '⚠️ 仍有 % 筆 products 和 % 筆 customers 資料未修復',
      remaining_products, remaining_customers;
  END IF;
END $$;
