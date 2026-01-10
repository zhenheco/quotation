-- ============================================================================
-- 訂單系統 - Orders System Migration
-- ============================================================================
-- 建立訂單模組，與現有報價單、合約系統並存
-- 流程：報價單 (ACCEPTED) → 訂單 (CONFIRMED) → 出貨單 → 發票

-- 1. 建立訂單表 (orders)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,  -- 來源報價單（可選）
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- 訂單編號（公司內唯一）
  order_number VARCHAR(50) NOT NULL,

  -- 狀態：draft -> confirmed -> shipped -> completed / cancelled
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'shipped', 'completed', 'cancelled')),

  -- 日期資訊
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,

  -- 金額資訊（從報價單複製或手動輸入）
  currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
  exchange_rate DECIMAL(15, 6) DEFAULT 1.0,
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_description TEXT,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- 其他資訊
  notes TEXT,
  terms TEXT,
  shipping_address TEXT,
  billing_address TEXT,

  -- 顯示控制
  show_tax BOOLEAN DEFAULT true,

  -- 時間戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 確保訂單編號在公司內唯一
  UNIQUE(company_id, order_number)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_quotation_id ON orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 2. 建立訂單明細表 (order_items)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quotation_item_id UUID REFERENCES quotation_items(id) ON DELETE SET NULL,  -- 來源報價項目

  -- 商品資訊（快照，避免商品更新影響訂單）
  product_name JSONB,  -- { "zh": "商品名稱", "en": "Product Name" }
  description TEXT,
  sku VARCHAR(100),

  -- 數量與價格
  quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
  unit VARCHAR(20),
  unit_price DECIMAL(15, 2) NOT NULL,
  discount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(15, 2) NOT NULL,

  -- 出貨追蹤
  quantity_shipped DECIMAL(15, 4) NOT NULL DEFAULT 0,  -- 已出貨數量
  quantity_remaining DECIMAL(15, 4) GENERATED ALWAYS AS (quantity - quantity_shipped) STORED,

  -- 排序
  sort_order INT NOT NULL DEFAULT 0,

  -- 時間戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_quotation_item_id ON order_items(quotation_item_id);

