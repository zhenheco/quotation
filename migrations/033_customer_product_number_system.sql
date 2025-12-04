-- Migration: 客戶和商品編號系統
-- 問題：customer_number 和 product_number 欄位在程式碼中被引用但資料庫中不存在
-- 解決：建立欄位、複合唯一約束、序列表和原子性編號生成函數

-- ============================================================================
-- Part 1: 客戶編號系統
-- ============================================================================

-- 1.1 新增 customer_number 欄位
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_number VARCHAR(20);

-- 1.2 建立複合唯一約束 (company_id + customer_number)
-- 每個公司有獨立的編號命名空間
ALTER TABLE customers
  ADD CONSTRAINT customers_company_number_unique
  UNIQUE(company_id, customer_number);

-- 1.3 建立客戶編號序列表
CREATE TABLE IF NOT EXISTS customer_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year_month VARCHAR(6) NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT customer_number_sequences_company_year_month_key UNIQUE(company_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_customer_sequences_company_month
  ON customer_number_sequences(company_id, year_month);

-- 1.4 原子性客戶編號生成函數
CREATE OR REPLACE FUNCTION generate_customer_number_atomic(p_company_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_year_month VARCHAR(6);
  v_next_seq INTEGER;
  v_lock_key BIGINT;
BEGIN
  v_year_month := TO_CHAR(NOW(), 'YYYYMM');
  v_lock_key := hashtext('CUS' || p_company_id::TEXT || v_year_month)::BIGINT;

  -- Advisory Lock（交易結束時自動釋放）
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 原子性 UPSERT：確保只有一個交易能更新序列
  INSERT INTO customer_number_sequences (company_id, year_month, last_sequence)
  VALUES (p_company_id, v_year_month, 1)
  ON CONFLICT (company_id, year_month)
  DO UPDATE SET
    last_sequence = customer_number_sequences.last_sequence + 1,
    updated_at = NOW()
  RETURNING last_sequence INTO v_next_seq;

  RETURN 'CUS' || v_year_month || '-' || LPAD(v_next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Part 2: 商品編號系統
-- ============================================================================

-- 2.1 新增 product_number 欄位
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_number VARCHAR(20);

-- 2.2 建立複合唯一約束 (company_id + product_number)
ALTER TABLE products
  ADD CONSTRAINT products_company_number_unique
  UNIQUE(company_id, product_number);

-- 2.3 建立商品編號序列表
CREATE TABLE IF NOT EXISTS product_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year_month VARCHAR(6) NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT product_number_sequences_company_year_month_key UNIQUE(company_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_product_sequences_company_month
  ON product_number_sequences(company_id, year_month);

-- 2.4 原子性商品編號生成函數
CREATE OR REPLACE FUNCTION generate_product_number_atomic(p_company_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_year_month VARCHAR(6);
  v_next_seq INTEGER;
  v_lock_key BIGINT;
BEGIN
  v_year_month := TO_CHAR(NOW(), 'YYYYMM');
  v_lock_key := hashtext('PRD' || p_company_id::TEXT || v_year_month)::BIGINT;

  -- Advisory Lock（交易結束時自動釋放）
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 原子性 UPSERT：確保只有一個交易能更新序列
  INSERT INTO product_number_sequences (company_id, year_month, last_sequence)
  VALUES (p_company_id, v_year_month, 1)
  ON CONFLICT (company_id, year_month)
  DO UPDATE SET
    last_sequence = product_number_sequences.last_sequence + 1,
    updated_at = NOW()
  RETURNING last_sequence INTO v_next_seq;

  RETURN 'PRD' || v_year_month || '-' || LPAD(v_next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Part 3: 回填現有資料
-- ============================================================================

-- 3.1 為現有客戶生成編號
WITH numbered_customers AS (
  SELECT id, company_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at) as seq
  FROM customers
  WHERE customer_number IS NULL AND company_id IS NOT NULL
)
UPDATE customers c
SET customer_number = 'CUS' || TO_CHAR(nc.created_at, 'YYYYMM') || '-' || LPAD(nc.seq::TEXT, 4, '0')
FROM numbered_customers nc
WHERE c.id = nc.id;

-- 3.2 為現有商品生成編號
WITH numbered_products AS (
  SELECT id, company_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at) as seq
  FROM products
  WHERE product_number IS NULL AND company_id IS NOT NULL
)
UPDATE products p
SET product_number = 'PRD' || TO_CHAR(np.created_at, 'YYYYMM') || '-' || LPAD(np.seq::TEXT, 4, '0')
FROM numbered_products np
WHERE p.id = np.id;

-- 3.3 從現有客戶初始化序列表
INSERT INTO customer_number_sequences (company_id, year_month, last_sequence)
SELECT
  company_id,
  SUBSTRING(customer_number FROM 4 FOR 6) AS year_month,
  MAX(CAST(SUBSTRING(customer_number FROM 11) AS INTEGER)) AS last_sequence
FROM customers
WHERE customer_number ~ '^CUS[0-9]{6}-[0-9]{4}$'
  AND company_id IS NOT NULL
GROUP BY company_id, SUBSTRING(customer_number FROM 4 FOR 6)
ON CONFLICT (company_id, year_month)
DO UPDATE SET last_sequence = GREATEST(
  customer_number_sequences.last_sequence, EXCLUDED.last_sequence
);

-- 3.4 從現有商品初始化序列表
INSERT INTO product_number_sequences (company_id, year_month, last_sequence)
SELECT
  company_id,
  SUBSTRING(product_number FROM 4 FOR 6) AS year_month,
  MAX(CAST(SUBSTRING(product_number FROM 11) AS INTEGER)) AS last_sequence
FROM products
WHERE product_number ~ '^PRD[0-9]{6}-[0-9]{4}$'
  AND company_id IS NOT NULL
GROUP BY company_id, SUBSTRING(product_number FROM 4 FOR 6)
ON CONFLICT (company_id, year_month)
DO UPDATE SET last_sequence = GREATEST(
  product_number_sequences.last_sequence, EXCLUDED.last_sequence
);
