-- ============================================================================
-- Migration: 048_pos_rpc_functions.sql
-- Created: 2025-12-15
-- Description: 建立 POS 系統 RPC 函數（取代 Prisma Transaction）
-- ============================================================================

-- ============================================================================
-- 1. 建立完整銷售交易（包含項目、付款、抽成）
-- ============================================================================

CREATE OR REPLACE FUNCTION create_sales_transaction(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_transaction_data JSONB,
  p_items JSONB[],
  p_payments JSONB[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_transaction_no VARCHAR(20);
  v_year INTEGER;
  v_month INTEGER;
  v_day INTEGER;
  v_seq INTEGER;
  v_item JSONB;
  v_payment JSONB;
  v_total_amount NUMERIC(15,2) := 0;
  v_payment_total NUMERIC(15,2) := 0;
  v_result JSONB;
BEGIN
  -- 產生交易編號
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month := EXTRACT(MONTH FROM CURRENT_DATE);
  v_day := EXTRACT(DAY FROM CURRENT_DATE);

  SELECT COALESCE(MAX(SUBSTRING(transaction_no FROM 13)::INTEGER), 0) + 1
  INTO v_seq
  FROM sales_transactions
  WHERE branch_id = p_branch_id
    AND transaction_date = CURRENT_DATE;

  v_transaction_no := FORMAT('TX%04d%02d%02d%04d', v_year, v_month, v_day, v_seq);

  -- 計算項目總金額
  FOREACH v_item IN ARRAY p_items LOOP
    v_total_amount := v_total_amount + COALESCE((v_item->>'subtotal')::NUMERIC, 0);
  END LOOP;

  -- 建立交易主檔
  INSERT INTO sales_transactions (
    id,
    tenant_id,
    branch_id,
    transaction_no,
    transaction_date,
    member_id,
    total_amount,
    discount_type,
    discount_value,
    final_amount,
    invoice_number,
    notes,
    status,
    created_by
  ) VALUES (
    gen_random_uuid(),
    p_tenant_id,
    p_branch_id,
    v_transaction_no,
    CURRENT_DATE,
    (p_transaction_data->>'member_id')::UUID,
    v_total_amount,
    COALESCE((p_transaction_data->>'discount_type')::discount_type, 'NONE'),
    COALESCE((p_transaction_data->>'discount_value')::NUMERIC, 0),
    COALESCE((p_transaction_data->>'final_amount')::NUMERIC, v_total_amount),
    p_transaction_data->>'invoice_number',
    p_transaction_data->>'notes',
    'COMPLETED',
    (p_transaction_data->>'created_by')::UUID
  )
  RETURNING id INTO v_transaction_id;

  -- 建立交易項目
  FOREACH v_item IN ARRAY p_items LOOP
    INSERT INTO transaction_items (
      id,
      transaction_id,
      service_id,
      staff_id,
      quantity,
      unit_price,
      discount_amount,
      subtotal,
      notes
    ) VALUES (
      gen_random_uuid(),
      v_transaction_id,
      (v_item->>'service_id')::UUID,
      (v_item->>'staff_id')::UUID,
      COALESCE((v_item->>'quantity')::INTEGER, 1),
      COALESCE((v_item->>'unit_price')::NUMERIC, 0),
      COALESCE((v_item->>'discount_amount')::NUMERIC, 0),
      COALESCE((v_item->>'subtotal')::NUMERIC, 0),
      v_item->>'notes'
    );
  END LOOP;

  -- 建立付款記錄
  FOREACH v_payment IN ARRAY p_payments LOOP
    v_payment_total := v_payment_total + COALESCE((v_payment->>'amount')::NUMERIC, 0);

    INSERT INTO transaction_payments (
      id,
      transaction_id,
      payment_method,
      amount,
      reference
    ) VALUES (
      gen_random_uuid(),
      v_transaction_id,
      (v_payment->>'payment_method')::payment_method_type,
      COALESCE((v_payment->>'amount')::NUMERIC, 0),
      v_payment->>'reference'
    );

    -- 如果使用會員餘額付款，扣除餘額
    IF (v_payment->>'payment_method') = 'BALANCE' AND (p_transaction_data->>'member_id') IS NOT NULL THEN
      UPDATE pos_members
      SET
        balance = balance - COALESCE((v_payment->>'amount')::NUMERIC, 0),
        updated_at = NOW()
      WHERE id = (p_transaction_data->>'member_id')::UUID;
    END IF;
  END LOOP;

  -- 驗證付款金額
  IF v_payment_total < COALESCE((p_transaction_data->>'final_amount')::NUMERIC, v_total_amount) THEN
    RAISE EXCEPTION '付款金額不足：應付 %，實付 %',
      COALESCE((p_transaction_data->>'final_amount')::NUMERIC, v_total_amount), v_payment_total;
  END IF;

  -- 更新會員消費累積
  IF (p_transaction_data->>'member_id') IS NOT NULL THEN
    UPDATE pos_members
    SET
      total_spent = COALESCE(total_spent, 0) + COALESCE((p_transaction_data->>'final_amount')::NUMERIC, v_total_amount),
      visit_count = COALESCE(visit_count, 0) + 1,
      last_visit_at = NOW(),
      updated_at = NOW()
    WHERE id = (p_transaction_data->>'member_id')::UUID;
  END IF;

  -- 回傳結果
  SELECT jsonb_build_object(
    'id', st.id,
    'transaction_no', st.transaction_no,
    'total_amount', st.total_amount,
    'final_amount', st.final_amount,
    'status', st.status
  )
  INTO v_result
  FROM sales_transactions st
  WHERE st.id = v_transaction_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_sales_transaction IS '建立完整銷售交易（包含項目與付款）';

-- ============================================================================
-- 2. 作廢銷售交易
-- ============================================================================

CREATE OR REPLACE FUNCTION void_sales_transaction(
  p_transaction_id UUID,
  p_voided_by UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_payment RECORD;
  v_result JSONB;
BEGIN
  -- 取得交易資料
  SELECT *
  INTO v_transaction
  FROM sales_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '交易不存在: %', p_transaction_id;
  END IF;

  IF v_transaction.status = 'VOIDED' THEN
    RAISE EXCEPTION '交易已作廢';
  END IF;

  IF v_transaction.settlement_id IS NOT NULL THEN
    RAISE EXCEPTION '交易已日結，無法作廢';
  END IF;

  -- 退還會員餘額（如果有使用）
  FOR v_payment IN
    SELECT * FROM transaction_payments
    WHERE transaction_id = p_transaction_id
      AND payment_method = 'BALANCE'
  LOOP
    UPDATE pos_members
    SET
      balance = balance + v_payment.amount,
      updated_at = NOW()
    WHERE id = v_transaction.member_id;
  END LOOP;

  -- 回退會員消費累積
  IF v_transaction.member_id IS NOT NULL THEN
    UPDATE pos_members
    SET
      total_spent = GREATEST(0, COALESCE(total_spent, 0) - v_transaction.final_amount),
      visit_count = GREATEST(0, COALESCE(visit_count, 0) - 1),
      updated_at = NOW()
    WHERE id = v_transaction.member_id;
  END IF;

  -- 更新交易狀態
  UPDATE sales_transactions
  SET
    status = 'VOIDED',
    voided_at = NOW(),
    voided_by = p_voided_by,
    void_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_transaction_id;

  v_result := jsonb_build_object(
    'transaction_id', p_transaction_id,
    'status', 'VOIDED',
    'voided_at', NOW()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION void_sales_transaction IS '作廢銷售交易';

-- ============================================================================
-- 3. 會員儲值
-- ============================================================================

CREATE OR REPLACE FUNCTION process_member_deposit(
  p_member_id UUID,
  p_amount NUMERIC(15,2),
  p_bonus_amount NUMERIC(15,2),
  p_payment_method payment_method_type,
  p_reference VARCHAR(100),
  p_processed_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member RECORD;
  v_deposit_id UUID;
  v_new_balance NUMERIC(15,2);
  v_result JSONB;
BEGIN
  -- 取得會員資料
  SELECT *
  INTO v_member
  FROM pos_members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '會員不存在: %', p_member_id;
  END IF;

  IF NOT v_member.is_active THEN
    RAISE EXCEPTION '會員已停用';
  END IF;

  -- 計算新餘額
  v_new_balance := COALESCE(v_member.balance, 0) + p_amount + COALESCE(p_bonus_amount, 0);

  -- 建立儲值記錄
  INSERT INTO member_deposits (
    id,
    member_id,
    amount,
    bonus_amount,
    payment_method,
    reference,
    balance_before,
    balance_after,
    created_by
  ) VALUES (
    gen_random_uuid(),
    p_member_id,
    p_amount,
    COALESCE(p_bonus_amount, 0),
    p_payment_method,
    p_reference,
    COALESCE(v_member.balance, 0),
    v_new_balance,
    p_processed_by
  )
  RETURNING id INTO v_deposit_id;

  -- 更新會員餘額
  UPDATE pos_members
  SET
    balance = v_new_balance,
    total_deposit = COALESCE(total_deposit, 0) + p_amount,
    updated_at = NOW()
  WHERE id = p_member_id;

  v_result := jsonb_build_object(
    'deposit_id', v_deposit_id,
    'member_id', p_member_id,
    'amount', p_amount,
    'bonus_amount', COALESCE(p_bonus_amount, 0),
    'new_balance', v_new_balance
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION process_member_deposit IS '處理會員儲值';

-- ============================================================================
-- 4. 建立或取得日結帳
-- ============================================================================

CREATE OR REPLACE FUNCTION create_or_get_settlement(
  p_branch_id UUID,
  p_settlement_date DATE,
  p_deposit_received NUMERIC(15,2) DEFAULT 0,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing RECORD;
  v_branch RECORD;
  v_settlement_id UUID;
  v_summary RECORD;
  v_result JSONB;
BEGIN
  -- 檢查是否已存在
  SELECT *
  INTO v_existing
  FROM daily_settlements
  WHERE branch_id = p_branch_id
    AND settlement_date = p_settlement_date;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_existing.id,
      'settlement_date', v_existing.settlement_date,
      'status', v_existing.status,
      'is_new', false
    );
  END IF;

  -- 取得分店資料
  SELECT *
  INTO v_branch
  FROM branches
  WHERE id = p_branch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '分店不存在: %', p_branch_id;
  END IF;

  -- 計算當日銷售統計
  SELECT
    COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN final_amount ELSE 0 END), 0) AS total_sales,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS transaction_count,
    COUNT(CASE WHEN status = 'VOIDED' THEN 1 END) AS voided_count,
    COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN final_amount ELSE 0 END), 0) AS refunded_amount
  INTO v_summary
  FROM sales_transactions
  WHERE branch_id = p_branch_id
    AND transaction_date = p_settlement_date;

  -- 計算各支付方式金額
  WITH payment_summary AS (
    SELECT
      tp.payment_method,
      COALESCE(SUM(tp.amount), 0) AS amount
    FROM transaction_payments tp
    JOIN sales_transactions st ON st.id = tp.transaction_id
    WHERE st.branch_id = p_branch_id
      AND st.transaction_date = p_settlement_date
      AND st.status = 'COMPLETED'
    GROUP BY tp.payment_method
  )
  SELECT
    COALESCE((SELECT amount FROM payment_summary WHERE payment_method = 'CASH'), 0),
    COALESCE((SELECT amount FROM payment_summary WHERE payment_method = 'CARD'), 0),
    COALESCE((SELECT amount FROM payment_summary WHERE payment_method = 'BALANCE'), 0)
  INTO v_summary.cash_amount, v_summary.card_amount, v_summary.balance_used
  FROM (SELECT 1) AS dummy;

  -- 建立日結帳
  INSERT INTO daily_settlements (
    id,
    branch_id,
    settlement_date,
    total_sales,
    transaction_count,
    voided_count,
    refunded_amount,
    cash_amount,
    card_amount,
    deposit_used,
    other_amount,
    deposit_received,
    expected_cash,
    status,
    is_locked,
    created_by
  ) VALUES (
    gen_random_uuid(),
    p_branch_id,
    p_settlement_date,
    v_summary.total_sales,
    v_summary.transaction_count,
    v_summary.voided_count,
    v_summary.refunded_amount,
    COALESCE(v_summary.cash_amount, 0),
    COALESCE(v_summary.card_amount, 0),
    COALESCE(v_summary.balance_used, 0),
    0,
    p_deposit_received,
    COALESCE(v_summary.cash_amount, 0),
    'PENDING',
    false,
    p_created_by
  )
  RETURNING id INTO v_settlement_id;

  v_result := jsonb_build_object(
    'id', v_settlement_id,
    'settlement_date', p_settlement_date,
    'total_sales', v_summary.total_sales,
    'transaction_count', v_summary.transaction_count,
    'status', 'PENDING',
    'is_new', true
  );

  RETURN v_result;

EXCEPTION
  WHEN unique_violation THEN
    -- 競爭條件，重新取得
    SELECT jsonb_build_object(
      'id', ds.id,
      'settlement_date', ds.settlement_date,
      'status', ds.status,
      'is_new', false
    )
    INTO v_result
    FROM daily_settlements ds
    WHERE ds.branch_id = p_branch_id
      AND ds.settlement_date = p_settlement_date;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_or_get_settlement IS '建立或取得日結帳';

-- ============================================================================
-- 5. 盤點現金並審核
-- ============================================================================

CREATE OR REPLACE FUNCTION count_and_approve_settlement(
  p_settlement_id UUID,
  p_actual_cash NUMERIC(15,2),
  p_variance_reason TEXT,
  p_approved_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settlement RECORD;
  v_variance NUMERIC(15,2);
  v_has_variance BOOLEAN;
  v_result JSONB;
BEGIN
  -- 取得日結帳
  SELECT *
  INTO v_settlement
  FROM daily_settlements
  WHERE id = p_settlement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '日結帳不存在: %', p_settlement_id;
  END IF;

  IF v_settlement.is_locked THEN
    RAISE EXCEPTION '日結帳已鎖定';
  END IF;

  -- 計算差異
  v_variance := p_actual_cash - v_settlement.expected_cash;
  v_has_variance := ABS(v_variance) > 0.01;

  -- 如果有差異但沒有說明
  IF v_has_variance AND (p_variance_reason IS NULL OR p_variance_reason = '') THEN
    -- 只更新盤點資料，不審核
    UPDATE daily_settlements
    SET
      actual_cash = p_actual_cash,
      cash_variance = v_variance,
      status = 'VARIANCE',
      updated_at = NOW()
    WHERE id = p_settlement_id;

    RETURN jsonb_build_object(
      'settlement_id', p_settlement_id,
      'status', 'VARIANCE',
      'variance', v_variance,
      'message', '有現金差異，請說明原因後再審核'
    );
  END IF;

  -- 更新並審核
  UPDATE daily_settlements
  SET
    actual_cash = p_actual_cash,
    cash_variance = v_variance,
    variance_reason = p_variance_reason,
    status = 'APPROVED',
    approved_by = p_approved_by,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_settlement_id;

  v_result := jsonb_build_object(
    'settlement_id', p_settlement_id,
    'status', 'APPROVED',
    'actual_cash', p_actual_cash,
    'expected_cash', v_settlement.expected_cash,
    'variance', v_variance
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION count_and_approve_settlement IS '盤點現金並審核日結帳';

-- ============================================================================
-- 6. 鎖定日結帳
-- ============================================================================

CREATE OR REPLACE FUNCTION lock_settlement(
  p_settlement_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settlement RECORD;
  v_result JSONB;
BEGIN
  -- 取得日結帳
  SELECT *
  INTO v_settlement
  FROM daily_settlements
  WHERE id = p_settlement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '日結帳不存在: %', p_settlement_id;
  END IF;

  IF v_settlement.status != 'APPROVED' THEN
    RAISE EXCEPTION '只能鎖定已審核的日結帳，當前狀態: %', v_settlement.status;
  END IF;

  -- 關聯當日交易
  UPDATE sales_transactions
  SET
    settlement_id = p_settlement_id,
    updated_at = NOW()
  WHERE branch_id = v_settlement.branch_id
    AND transaction_date = v_settlement.settlement_date
    AND settlement_id IS NULL;

  -- 鎖定日結帳
  UPDATE daily_settlements
  SET
    status = 'LOCKED',
    is_locked = true,
    locked_at = NOW(),
    updated_at = NOW()
  WHERE id = p_settlement_id;

  v_result := jsonb_build_object(
    'settlement_id', p_settlement_id,
    'status', 'LOCKED',
    'locked_at', NOW()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION lock_settlement IS '鎖定日結帳';

-- ============================================================================
-- 7. 計算員工抽成
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_transaction_commissions(
  p_transaction_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_item RECORD;
  v_rule RECORD;
  v_commission_amount NUMERIC(15,2);
  v_total_commission NUMERIC(15,2) := 0;
  v_result JSONB;
BEGIN
  -- 取得交易資料
  SELECT *
  INTO v_transaction
  FROM sales_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '交易不存在: %', p_transaction_id;
  END IF;

  -- 刪除既有的抽成記錄
  DELETE FROM transaction_commissions WHERE transaction_id = p_transaction_id;

  -- 遍歷交易項目
  FOR v_item IN
    SELECT ti.*, s.role
    FROM transaction_items ti
    JOIN staff s ON s.id = ti.staff_id
    WHERE ti.transaction_id = p_transaction_id
  LOOP
    -- 找對應的抽成規則
    SELECT *
    INTO v_rule
    FROM commission_rules
    WHERE tenant_id = v_transaction.tenant_id
      AND (service_id = v_item.service_id OR service_id IS NULL)
      AND (staff_role = v_item.role OR staff_role IS NULL)
      AND is_active = true
    ORDER BY
      CASE WHEN service_id IS NOT NULL THEN 0 ELSE 1 END,
      CASE WHEN staff_role IS NOT NULL THEN 0 ELSE 1 END
    LIMIT 1;

    IF FOUND THEN
      v_commission_amount := v_item.subtotal * v_rule.rate;

      INSERT INTO transaction_commissions (
        id,
        transaction_id,
        item_id,
        staff_id,
        rule_id,
        amount,
        rate
      ) VALUES (
        gen_random_uuid(),
        p_transaction_id,
        v_item.id,
        v_item.staff_id,
        v_rule.id,
        v_commission_amount,
        v_rule.rate
      );

      v_total_commission := v_total_commission + v_commission_amount;
    END IF;
  END LOOP;

  v_result := jsonb_build_object(
    'transaction_id', p_transaction_id,
    'total_commission', v_total_commission
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION calculate_transaction_commissions IS '計算交易的員工抽成';

-- ============================================================================
-- 8. 取得銷售統計
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sales_summary(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH tx_summary AS (
    SELECT
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS transaction_count,
      COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN final_amount ELSE 0 END), 0) AS total_sales,
      COUNT(CASE WHEN status = 'VOIDED' THEN 1 END) AS voided_count,
      COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN final_amount ELSE 0 END), 0) AS refunded_amount
    FROM sales_transactions
    WHERE tenant_id = p_tenant_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND transaction_date = p_date
  ),
  payment_summary AS (
    SELECT
      COALESCE(SUM(CASE WHEN tp.payment_method = 'CASH' THEN tp.amount ELSE 0 END), 0) AS cash_amount,
      COALESCE(SUM(CASE WHEN tp.payment_method = 'CARD' THEN tp.amount ELSE 0 END), 0) AS card_amount,
      COALESCE(SUM(CASE WHEN tp.payment_method = 'BALANCE' THEN tp.amount ELSE 0 END), 0) AS balance_used
    FROM transaction_payments tp
    JOIN sales_transactions st ON st.id = tp.transaction_id
    WHERE st.tenant_id = p_tenant_id
      AND (p_branch_id IS NULL OR st.branch_id = p_branch_id)
      AND st.transaction_date = p_date
      AND st.status = 'COMPLETED'
  )
  SELECT jsonb_build_object(
    'transaction_count', ts.transaction_count,
    'total_sales', ts.total_sales,
    'voided_count', ts.voided_count,
    'refunded_amount', ts.refunded_amount,
    'cash_amount', ps.cash_amount,
    'card_amount', ps.card_amount,
    'balance_used', ps.balance_used
  )
  INTO v_result
  FROM tx_summary ts, payment_summary ps;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_sales_summary IS '取得銷售統計';

-- ============================================================================
-- 授權
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_sales_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION void_sales_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION process_member_deposit TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_get_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION count_and_approve_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION lock_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_transaction_commissions TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_summary TO authenticated;
