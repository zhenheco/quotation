-- ============================================================================
-- Migration 070: 升級振禾有限公司到 PROFESSIONAL 方案
-- ============================================================================

-- 升級公司訂閱到 PROFESSIONAL 方案
UPDATE company_subscriptions
SET
  plan_id = (SELECT id FROM subscription_plans WHERE tier = 'PROFESSIONAL' LIMIT 1),
  status = 'ACTIVE',
  current_period_end = NOW() + INTERVAL '100 years',
  updated_at = NOW()
WHERE company_id IN (
  SELECT id FROM companies WHERE tax_id = '83446730'
);

-- 如果公司沒有訂閱記錄，則建立一個
INSERT INTO company_subscriptions (company_id, plan_id, status, billing_cycle, current_period_end)
SELECT
  c.id,
  (SELECT id FROM subscription_plans WHERE tier = 'PROFESSIONAL' LIMIT 1),
  'ACTIVE',
  'YEARLY',
  NOW() + INTERVAL '100 years'
FROM companies c
WHERE c.tax_id = '83446730'
  AND NOT EXISTS (
    SELECT 1 FROM company_subscriptions cs WHERE cs.company_id = c.id
  );

-- 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('070_upgrade_company_to_professional.sql')
ON CONFLICT (filename) DO NOTHING;

-- 確認結果
SELECT
  c.name as company_name,
  c.tax_id,
  sp.tier,
  sp.name as plan_name,
  cs.status,
  cs.current_period_end
FROM company_subscriptions cs
JOIN companies c ON c.id = cs.company_id
JOIN subscription_plans sp ON sp.id = cs.plan_id
WHERE c.tax_id = '83446730';


-- ========== ORDERS & SHIPMENTS SYSTEM (071-073 combined) ==========


-- ====== 071_create_orders_system.sql ======
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


-- ====== 072_create_shipments_system.sql ======
-- ============================================================================
-- 出貨單系統 - Shipments System Migration
-- ============================================================================
-- 建立出貨單模組，支援部分出貨和物流追蹤
-- 流程：訂單 (CONFIRMED) → 出貨單 (DELIVERED) → 發票

-- 1. 建立出貨單表 (shipments)
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,  -- 冗餘欄位便於查詢
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- 出貨編號（公司內唯一）
  shipment_number VARCHAR(50) NOT NULL,

  -- 狀態：pending -> in_transit -> delivered / cancelled
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),

  -- 日期資訊
  shipped_date DATE,                -- 實際出貨日期
  expected_delivery DATE,           -- 預計送達日期
  actual_delivery DATE,             -- 實際送達日期

  -- 物流資訊
  carrier VARCHAR(100),             -- 物流公司名稱
  tracking_number VARCHAR(100),     -- 追蹤號碼
  tracking_url TEXT,                -- 追蹤連結

  -- 地址資訊
  shipping_address TEXT,
  recipient_name VARCHAR(100),
  recipient_phone VARCHAR(50),

  -- 金額資訊（用於計算發票）
  currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  shipping_fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- 其他
  notes TEXT,
  internal_notes TEXT,              -- 內部備註

  -- 時間戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 確保出貨編號在公司內唯一
  UNIQUE(company_id, shipment_number)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_shipments_company_id ON shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_shipped_date ON shipments(shipped_date);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);

-- 2. 建立出貨明細表 (shipment_items)
CREATE TABLE IF NOT EXISTS shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  -- 商品資訊（快照）
  product_name JSONB,
  description TEXT,
  sku VARCHAR(100),

  -- 出貨數量
  quantity_shipped DECIMAL(15, 4) NOT NULL,
  unit VARCHAR(20),
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- 排序
  sort_order INT NOT NULL DEFAULT 0,

  -- 時間戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment_id ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_order_item_id ON shipment_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_product_id ON shipment_items(product_id);

