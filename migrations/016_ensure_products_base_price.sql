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