-- 3. 建立訂單編號序列表
CREATE TABLE IF NOT EXISTS order_number_sequences (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  current_number INT NOT NULL DEFAULT 0,
  prefix VARCHAR(20) DEFAULT 'ORD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 訂單編號生成函數
CREATE OR REPLACE FUNCTION generate_order_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR;
  v_next_number INT;
  v_year_month VARCHAR;
  v_order_number VARCHAR;
BEGIN
  -- 取得或建立序列記錄
  INSERT INTO order_number_sequences (company_id)
  VALUES (p_company_id)
  ON CONFLICT (company_id) DO NOTHING;

  -- 取得下一個編號（使用 FOR UPDATE 防止競爭）
  UPDATE order_number_sequences
  SET current_number = current_number + 1,
      updated_at = NOW()
  WHERE company_id = p_company_id
  RETURNING current_number, COALESCE(prefix, 'ORD')
  INTO v_next_number, v_prefix;

  -- 產生編號：ORD-YYYYMM-XXXX
  v_year_month := TO_CHAR(NOW(), 'YYYYMM');
  v_order_number := v_prefix || '-' || v_year_month || '-' || LPAD(v_next_number::TEXT, 4, '0');

  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- 5. 訂單建立前觸發器（自動產生編號）
CREATE OR REPLACE FUNCTION before_order_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果沒有提供訂單編號，自動產生
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_before_order_insert ON orders;
CREATE TRIGGER trigger_before_order_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION before_order_insert();

-- 6. 更新時間觸發器
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
    CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_order_items_updated_at') THEN
    CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 7. 從報價單建立訂單的函數
CREATE OR REPLACE FUNCTION create_order_from_quotation(
  p_quotation_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_quotation RECORD;
  v_new_order_id UUID;
BEGIN
  -- 取得報價單資料
  SELECT * INTO v_quotation
  FROM quotations
  WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found: %', p_quotation_id;
  END IF;

  -- 檢查報價單狀態（只有 accepted 才能轉訂單）
  IF v_quotation.status != 'accepted' THEN
    RAISE EXCEPTION 'Only accepted quotations can be converted to orders. Current status: %', v_quotation.status;
  END IF;

  -- 建立訂單
  INSERT INTO orders (
    company_id,
    quotation_id,
    customer_id,
    created_by,
    order_date,
    currency,
    exchange_rate,
    subtotal,
    tax_rate,
    tax_amount,
    discount_amount,
    discount_description,
    total_amount,
    notes,
    terms,
    show_tax,
    status
  ) VALUES (
    v_quotation.company_id,
    p_quotation_id,
    v_quotation.customer_id,
    p_created_by,
    CURRENT_DATE,
    v_quotation.currency,
    COALESCE(v_quotation.exchange_rate, 1.0),
    v_quotation.subtotal,
    v_quotation.tax_rate,
    v_quotation.tax_amount,
    COALESCE(v_quotation.discount_amount, 0),
    v_quotation.discount_description,
    v_quotation.total_amount,
    v_quotation.notes,
    v_quotation.terms,
    COALESCE(v_quotation.show_tax, true),
    'draft'
  ) RETURNING id INTO v_new_order_id;

  -- 複製報價項目到訂單項目
  INSERT INTO order_items (
    order_id,
    product_id,
    quotation_item_id,
    product_name,
    description,
    sku,
    quantity,
    unit,
    unit_price,
    discount,
    amount,
    sort_order
  )
  SELECT
    v_new_order_id,
    qi.product_id,
    qi.id,
    p.name,  -- 商品名稱快照
    qi.description,
    p.sku,
    qi.quantity,
    qi.unit,
    qi.unit_price,
    qi.discount,
    qi.subtotal,
    qi.sort_order
  FROM quotation_items qi
  LEFT JOIN products p ON p.id = qi.product_id
  WHERE qi.quotation_id = p_quotation_id
  ORDER BY qi.sort_order;

  RETURN v_new_order_id;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS 政策
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_number_sequences ENABLE ROW LEVEL SECURITY;

-- Orders RLS
CREATE POLICY "Company members can view their orders"
  ON orders FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can insert orders"
  ON orders FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can update orders"
  ON orders FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can delete draft orders"
  ON orders FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND status = 'draft'
  );

-- Order Items RLS
CREATE POLICY "Company members can view their order items"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE company_id IN (
        SELECT company_id FROM company_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Company members can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE company_id IN (
        SELECT company_id FROM company_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Company members can update order items"
  ON order_items FOR UPDATE
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE company_id IN (
        SELECT company_id FROM company_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Company members can delete order items"
  ON order_items FOR DELETE
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE company_id IN (
        SELECT company_id FROM company_members
        WHERE user_id = auth.uid() AND is_active = true
      )
      AND status = 'draft'
    )
  );

-- Order Number Sequences RLS
CREATE POLICY "Company members can view their sequences"
  ON order_number_sequences FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can insert sequences"
  ON order_number_sequences FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can update sequences"
  ON order_number_sequences FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 9. 新增註解
COMMENT ON TABLE orders IS '訂單表 - 記錄確認後的訂購資訊';
COMMENT ON TABLE order_items IS '訂單明細表 - 記錄訂單的商品項目';
COMMENT ON TABLE order_number_sequences IS '訂單編號序列表 - 用於生成唯一訂單編號';
COMMENT ON COLUMN orders.status IS '訂單狀態: draft(草稿), confirmed(已確認), shipped(已出貨), completed(已完成), cancelled(已取消)';
COMMENT ON COLUMN order_items.quantity_shipped IS '已出貨數量 - 用於追蹤部分出貨';
COMMENT ON COLUMN order_items.quantity_remaining IS '剩餘數量 - 自動計算';
COMMENT ON FUNCTION create_order_from_quotation IS '從報價單建立訂單，複製所有項目';

-- 完成
SELECT 'Orders system created successfully!' as status;
