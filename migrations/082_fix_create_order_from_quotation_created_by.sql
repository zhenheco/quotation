-- ============================================================================
-- Migration 082: 修復 create_order_from_quotation 函數的 created_by 處理
-- ============================================================================
-- 問題：orders.created_by 外鍵參考 user_profiles(id)，但 API 可能傳入 auth.users.id
-- 解法：在函數內部查詢正確的 user_profiles.id

-- 重建函數，支援傳入 auth.users.id 或 user_profiles.id
CREATE OR REPLACE FUNCTION create_order_from_quotation(
  p_quotation_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_quotation RECORD;
  v_new_order_id UUID;
  v_user_profile_id UUID;
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
    v_user_profile_id,  -- 使用轉換後的 user_profiles.id
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

-- 將函數改為 SECURITY DEFINER 以繞過 RLS
-- 這是必要的，因為函數內部需要查詢 user_profiles 表
ALTER FUNCTION create_order_from_quotation(uuid, uuid) SECURITY DEFINER;
ALTER FUNCTION create_order_from_quotation(uuid, uuid) SET search_path = public;

-- 新增註解說明
COMMENT ON FUNCTION create_order_from_quotation IS '從報價單建立訂單。p_created_by 可傳入 auth.users.id 或 user_profiles.id，函數會自動轉換為正確的 user_profiles.id。使用 SECURITY DEFINER 以繞過 RLS';

-- 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('082_fix_create_order_from_quotation_created_by.sql')
ON CONFLICT (filename) DO NOTHING;
