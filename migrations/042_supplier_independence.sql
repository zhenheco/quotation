-- ============================================================================
-- Migration: 042_supplier_independence.sql
-- Created: 2025-12-15
-- Description: 建立獨立供應商表，重構 product_supplier_costs 關聯
-- ============================================================================

-- ============================================================================
-- 1. 建立供應商表
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- 基本資訊
  supplier_number VARCHAR(50),
  name JSONB NOT NULL DEFAULT '{"zh": "", "en": ""}',
  code VARCHAR(100),

  -- 聯絡資訊
  contact_person JSONB DEFAULT '{"name": "", "phone": "", "email": ""}',
  phone VARCHAR(50),
  email VARCHAR(255),
  fax VARCHAR(50),
  address JSONB DEFAULT '{"zh": "", "en": ""}',
  website VARCHAR(255),

  -- 商業資訊
  tax_id VARCHAR(50),
  payment_terms VARCHAR(255),
  payment_days INTEGER DEFAULT 30,

  -- 銀行資訊
  bank_name VARCHAR(255),
  bank_account VARCHAR(100),
  bank_code VARCHAR(50),
  swift_code VARCHAR(50),

  -- 狀態
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 約束
  UNIQUE(company_id, supplier_number)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers USING GIN(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);

-- ============================================================================
-- 2. 供應商編號序列表
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year_month VARCHAR(6) NOT NULL,
  last_number INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year_month)
);

-- ============================================================================
-- 3. 修改 product_supplier_costs 表
-- ============================================================================

-- 新增 supplier_id 欄位
ALTER TABLE product_supplier_costs
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_product_supplier_costs_supplier_id
  ON product_supplier_costs(supplier_id);

-- ============================================================================
-- 4. 資料遷移：從現有記錄建立供應商
-- ============================================================================

DO $$
DECLARE
  cost_record RECORD;
  existing_supplier_id UUID;
  new_supplier_id UUID;
BEGIN
  -- 遍歷所有有 supplier_name 但沒有 supplier_id 的記錄
  FOR cost_record IN
    SELECT DISTINCT ON (psc.supplier_name, p.company_id)
      psc.supplier_name,
      psc.supplier_code,
      p.company_id,
      p.user_id
    FROM product_supplier_costs psc
    JOIN products p ON psc.product_id = p.id
    WHERE psc.supplier_id IS NULL
      AND psc.supplier_name IS NOT NULL
      AND psc.supplier_name != ''
      AND p.company_id IS NOT NULL
    ORDER BY psc.supplier_name, p.company_id, psc.created_at
  LOOP
    -- 檢查供應商是否已存在
    SELECT id INTO existing_supplier_id
    FROM suppliers
    WHERE company_id = cost_record.company_id
      AND name->>'zh' = cost_record.supplier_name;

    IF existing_supplier_id IS NULL THEN
      -- 建立新供應商
      INSERT INTO suppliers (
        company_id,
        user_id,
        name,
        code,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        cost_record.company_id,
        cost_record.user_id,
        jsonb_build_object('zh', cost_record.supplier_name, 'en', cost_record.supplier_name),
        cost_record.supplier_code,
        true,
        NOW(),
        NOW()
      ) RETURNING id INTO new_supplier_id;

      existing_supplier_id := new_supplier_id;

      RAISE NOTICE 'Created supplier: % (company: %)', cost_record.supplier_name, cost_record.company_id;
    END IF;

    -- 更新所有相同供應商名稱的 product_supplier_costs 記錄
    UPDATE product_supplier_costs psc
    SET supplier_id = existing_supplier_id,
        updated_at = NOW()
    FROM products p
    WHERE psc.product_id = p.id
      AND p.company_id = cost_record.company_id
      AND psc.supplier_name = cost_record.supplier_name
      AND psc.supplier_id IS NULL;
  END LOOP;

  RAISE NOTICE 'Data migration completed';
END $$;

-- ============================================================================
-- 5. RPC 函數：生成供應商編號
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_supplier_number_atomic(p_company_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year_month VARCHAR(6);
  v_next_number INTEGER;
  v_supplier_number VARCHAR(50);
BEGIN
  -- 取得當前年月
  v_year_month := TO_CHAR(NOW(), 'YYYYMM');

  -- 取得 advisory lock 防止競爭條件
  PERFORM pg_advisory_xact_lock(hashtext('supplier_number_' || p_company_id::TEXT || '_' || v_year_month));

  -- 取得或建立序列記錄
  INSERT INTO supplier_number_sequences (company_id, year_month, last_number)
  VALUES (p_company_id, v_year_month, 0)
  ON CONFLICT (company_id, year_month) DO NOTHING;

  -- 遞增並取得下一個編號
  UPDATE supplier_number_sequences
  SET last_number = last_number + 1,
      updated_at = NOW()
  WHERE company_id = p_company_id
    AND year_month = v_year_month
  RETURNING last_number INTO v_next_number;

  -- 格式：SUP202512-0001
  v_supplier_number := 'SUP' || v_year_month || '-' || LPAD(v_next_number::TEXT, 4, '0');

  RETURN v_supplier_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. RLS 政策
-- ============================================================================

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- SELECT 政策
CREATE POLICY "suppliers_select_policy" ON suppliers
  FOR SELECT
  USING (
    can_access_company_rls(company_id)
    OR is_super_admin()
  );

-- INSERT 政策
CREATE POLICY "suppliers_insert_policy" ON suppliers
  FOR INSERT
  WITH CHECK (
    can_access_company_rls(company_id)
  );

-- UPDATE 政策
CREATE POLICY "suppliers_update_policy" ON suppliers
  FOR UPDATE
  USING (
    can_access_company_rls(company_id)
  );

-- DELETE 政策
CREATE POLICY "suppliers_delete_policy" ON suppliers
  FOR DELETE
  USING (
    can_access_company_rls(company_id)
    OR is_super_admin()
  );

-- supplier_number_sequences 的 RLS
ALTER TABLE supplier_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_number_sequences_policy" ON supplier_number_sequences
  FOR ALL
  USING (
    can_access_company_rls(company_id)
    OR is_super_admin()
  );

-- ============================================================================
-- 7. 權限設定
-- ============================================================================

-- 新增供應商權限
INSERT INTO permissions (resource, action, name, description) VALUES
  ('suppliers', 'read', 'suppliers:read', '檢視供應商'),
  ('suppliers', 'write', 'suppliers:write', '建立/編輯供應商'),
  ('suppliers', 'delete', 'suppliers:delete', '刪除供應商')
ON CONFLICT (name) DO NOTHING;

-- Super Admin：所有權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
  AND p.resource = 'suppliers'
ON CONFLICT DO NOTHING;

-- Company Owner：所有供應商權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'company_owner'
  AND p.resource = 'suppliers'
ON CONFLICT DO NOTHING;

-- Sales Manager：讀取和寫入
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'sales_manager'
  AND p.name IN ('suppliers:read', 'suppliers:write')
ON CONFLICT DO NOTHING;

-- Salesperson：僅讀取
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'salesperson'
  AND p.name = 'suppliers:read'
ON CONFLICT DO NOTHING;

-- Accountant：僅讀取
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'accountant'
  AND p.name = 'suppliers:read'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. 時間戳觸發器
-- ============================================================================

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. 記錄遷移
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('042_supplier_independence.sql')
ON CONFLICT (filename) DO NOTHING;

-- 刷新 Schema Cache
NOTIFY pgrst, 'reload schema';

SELECT 'Supplier independence migration completed!' as status;
