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
