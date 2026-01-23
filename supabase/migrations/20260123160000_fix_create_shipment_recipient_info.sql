-- ============================================================================
-- Migration: 修復 create_shipment_from_order 函數 - 複製完整收件資訊
-- ============================================================================
-- 問題：訂單轉出貨單後，收件資訊（recipient_name、recipient_phone）為空白
-- 原因：原函數只複製 shipping_address，沒有從 customers 表取得聯絡人資訊
-- 解法：從 customers 表查詢 contact_person 和 phone，填入出貨單的收件人欄位

-- 重建函數，加入收件人資訊的自動填入
CREATE OR REPLACE FUNCTION create_shipment_from_order(
  p_order_id UUID,
  p_created_by UUID DEFAULT NULL,
  p_ship_all BOOLEAN DEFAULT true  -- true: 出貨全部剩餘數量, false: 建立空白出貨單
)
RETURNS UUID AS $$
DECLARE
  v_order RECORD;
  v_customer RECORD;
  v_new_shipment_id UUID;
  v_total DECIMAL(15, 2) := 0;
  v_user_profile_id UUID;
  v_recipient_name TEXT;
  v_recipient_phone TEXT;
  v_shipping_address TEXT;
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

  -- 取得客戶資料（用於填入收件人資訊）
  SELECT * INTO v_customer
  FROM customers
  WHERE id = v_order.customer_id;

  -- 處理收件人資訊：優先使用訂單的 shipping_address，其次使用客戶的 address
  -- 收件人姓名：從客戶的 contact_person 取得，若無則使用客戶名稱
  IF v_customer.contact_person IS NOT NULL AND v_customer.contact_person->>'name' IS NOT NULL THEN
    v_recipient_name := v_customer.contact_person->>'name';
  ELSIF v_customer.name IS NOT NULL THEN
    v_recipient_name := COALESCE(v_customer.name->>'zh', v_customer.name->>'en');
  ELSE
    v_recipient_name := NULL;
  END IF;

  -- 收件人電話：從客戶的 contact_person 取得，若無則使用客戶主要電話
  IF v_customer.contact_person IS NOT NULL AND v_customer.contact_person->>'phone' IS NOT NULL THEN
    v_recipient_phone := v_customer.contact_person->>'phone';
  ELSE
    v_recipient_phone := v_customer.phone;
  END IF;

  -- 出貨地址：優先使用訂單的 shipping_address，其次使用 billing_address，最後使用客戶地址
  v_shipping_address := COALESCE(
    v_order.shipping_address,
    v_order.billing_address,
    -- 客戶地址是 JSONB，需要組合
    CASE
      WHEN v_customer.address IS NOT NULL THEN
        COALESCE(v_customer.address->>'street', '') ||
        CASE WHEN v_customer.address->>'city' IS NOT NULL THEN ', ' || (v_customer.address->>'city') ELSE '' END ||
        CASE WHEN v_customer.address->>'state' IS NOT NULL THEN ', ' || (v_customer.address->>'state') ELSE '' END ||
        CASE WHEN v_customer.address->>'country' IS NOT NULL THEN ', ' || (v_customer.address->>'country') ELSE '' END ||
        CASE WHEN v_customer.address->>'postal_code' IS NOT NULL THEN ' ' || (v_customer.address->>'postal_code') ELSE '' END
      ELSE NULL
    END
  );

  -- 處理 created_by：
  -- 1. 如果傳入的是 user_profiles.id，直接使用
  -- 2. 如果傳入的是 auth.users.id，查詢對應的 user_profiles.id
  -- 3. 如果都找不到，使用 NULL
  IF p_created_by IS NOT NULL THEN
    -- 先檢查是否直接是 user_profiles.id
    SELECT id INTO v_user_profile_id
    FROM user_profiles
    WHERE id = p_created_by;

    -- 如果找不到，嘗試用 user_id 查詢（傳入的可能是 auth.users.id）
    IF v_user_profile_id IS NULL THEN
      SELECT id INTO v_user_profile_id
      FROM user_profiles
      WHERE user_id = p_created_by;
    END IF;
  ELSE
    v_user_profile_id := NULL;
  END IF;

  -- 建立出貨單（包含完整收件人資訊）
  INSERT INTO shipments (
    company_id,
    order_id,
    customer_id,
    created_by,
    currency,
    shipping_address,
    recipient_name,
    recipient_phone,
    status
  ) VALUES (
    v_order.company_id,
    p_order_id,
    v_order.customer_id,
    v_user_profile_id,  -- 使用轉換後的 user_profiles.id
    v_order.currency,
    v_shipping_address,
    v_recipient_name,
    v_recipient_phone,
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
      GREATEST(oi.quantity_remaining, 0),  -- 確保不為負數
      oi.unit,
      oi.unit_price,
      oi.unit_price * GREATEST(oi.quantity_remaining, 0),
      oi.sort_order
    FROM order_items oi
    WHERE oi.order_id = p_order_id
    AND oi.quantity_remaining > 0
    ORDER BY oi.sort_order;

    -- 如果沒有可出貨的項目（quantity_remaining 都為 0），則複製全部項目
    IF NOT FOUND THEN
      -- 記錄警告日誌（可選）
      RAISE NOTICE 'No items with remaining quantity found, copying all order items';

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
        oi.quantity,  -- 使用原始數量
        oi.unit,
        oi.unit_price,
        oi.amount,    -- 使用原始金額
        oi.sort_order
      FROM order_items oi
      WHERE oi.order_id = p_order_id
      ORDER BY oi.sort_order;
    END IF;

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

-- 將函數改為 SECURITY DEFINER 以繞過 RLS
-- 這是必要的，因為函數內部需要查詢 user_profiles 和 customers 表
ALTER FUNCTION create_shipment_from_order(uuid, uuid, boolean) SECURITY DEFINER;
ALTER FUNCTION create_shipment_from_order(uuid, uuid, boolean) SET search_path = public;

-- 新增註解說明
COMMENT ON FUNCTION create_shipment_from_order IS '從訂單建立出貨單。
- 自動從 customers 表取得收件人姓名和電話
- p_created_by 可傳入 auth.users.id 或 user_profiles.id，函數會自動轉換
- p_ship_all=true 會出貨全部剩餘數量；若無剩餘數量則複製全部訂單項目
- 使用 SECURITY DEFINER 以繞過 RLS';
