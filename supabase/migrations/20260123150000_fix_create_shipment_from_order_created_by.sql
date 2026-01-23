-- ============================================================================
-- Migration: 修復 create_shipment_from_order 函數的 created_by 處理
-- ============================================================================
-- 問題：shipments.created_by 外鍵參考 user_profiles(id)，但 API 傳入 auth.users.id
-- 解法：在函數內部查詢正確的 user_profiles.id
-- 參考：082_fix_create_order_from_quotation_created_by.sql

-- 重建函數，支援傳入 auth.users.id 或 user_profiles.id
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
  v_user_profile_id UUID;
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
    v_user_profile_id,  -- 使用轉換後的 user_profiles.id
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

-- 將函數改為 SECURITY DEFINER 以繞過 RLS
-- 這是必要的，因為函數內部需要查詢 user_profiles 表
ALTER FUNCTION create_shipment_from_order(uuid, uuid, boolean) SECURITY DEFINER;
ALTER FUNCTION create_shipment_from_order(uuid, uuid, boolean) SET search_path = public;

-- 新增註解說明
COMMENT ON FUNCTION create_shipment_from_order IS '從訂單建立出貨單。p_created_by 可傳入 auth.users.id 或 user_profiles.id，函數會自動轉換為正確的 user_profiles.id。使用 SECURITY DEFINER 以繞過 RLS';