-- 3. 建立出貨編號序列表
CREATE TABLE IF NOT EXISTS shipment_number_sequences (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  current_number INT NOT NULL DEFAULT 0,
  prefix VARCHAR(20) DEFAULT 'SHP',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 出貨編號生成函數
CREATE OR REPLACE FUNCTION generate_shipment_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR;
  v_next_number INT;
  v_year_month VARCHAR;
  v_shipment_number VARCHAR;
BEGIN
  -- 取得或建立序列記錄
  INSERT INTO shipment_number_sequences (company_id)
  VALUES (p_company_id)
  ON CONFLICT (company_id) DO NOTHING;

  -- 取得下一個編號
  UPDATE shipment_number_sequences
  SET current_number = current_number + 1,
      updated_at = NOW()
  WHERE company_id = p_company_id
  RETURNING current_number, COALESCE(prefix, 'SHP')
  INTO v_next_number, v_prefix;

  -- 產生編號：SHP-YYYYMM-XXXX
  v_year_month := TO_CHAR(NOW(), 'YYYYMM');
  v_shipment_number := v_prefix || '-' || v_year_month || '-' || LPAD(v_next_number::TEXT, 4, '0');

  RETURN v_shipment_number;
END;
$$ LANGUAGE plpgsql;

-- 5. 出貨單建立前觸發器（自動產生編號）
CREATE OR REPLACE FUNCTION before_shipment_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果沒有提供出貨編號，自動產生
  IF NEW.shipment_number IS NULL OR NEW.shipment_number = '' THEN
    NEW.shipment_number := generate_shipment_number(NEW.company_id);
  END IF;

  -- 自動填入 customer_id（從訂單取得）
  IF NEW.customer_id IS NULL THEN
    SELECT customer_id INTO NEW.customer_id
    FROM orders WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_before_shipment_insert ON shipments;
CREATE TRIGGER trigger_before_shipment_insert
  BEFORE INSERT ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION before_shipment_insert();

-- 6. 出貨後更新訂單項目的已出貨數量
CREATE OR REPLACE FUNCTION after_shipment_item_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新訂單項目的已出貨數量
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE order_items
    SET quantity_shipped = (
      SELECT COALESCE(SUM(si.quantity_shipped), 0)
      FROM shipment_items si
      JOIN shipments s ON s.id = si.shipment_id
      WHERE si.order_item_id = NEW.order_item_id
      AND s.status != 'cancelled'
    ),
    updated_at = NOW()
    WHERE id = NEW.order_item_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE order_items
    SET quantity_shipped = (
      SELECT COALESCE(SUM(si.quantity_shipped), 0)
      FROM shipment_items si
      JOIN shipments s ON s.id = si.shipment_id
      WHERE si.order_item_id = OLD.order_item_id
      AND s.status != 'cancelled'
    ),
    updated_at = NOW()
    WHERE id = OLD.order_item_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_after_shipment_item_change ON shipment_items;
CREATE TRIGGER trigger_after_shipment_item_change
  AFTER INSERT OR UPDATE OR DELETE ON shipment_items
  FOR EACH ROW
  EXECUTE FUNCTION after_shipment_item_change();

-- 7. 出貨單狀態變更時更新訂單狀態
CREATE OR REPLACE FUNCTION after_shipment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_total_items INT;
  v_shipped_items INT;
  v_delivered_shipments INT;
  v_total_shipments INT;
BEGIN
  -- 只在狀態變更時處理
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- 計算訂單的出貨狀況
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE quantity_remaining <= 0)
  INTO v_total_items, v_shipped_items
  FROM order_items
  WHERE order_id = NEW.order_id;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'delivered')
  INTO v_total_shipments, v_delivered_shipments
  FROM shipments
  WHERE order_id = NEW.order_id AND status != 'cancelled';

  -- 更新訂單狀態
  IF v_shipped_items >= v_total_items AND v_delivered_shipments > 0 THEN
    -- 所有項目都已出貨且有送達的出貨單
    UPDATE orders SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.order_id AND status NOT IN ('completed', 'cancelled');
  ELSIF v_total_shipments > 0 THEN
    -- 有出貨單但還沒全部完成
    UPDATE orders SET status = 'shipped', updated_at = NOW()
    WHERE id = NEW.order_id AND status = 'confirmed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_after_shipment_status_change ON shipments;
CREATE TRIGGER trigger_after_shipment_status_change
  AFTER UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION after_shipment_status_change();

-- 8. 更新時間觸發器
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shipments_updated_at') THEN
    CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 9. 從訂單建立出貨單的函數
CREATE OR REPLACE FUNCTION create_shipment_from_order(
  p_order_id UUID,
  p_created_by UUID DEFAULT NULL,
  p_ship_all BOOLEAN DEFAULT true  -- true: 出貨全部剩餘數量, false: 建立空白出貨單
)
RETURNS UUID AS $$
DECLARE
  v_order RECORD;
  v_new_shipment_id UUID;
  v_total DECIMAL(15, 2) := 0;
