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
