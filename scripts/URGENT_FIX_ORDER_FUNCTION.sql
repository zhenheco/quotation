-- ============================================================================
-- 緊急修復：create_order_from_quotation 函數
-- ============================================================================
-- 請在 Supabase Dashboard > SQL Editor 執行此腳本
--
-- 問題：報價單轉訂單時出現 orders_created_by_fkey 外鍵約束錯誤
-- 原因：傳入的 created_by 值不存在於 user_profiles 表
-- 解法：函數內部驗證並轉換無效值為 NULL
-- ============================================================================

-- 重建函數（v7 版本，更強健的處理）
CREATE OR REPLACE FUNCTION create_order_from_quotation(
  p_quotation_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_quotation RECORD;
  v_new_order_id UUID;
  v_user_profile_id UUID := NULL;  -- 明確初始化為 NULL
BEGIN
  -- 取得報價單資料
  SELECT * INTO v_quotation
  FROM quotations
  WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '[DB-v7] Quotation not found: %', p_quotation_id;
  END IF;

  -- 檢查報價單狀態（只有 accepted 才能轉訂單）
  IF v_quotation.status != 'accepted' THEN
    RAISE EXCEPTION 'Only accepted quotations can be converted to orders. Current status: %', v_quotation.status;
  END IF;

  -- =====================================================
  -- 關鍵修復：處理 created_by
  -- 任何無效的值都會被轉為 NULL（外鍵允許 NULL）
  -- =====================================================
  IF p_created_by IS NOT NULL THEN
    -- 先嘗試用 id 查詢
    SELECT id INTO v_user_profile_id
    FROM user_profiles
    WHERE id = p_created_by;

    -- 如果找不到，嘗試用 user_id 查詢（可能傳入的是 auth.users.id）
    IF v_user_profile_id IS NULL THEN
      SELECT id INTO v_user_profile_id
      FROM user_profiles
      WHERE user_id = p_created_by;
    END IF;

    -- 如果都找不到，v_user_profile_id 保持 NULL
    -- 這是安全的，因為 orders.created_by 允許 NULL
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
    v_user_profile_id,  -- 使用驗證過的值（有效 ID 或 NULL）
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
    p.name,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 新增註解
COMMENT ON FUNCTION create_order_from_quotation IS 'v7: 從報價單建立訂單。自動處理無效的 created_by 值（轉為 NULL）';

-- 驗證函數已更新
DO $$
BEGIN
  RAISE NOTICE '函數 create_order_from_quotation 已更新為 v7 版本';
END $$;