BEGIN
  -- 取得訂單資料
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- 檢查訂單狀態
  IF v_order.status NOT IN ('confirmed', 'shipped') THEN
    RAISE EXCEPTION 'Only confirmed or shipped orders can create shipments. Current status: %', v_order.status;
  END IF;

  -- 建立出貨單
  INSERT INTO shipments (
    company_id,
    order_id,
    customer_id,
    created_by,
    currency,
    shipping_address,
    status
  ) VALUES (
    v_order.company_id,
    p_order_id,
    v_order.customer_id,
    p_created_by,
    v_order.currency,
    COALESCE(v_order.shipping_address, v_order.billing_address),
    'pending'
  ) RETURNING id INTO v_new_shipment_id;

  -- 如果要出貨全部剩餘數量
  IF p_ship_all THEN
    INSERT INTO shipment_items (
      shipment_id,
      order_item_id,
      product_id,
      product_name,
      description,
      sku,
      quantity_shipped,
      unit,
      unit_price,
      amount,
      sort_order
    )
    SELECT
      v_new_shipment_id,
      oi.id,
      oi.product_id,
      oi.product_name,
      oi.description,
      oi.sku,
      oi.quantity_remaining,  -- 出貨剩餘數量
      oi.unit,
      oi.unit_price,
      oi.unit_price * oi.quantity_remaining,
      oi.sort_order
    FROM order_items oi
    WHERE oi.order_id = p_order_id
    AND oi.quantity_remaining > 0
    ORDER BY oi.sort_order;

    -- 計算出貨單總金額
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM shipment_items
    WHERE shipment_id = v_new_shipment_id;

    UPDATE shipments
    SET subtotal = v_total,
        total_amount = v_total
    WHERE id = v_new_shipment_id;
  END IF;

  RETURN v_new_shipment_id;
END;
$$ LANGUAGE plpgsql;

-- 10. RLS 政策
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_number_sequences ENABLE ROW LEVEL SECURITY;

-- Shipments RLS
CREATE POLICY "Company members can view their shipments"
  ON shipments FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can insert shipments"
  ON shipments FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can update shipments"
  ON shipments FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can delete pending shipments"
  ON shipments FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND status = 'pending'
  );

