-- ============================================================================
-- 擴展發票號碼欄位長度 - Expand Invoice Number Length
-- ============================================================================
-- 台灣發票號碼格式 XX-00000000 含連字號共 11 字元，超過原本 VARCHAR(10) 限制
-- 將 acc_invoices.number 擴展為 VARCHAR(15) 以支援各種格式

-- 1. 擴展主表欄位
ALTER TABLE acc_invoices ALTER COLUMN number TYPE VARCHAR(15);

-- 2. 重建 create_invoice_from_shipment 函數（v_invoice_number 改為 VARCHAR(15)）
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
  v_invoice_number VARCHAR(15);
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

-- 完成
SELECT 'Invoice number column expanded to VARCHAR(15) successfully!' as status;
