-- ============================================================================
-- Migration: 047_accounting_rpc_functions.sql
-- Created: 2025-12-15
-- Description: 建立會計系統 RPC 函數（取代 Prisma Transaction）
-- ============================================================================

-- ============================================================================
-- 1. 建立會計傳票與分錄（原子性操作）
-- ============================================================================

CREATE OR REPLACE FUNCTION create_journal_with_transactions(
  p_company_id UUID,
  p_journal_data JSONB,
  p_transactions JSONB[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_journal_id UUID;
  v_journal_number VARCHAR(20);
  v_year INTEGER;
  v_month INTEGER;
  v_seq INTEGER;
  v_total_debit NUMERIC(15,2) := 0;
  v_total_credit NUMERIC(15,2) := 0;
  v_tx JSONB;
  v_result JSONB;
BEGIN
  -- 產生傳票編號
  v_year := EXTRACT(YEAR FROM COALESCE((p_journal_data->>'date')::DATE, CURRENT_DATE));
  v_month := EXTRACT(MONTH FROM COALESCE((p_journal_data->>'date')::DATE, CURRENT_DATE));

  SELECT COALESCE(MAX(SUBSTRING(journal_number FROM 10)::INTEGER), 0) + 1
  INTO v_seq
  FROM journal_entries
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM date) = v_year
    AND EXTRACT(MONTH FROM date) = v_month;

  v_journal_number := FORMAT('JE%04d%02d%04d', v_year, v_month, v_seq);

  -- 計算借貸方總額
  FOREACH v_tx IN ARRAY p_transactions LOOP
    v_total_debit := v_total_debit + COALESCE((v_tx->>'debit')::NUMERIC, 0);
    v_total_credit := v_total_credit + COALESCE((v_tx->>'credit')::NUMERIC, 0);
  END LOOP;

  -- 驗證借貸平衡
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION '借貸不平衡：借方 % 貸方 %', v_total_debit, v_total_credit;
  END IF;

  -- 建立傳票
  INSERT INTO journal_entries (
    id,
    company_id,
    journal_number,
    date,
    description,
    source_type,
    source_id,
    total_amount,
    status,
    created_by
  ) VALUES (
    gen_random_uuid(),
    p_company_id,
    v_journal_number,
    COALESCE((p_journal_data->>'date')::DATE, CURRENT_DATE),
    p_journal_data->>'description',
    COALESCE(p_journal_data->>'source_type', 'MANUAL')::journal_source_type,
    (p_journal_data->>'source_id')::UUID,
    v_total_debit,
    'DRAFT'::journal_status,
    (p_journal_data->>'created_by')::UUID
  )
  RETURNING id INTO v_journal_id;

  -- 建立分錄
  FOREACH v_tx IN ARRAY p_transactions LOOP
    INSERT INTO acc_transactions (
      id,
      journal_entry_id,
      account_id,
      description,
      debit,
      credit,
      tax_code_id,
      counterparty_id,
      status
    ) VALUES (
      gen_random_uuid(),
      v_journal_id,
      (v_tx->>'account_id')::UUID,
      v_tx->>'description',
      COALESCE((v_tx->>'debit')::NUMERIC, 0),
      COALESCE((v_tx->>'credit')::NUMERIC, 0),
      (v_tx->>'tax_code_id')::UUID,
      (v_tx->>'counterparty_id')::UUID,
      'DRAFT'::transaction_status
    );
  END LOOP;

  -- 回傳結果
  SELECT jsonb_build_object(
    'id', je.id,
    'journal_number', je.journal_number,
    'date', je.date,
    'total_amount', je.total_amount,
    'status', je.status
  )
  INTO v_result
  FROM journal_entries je
  WHERE je.id = v_journal_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_journal_with_transactions IS '建立會計傳票與分錄（原子性操作）';

-- ============================================================================
-- 2. 過帳發票並產生傳票
-- ============================================================================

CREATE OR REPLACE FUNCTION post_invoice_with_journal(
  p_invoice_id UUID,
  p_posted_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice RECORD;
  v_journal_id UUID;
  v_ar_account_id UUID;
  v_ap_account_id UUID;
  v_revenue_account_id UUID;
  v_expense_account_id UUID;
  v_tax_account_id UUID;
  v_result JSONB;
BEGIN
  -- 取得發票資料
  SELECT *
  INTO v_invoice
  FROM acc_invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '發票不存在: %', p_invoice_id;
  END IF;

  IF v_invoice.status != 'VERIFIED' THEN
    RAISE EXCEPTION '發票狀態必須為已審核才能過帳，當前狀態: %', v_invoice.status;
  END IF;

  -- 取得相關會計科目
  SELECT id INTO v_ar_account_id FROM accounts WHERE code = '1131' AND (company_id = v_invoice.company_id OR company_id IS NULL) LIMIT 1;
  SELECT id INTO v_ap_account_id FROM accounts WHERE code = '2141' AND (company_id = v_invoice.company_id OR company_id IS NULL) LIMIT 1;
  SELECT id INTO v_revenue_account_id FROM accounts WHERE code = '4111' AND (company_id = v_invoice.company_id OR company_id IS NULL) LIMIT 1;
  SELECT id INTO v_expense_account_id FROM accounts WHERE code = '5111' AND (company_id = v_invoice.company_id OR company_id IS NULL) LIMIT 1;
  SELECT id INTO v_tax_account_id FROM accounts WHERE code = '2171' AND (company_id = v_invoice.company_id OR company_id IS NULL) LIMIT 1;

  -- 建立傳票
  INSERT INTO journal_entries (
    id,
    company_id,
    journal_number,
    date,
    description,
    source_type,
    source_id,
    total_amount,
    status,
    created_by
  ) VALUES (
    gen_random_uuid(),
    v_invoice.company_id,
    'JE' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    v_invoice.date,
    CASE v_invoice.type
      WHEN 'OUTPUT' THEN '銷項發票 ' || v_invoice.invoice_number
      WHEN 'INPUT' THEN '進項發票 ' || v_invoice.invoice_number
    END,
    'INVOICE',
    v_invoice.id,
    v_invoice.total_amount,
    'POSTED',
    p_posted_by
  )
  RETURNING id INTO v_journal_id;

  -- 根據發票類型建立分錄
  IF v_invoice.type = 'OUTPUT' THEN
    -- 銷項發票：借：應收帳款，貸：營業收入 + 銷項稅額
    INSERT INTO acc_transactions (id, journal_entry_id, account_id, description, debit, credit, status)
    VALUES
      (gen_random_uuid(), v_journal_id, v_ar_account_id, '應收帳款', v_invoice.total_amount, 0, 'POSTED'),
      (gen_random_uuid(), v_journal_id, v_revenue_account_id, '營業收入', 0, v_invoice.untaxed_amount, 'POSTED');

    IF v_invoice.tax_amount > 0 THEN
      INSERT INTO acc_transactions (id, journal_entry_id, account_id, description, debit, credit, status)
      VALUES (gen_random_uuid(), v_journal_id, v_tax_account_id, '銷項稅額', 0, v_invoice.tax_amount, 'POSTED');
    END IF;
  ELSE
    -- 進項發票：借：費用 + 進項稅額，貸：應付帳款
    INSERT INTO acc_transactions (id, journal_entry_id, account_id, description, debit, credit, status)
    VALUES
      (gen_random_uuid(), v_journal_id, v_expense_account_id, '進貨成本', v_invoice.untaxed_amount, 0, 'POSTED'),
      (gen_random_uuid(), v_journal_id, v_ap_account_id, '應付帳款', 0, v_invoice.total_amount, 'POSTED');

    IF v_invoice.tax_amount > 0 THEN
      INSERT INTO acc_transactions (id, journal_entry_id, account_id, description, debit, credit, status)
      VALUES (gen_random_uuid(), v_journal_id, v_tax_account_id, '進項稅額', v_invoice.tax_amount, 0, 'POSTED');
    END IF;
  END IF;

  -- 更新發票狀態
  UPDATE acc_invoices
  SET
    status = 'POSTED',
    journal_entry_id = v_journal_id,
    posted_at = NOW(),
    posted_by = p_posted_by,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  -- 回傳結果
  v_result := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'journal_entry_id', v_journal_id,
    'status', 'POSTED'
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION post_invoice_with_journal IS '過帳發票並自動產生會計傳票';

-- ============================================================================
-- 3. 作廢發票
-- ============================================================================

CREATE OR REPLACE FUNCTION void_invoice(
  p_invoice_id UUID,
  p_voided_by UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice RECORD;
  v_result JSONB;
BEGIN
  -- 取得發票資料
  SELECT *
  INTO v_invoice
  FROM acc_invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '發票不存在: %', p_invoice_id;
  END IF;

  IF v_invoice.status = 'VOIDED' THEN
    RAISE EXCEPTION '發票已經作廢';
  END IF;

  -- 如果已過帳，需要作廢相關傳票
  IF v_invoice.journal_entry_id IS NOT NULL THEN
    UPDATE journal_entries
    SET
      status = 'VOIDED',
      updated_at = NOW()
    WHERE id = v_invoice.journal_entry_id;

    UPDATE acc_transactions
    SET
      status = 'VOIDED',
      updated_at = NOW()
    WHERE journal_entry_id = v_invoice.journal_entry_id;
  END IF;

  -- 更新發票狀態
  UPDATE acc_invoices
  SET
    status = 'VOIDED',
    voided_at = NOW(),
    voided_by = p_voided_by,
    void_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  v_result := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'status', 'VOIDED',
    'voided_at', NOW()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION void_invoice IS '作廢發票及相關傳票';

-- ============================================================================
-- 4. 過帳傳票
-- ============================================================================

CREATE OR REPLACE FUNCTION post_journal_entry(
  p_journal_id UUID,
  p_posted_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_journal RECORD;
  v_total_debit NUMERIC(15,2);
  v_total_credit NUMERIC(15,2);
  v_result JSONB;
BEGIN
  -- 取得傳票資料
  SELECT *
  INTO v_journal
  FROM journal_entries
  WHERE id = p_journal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '傳票不存在: %', p_journal_id;
  END IF;

  IF v_journal.status != 'DRAFT' THEN
    RAISE EXCEPTION '只能過帳草稿狀態的傳票，當前狀態: %', v_journal.status;
  END IF;

  -- 驗證借貸平衡
  SELECT
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM acc_transactions
  WHERE journal_entry_id = p_journal_id;

  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION '借貸不平衡：借方 % 貸方 %', v_total_debit, v_total_credit;
  END IF;

  -- 更新傳票狀態
  UPDATE journal_entries
  SET
    status = 'POSTED',
    posted_at = NOW(),
    posted_by = p_posted_by,
    updated_at = NOW()
  WHERE id = p_journal_id;

  -- 更新分錄狀態
  UPDATE acc_transactions
  SET
    status = 'POSTED',
    updated_at = NOW()
  WHERE journal_entry_id = p_journal_id;

  v_result := jsonb_build_object(
    'journal_id', p_journal_id,
    'status', 'POSTED',
    'total_debit', v_total_debit,
    'total_credit', v_total_credit
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION post_journal_entry IS '過帳會計傳票';

-- ============================================================================
-- 5. 作廢傳票
-- ============================================================================

CREATE OR REPLACE FUNCTION void_journal_entry(
  p_journal_id UUID,
  p_voided_by UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_journal RECORD;
  v_result JSONB;
BEGIN
  -- 取得傳票資料
  SELECT *
  INTO v_journal
  FROM journal_entries
  WHERE id = p_journal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '傳票不存在: %', p_journal_id;
  END IF;

  IF v_journal.status = 'VOIDED' THEN
    RAISE EXCEPTION '傳票已經作廢';
  END IF;

  -- 更新傳票狀態
  UPDATE journal_entries
  SET
    status = 'VOIDED',
    updated_at = NOW()
  WHERE id = p_journal_id;

  -- 更新分錄狀態
  UPDATE acc_transactions
  SET
    status = 'VOIDED',
    updated_at = NOW()
  WHERE journal_entry_id = p_journal_id;

  v_result := jsonb_build_object(
    'journal_id', p_journal_id,
    'status', 'VOIDED',
    'voided_at', NOW()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION void_journal_entry IS '作廢會計傳票';

-- ============================================================================
-- 6. 取得試算表
-- ============================================================================

CREATE OR REPLACE FUNCTION get_trial_balance(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code VARCHAR(10),
  account_name VARCHAR(100),
  category account_category,
  debit_total NUMERIC(15,2),
  credit_total NUMERIC(15,2),
  balance NUMERIC(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.category,
    COALESCE(SUM(t.debit), 0) AS debit_total,
    COALESCE(SUM(t.credit), 0) AS credit_total,
    COALESCE(SUM(t.debit), 0) - COALESCE(SUM(t.credit), 0) AS balance
  FROM accounts a
  LEFT JOIN acc_transactions t ON t.account_id = a.id AND t.status = 'POSTED'
  LEFT JOIN journal_entries je ON je.id = t.journal_entry_id
    AND je.status = 'POSTED'
    AND je.date >= p_start_date
    AND je.date <= p_end_date
  WHERE a.company_id = p_company_id OR a.company_id IS NULL
    AND a.is_active = true
  GROUP BY a.id, a.code, a.name, a.category
  HAVING COALESCE(SUM(t.debit), 0) != 0 OR COALESCE(SUM(t.credit), 0) != 0
  ORDER BY a.code;
END;
$$;

COMMENT ON FUNCTION get_trial_balance IS '取得試算表';

-- ============================================================================
-- 7. 銀行交易配對
-- ============================================================================

CREATE OR REPLACE FUNCTION match_bank_transaction(
  p_bank_transaction_id UUID,
  p_journal_entry_id UUID,
  p_matched_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bank_tx RECORD;
  v_result JSONB;
BEGIN
  -- 取得銀行交易
  SELECT *
  INTO v_bank_tx
  FROM bank_transactions
  WHERE id = p_bank_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '銀行交易不存在: %', p_bank_transaction_id;
  END IF;

  IF v_bank_tx.reconciliation_status = 'MATCHED' THEN
    RAISE EXCEPTION '銀行交易已配對';
  END IF;

  -- 驗證傳票存在
  IF NOT EXISTS (SELECT 1 FROM journal_entries WHERE id = p_journal_entry_id) THEN
    RAISE EXCEPTION '傳票不存在: %', p_journal_entry_id;
  END IF;

  -- 更新銀行交易
  UPDATE bank_transactions
  SET
    reconciliation_status = 'MATCHED',
    matched_journal_entry_id = p_journal_entry_id,
    matched_at = NOW(),
    matched_by = p_matched_by,
    updated_at = NOW()
  WHERE id = p_bank_transaction_id;

  v_result := jsonb_build_object(
    'bank_transaction_id', p_bank_transaction_id,
    'journal_entry_id', p_journal_entry_id,
    'status', 'MATCHED'
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION match_bank_transaction IS '銀行交易與傳票配對';

-- ============================================================================
-- 8. 發票付款記錄
-- ============================================================================

CREATE OR REPLACE FUNCTION record_invoice_payment(
  p_invoice_id UUID,
  p_amount NUMERIC(15,2),
  p_payment_date DATE,
  p_payment_method VARCHAR(50),
  p_reference VARCHAR(100),
  p_recorded_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice RECORD;
  v_new_paid NUMERIC(15,2);
  v_new_status acc_payment_status;
  v_result JSONB;
BEGIN
  -- 取得發票
  SELECT *
  INTO v_invoice
  FROM acc_invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '發票不存在: %', p_invoice_id;
  END IF;

  IF v_invoice.status = 'VOIDED' THEN
    RAISE EXCEPTION '無法對已作廢發票記錄付款';
  END IF;

  -- 計算新的已付金額
  v_new_paid := COALESCE(v_invoice.paid_amount, 0) + p_amount;

  -- 判斷新狀態
  IF v_new_paid >= v_invoice.total_amount THEN
    v_new_status := 'PAID';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'PARTIAL';
  ELSE
    v_new_status := 'UNPAID';
  END IF;

  -- 建立付款記錄
  INSERT INTO invoice_payments (
    id,
    invoice_id,
    amount,
    payment_date,
    payment_method,
    reference,
    created_by
  ) VALUES (
    gen_random_uuid(),
    p_invoice_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_reference,
    p_recorded_by
  );

  -- 更新發票
  UPDATE acc_invoices
  SET
    paid_amount = v_new_paid,
    payment_status = v_new_status,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  v_result := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'amount', p_amount,
    'total_paid', v_new_paid,
    'payment_status', v_new_status
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION record_invoice_payment IS '記錄發票付款';

-- ============================================================================
-- 授權
-- ============================================================================

-- 允許 authenticated 使用者呼叫這些函數
GRANT EXECUTE ON FUNCTION create_journal_with_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION post_invoice_with_journal TO authenticated;
GRANT EXECUTE ON FUNCTION void_invoice TO authenticated;
GRANT EXECUTE ON FUNCTION post_journal_entry TO authenticated;
GRANT EXECUTE ON FUNCTION void_journal_entry TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_balance TO authenticated;
GRANT EXECUTE ON FUNCTION match_bank_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION record_invoice_payment TO authenticated;