-- Shipment Items RLS
CREATE POLICY "Company members can view their shipment items"
  ON shipment_items FOR SELECT
  USING (
    shipment_id IN (
      SELECT id FROM shipments
      WHERE company_id IN (
        SELECT company_id FROM company_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Company members can insert shipment items"
  ON shipment_items FOR INSERT
  WITH CHECK (
    shipment_id IN (
      SELECT id FROM shipments
      WHERE company_id IN (
        SELECT company_id FROM company_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Company members can update shipment items"
  ON shipment_items FOR UPDATE
  USING (
    shipment_id IN (
      SELECT id FROM shipments
      WHERE company_id IN (
        SELECT company_id FROM company_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Company members can delete shipment items"
  ON shipment_items FOR DELETE
  USING (
    shipment_id IN (
      SELECT id FROM shipments
      WHERE company_id IN (
        SELECT company_id FROM company_members
        WHERE user_id = auth.uid() AND is_active = true
      )
      AND status = 'pending'
    )
  );

-- Shipment Number Sequences RLS
CREATE POLICY "Company members can view their shipment sequences"
  ON shipment_number_sequences FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can insert shipment sequences"
  ON shipment_number_sequences FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can update shipment sequences"
  ON shipment_number_sequences FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 11. 新增註解
COMMENT ON TABLE shipments IS '出貨單表 - 記錄訂單的出貨資訊';
COMMENT ON TABLE shipment_items IS '出貨明細表 - 記錄每次出貨的商品項目';
COMMENT ON TABLE shipment_number_sequences IS '出貨編號序列表 - 用於生成唯一出貨編號';
COMMENT ON COLUMN shipments.status IS '出貨狀態: pending(待出貨), in_transit(運送中), delivered(已送達), cancelled(已取消)';
COMMENT ON COLUMN shipment_items.quantity_shipped IS '本次出貨數量';
COMMENT ON FUNCTION create_shipment_from_order IS '從訂單建立出貨單，可選擇出貨全部剩餘數量或建立空白出貨單';

-- 完成
SELECT 'Shipments system created successfully!' as status;


-- ====== 073_acc_invoices_add_order_shipment.sql ======
-- ============================================================================
-- 發票整合訂單和出貨單 - Add Order and Shipment Relations to Invoices
-- ============================================================================
-- 在會計發票表新增訂單和出貨單關聯欄位
-- 允許從銷售流程追蹤到發票

-- 1. 新增關聯欄位
ALTER TABLE acc_invoices
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL;

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_acc_invoices_order ON acc_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_acc_invoices_shipment ON acc_invoices(shipment_id);
CREATE INDEX IF NOT EXISTS idx_acc_invoices_quotation ON acc_invoices(quotation_id);

-- 3. 新增欄位註解
COMMENT ON COLUMN acc_invoices.order_id IS '關聯的銷售訂單';
COMMENT ON COLUMN acc_invoices.shipment_id IS '關聯的出貨單';
COMMENT ON COLUMN acc_invoices.quotation_id IS '關聯的報價單';

-- 4. 建立從出貨單建立發票的函數
CREATE OR REPLACE FUNCTION create_invoice_from_shipment(
  p_shipment_id UUID,
  p_invoice_date DATE DEFAULT CURRENT_DATE,
  p_due_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_shipment RECORD;
  v_order RECORD;
  v_customer RECORD;
  v_new_invoice_id UUID;
  v_invoice_number VARCHAR(10);
  v_year_month VARCHAR(6);
  v_seq INT;
BEGIN
  -- 取得出貨單資料
  SELECT * INTO v_shipment
  FROM shipments
  WHERE id = p_shipment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found: %', p_shipment_id;
  END IF;

  -- 檢查出貨單狀態
  IF v_shipment.status NOT IN ('in_transit', 'delivered') THEN
    RAISE EXCEPTION 'Only shipped or delivered shipments can generate invoices. Current status: %', v_shipment.status;
  END IF;

  -- 取得訂單資料
  SELECT * INTO v_order
  FROM orders
  WHERE id = v_shipment.order_id;

  -- 取得客戶資料
  SELECT * INTO v_customer
  FROM customers
  WHERE id = v_shipment.customer_id;

  -- 產生發票號碼（簡易版，實際可能需要更複雜的邏輯）
  v_year_month := TO_CHAR(p_invoice_date, 'YYMM');
  SELECT COALESCE(MAX(SUBSTRING(number FROM 5)::INT), 0) + 1 INTO v_seq
  FROM acc_invoices
  WHERE company_id = v_shipment.company_id
  AND number LIKE 'SI' || v_year_month || '%';
  v_invoice_number := 'SI' || v_year_month || LPAD(v_seq::TEXT, 4, '0');

  -- 建立發票
  INSERT INTO acc_invoices (
    company_id,
    number,
    type,
    date,
    untaxed_amount,
    tax_amount,
    total_amount,
    counterparty_name,
    counterparty_tax_id,
    description,
    status,
    payment_status,
    due_date,
    -- 新增的關聯欄位
    order_id,
    shipment_id,
    quotation_id
  ) VALUES (
    v_shipment.company_id,
    v_invoice_number,
    'OUTPUT',  -- 銷項發票
    p_invoice_date,
    v_shipment.subtotal,
    ROUND(v_shipment.subtotal * 0.05, 2),  -- 5% 稅額
    v_shipment.total_amount + ROUND(v_shipment.subtotal * 0.05, 2),
    v_customer.name->>'zh',
    v_customer.tax_id,
    '出貨單 ' || v_shipment.shipment_number || ' 轉發票',
    'DRAFT',
    'UNPAID',
    COALESCE(p_due_date, p_invoice_date + INTERVAL '30 days'),
    v_order.id,
    p_shipment_id,
    v_order.quotation_id
  ) RETURNING id INTO v_new_invoice_id;

  RETURN v_new_invoice_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_invoice_from_shipment IS '從出貨單建立銷項發票';

-- 5. 建立查詢訂單相關發票的視圖
CREATE OR REPLACE VIEW order_invoices_summary AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.company_id,
  o.customer_id,
  o.total_amount AS order_amount,
  COUNT(i.id) AS invoice_count,
  COALESCE(SUM(i.total_amount), 0) AS invoiced_amount,
  o.total_amount - COALESCE(SUM(i.total_amount), 0) AS remaining_amount,
  COALESCE(SUM(i.paid_amount), 0) AS paid_amount,
  CASE
    WHEN COALESCE(SUM(i.total_amount), 0) = 0 THEN 'NOT_INVOICED'
    WHEN COALESCE(SUM(i.total_amount), 0) < o.total_amount THEN 'PARTIAL_INVOICED'
    ELSE 'FULLY_INVOICED'
  END AS invoice_status,
  CASE
    WHEN COALESCE(SUM(i.paid_amount), 0) = 0 THEN 'NOT_PAID'
    WHEN COALESCE(SUM(i.paid_amount), 0) < o.total_amount THEN 'PARTIAL_PAID'
    ELSE 'FULLY_PAID'
  END AS payment_status
FROM orders o
LEFT JOIN acc_invoices i ON i.order_id = o.id AND i.deleted_at IS NULL
GROUP BY o.id, o.order_number, o.company_id, o.customer_id, o.total_amount;

COMMENT ON VIEW order_invoices_summary IS '訂單發票狀態摘要';

-- 6. 建立查詢出貨單發票狀態的視圖
CREATE OR REPLACE VIEW shipment_invoices_summary AS
SELECT
  s.id AS shipment_id,
  s.shipment_number,
  s.company_id,
  s.order_id,
  s.total_amount AS shipment_amount,
  COUNT(i.id) AS invoice_count,
  COALESCE(SUM(i.total_amount), 0) AS invoiced_amount,
  CASE
    WHEN COUNT(i.id) = 0 THEN 'NOT_INVOICED'
    ELSE 'INVOICED'
  END AS invoice_status
FROM shipments s
LEFT JOIN acc_invoices i ON i.shipment_id = s.id AND i.deleted_at IS NULL
GROUP BY s.id, s.shipment_number, s.company_id, s.order_id, s.total_amount;

COMMENT ON VIEW shipment_invoices_summary IS '出貨單發票狀態摘要';

-- 完成
SELECT 'Invoice order/shipment relations added successfully!' as status;





-- ============================================================================
-- 訂單與出貨單權限設定 - Orders & Shipments Permissions Migration
-- ============================================================================
-- 為訂單和出貨模組建立權限並分配給適當的角色
--
-- 說明：
-- - 新增功能模組時，除了建立資料表和 RLS 政策，還需要在 permissions 表新增權限記錄
-- - 然後將權限分配給相關角色（role_permissions 表）
-- - API middleware (withAuth) 會檢查使用者是否有該權限

-- 1. 新增訂單相關權限
INSERT INTO permissions (name, description, resource, action)
VALUES
  ('orders:read', '查看訂單', 'orders', 'read'),
  ('orders:write', '建立/編輯訂單', 'orders', 'write'),
  ('orders:delete', '刪除訂單', 'orders', 'delete')
ON CONFLICT (name) DO NOTHING;

-- 2. 新增出貨單相關權限
INSERT INTO permissions (name, description, resource, action)
VALUES
  ('shipments:read', '查看出貨單', 'shipments', 'read'),
  ('shipments:write', '建立/編輯出貨單', 'shipments', 'write'),
  ('shipments:delete', '刪除出貨單', 'shipments', 'delete')
ON CONFLICT (name) DO NOTHING;

-- 3. 分配權限給 company_owner（所有權限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'company_owner'
  AND p.name IN ('orders:read', 'orders:write', 'orders:delete',
                 'shipments:read', 'shipments:write', 'shipments:delete')
ON CONFLICT DO NOTHING;

-- 4. 分配權限給 sales_manager（所有權限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_manager'
  AND p.name IN ('orders:read', 'orders:write', 'orders:delete',
                 'shipments:read', 'shipments:write', 'shipments:delete')
ON CONFLICT DO NOTHING;

-- 5. 分配權限給 accountant（只讀權限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'accountant'
  AND p.name IN ('orders:read', 'shipments:read')
ON CONFLICT DO NOTHING;

-- 6. 驗證權限分配
SELECT r.name as role_name, p.name as permission_name
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE p.name LIKE 'orders%' OR p.name LIKE 'shipments%'
ORDER BY r.name, p.name;

-- 完成
SELECT 'Orders and Shipments permissions added successfully!' as status;
