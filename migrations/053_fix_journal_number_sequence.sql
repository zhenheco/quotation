-- ============================================================================
-- Migration 053: 修復傳票編號序號邏輯
-- 問題: 資料庫中存在多種傳票編號格式 (2024121886, JV-2024-001, 0020241205)
--       原 RPC 假設所有編號都是 YYYYMMNNNN 格式，導致 SUBSTRING 轉型失敗
-- 解決: 只考慮符合標準格式的編號來計算下一個序號
-- ============================================================================

-- 重新建立 post_invoice_with_journal 函數
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
  v_journal_number VARCHAR(20);
  v_year INTEGER;
  v_month INTEGER;
  v_seq INTEGER;
  v_year_month_prefix VARCHAR(6);
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

  -- 產生傳票編號
  v_year := EXTRACT(YEAR FROM v_invoice.date);
  v_month := EXTRACT(MONTH FROM v_invoice.date);
  -- 使用 TO_CHAR 格式化年月前綴 (PostgreSQL FORMAT 不支援 %d)
  v_year_month_prefix := TO_CHAR(v_year, 'FM0000') || TO_CHAR(v_month, 'FM00');

  -- 修正: 只考慮符合 YYYYMMNNNN 格式的編號 (10位數字，且前6位匹配年月)
  SELECT COALESCE(
    MAX(
      CASE
        WHEN journal_number ~ '^\d{10}$'
         AND LEFT(journal_number, 6) = v_year_month_prefix
        THEN SUBSTRING(journal_number FROM 7)::INTEGER
        ELSE 0
      END
    ), 0
  ) + 1
  INTO v_seq
  FROM journal_entries
  WHERE company_id = v_invoice.company_id
    AND EXTRACT(YEAR FROM date) = v_year
    AND EXTRACT(MONTH FROM date) = v_month
    AND deleted_at IS NULL;

  -- 使用 TO_CHAR 格式化完整編號
  v_journal_number := TO_CHAR(v_year, 'FM0000') || TO_CHAR(v_month, 'FM00') || TO_CHAR(v_seq, 'FM0000');

  -- 取得相關會計科目 (修正: 2141 -> 2101 應付帳款)
  SELECT id INTO v_ar_account_id FROM accounts WHERE code = '1131' AND (company_id = v_invoice.company_id OR company_id IS NULL) LIMIT 1;
  SELECT id INTO v_ap_account_id FROM accounts WHERE code = '2101' AND (company_id = v_invoice.company_id OR company_id IS NULL) LIMIT 1;
  SELECT id INTO v_revenue_account_id FROM accounts WHERE code = '4111' AND (company_id = v_invoice.company_id OR company_id IS NULL) LIMIT 1;
  SELECT id INTO v_expense_account_id FROM accounts WHERE code = '5111' AND (company_id = v_invoice.company_id OR company_id IS NULL) LIMIT 1;
  SELECT id INTO v_tax_account_id FROM accounts WHERE code = '2171' AND (company_id = v_invoice.company_id OR company_id IS NULL) LIMIT 1;

  -- 檢查科目是否存在
  IF v_invoice.type = 'OUTPUT' AND (v_ar_account_id IS NULL OR v_revenue_account_id IS NULL) THEN
    RAISE EXCEPTION '缺少必要科目: 應收帳款(1131) 或 營業收入(4111)';
  END IF;

  IF v_invoice.type = 'INPUT' AND (v_ap_account_id IS NULL OR v_expense_account_id IS NULL) THEN
    RAISE EXCEPTION '缺少必要科目: 應付帳款(2101) 或 費用(5111)';
  END IF;

  -- 建立傳票
  INSERT INTO journal_entries (
    id,
    company_id,
    journal_number,
    date,
    description,
    source_type,
    invoice_id,
    status,
    is_auto_generated,
    posted_at,
    posted_by
  ) VALUES (
    gen_random_uuid(),
    v_invoice.company_id,
    v_journal_number,
    v_invoice.date,
    CASE v_invoice.type
      WHEN 'OUTPUT' THEN '銷項發票 ' || v_invoice.number
      WHEN 'INPUT' THEN '進項發票 ' || v_invoice.number
    END,
    'INVOICE'::transaction_source,
    v_invoice.id,
    'POSTED'::journal_status,
    true,
    NOW(),
    p_posted_by
  )
  RETURNING id INTO v_journal_id;

  -- 根據發票類型建立分錄
  IF v_invoice.type = 'OUTPUT' THEN
    -- 銷項發票：借：應收帳款，貸：營業收入 + 銷項稅額
    INSERT INTO acc_transactions (id, company_id, journal_entry_id, number, date, account_id, description, debit, credit, source_type, invoice_id, status, posted_at)
    VALUES
      (gen_random_uuid(), v_invoice.company_id, v_journal_id, v_journal_number, v_invoice.date, v_ar_account_id, '應收帳款', v_invoice.total_amount, 0, 'INVOICE', v_invoice.id, 'POSTED', NOW()),
      (gen_random_uuid(), v_invoice.company_id, v_journal_id, v_journal_number, v_invoice.date, v_revenue_account_id, '營業收入', 0, v_invoice.untaxed_amount, 'INVOICE', v_invoice.id, 'POSTED', NOW());

    IF v_invoice.tax_amount > 0 AND v_tax_account_id IS NOT NULL THEN
      INSERT INTO acc_transactions (id, company_id, journal_entry_id, number, date, account_id, description, debit, credit, source_type, invoice_id, status, posted_at)
      VALUES (gen_random_uuid(), v_invoice.company_id, v_journal_id, v_journal_number, v_invoice.date, v_tax_account_id, '銷項稅額', 0, v_invoice.tax_amount, 'INVOICE', v_invoice.id, 'POSTED', NOW());
    END IF;
  ELSE
    -- 進項發票：借：費用 + 進項稅額，貸：應付帳款
    INSERT INTO acc_transactions (id, company_id, journal_entry_id, number, date, account_id, description, debit, credit, source_type, invoice_id, status, posted_at)
    VALUES
      (gen_random_uuid(), v_invoice.company_id, v_journal_id, v_journal_number, v_invoice.date, v_expense_account_id, '進貨成本', v_invoice.untaxed_amount, 0, 'INVOICE', v_invoice.id, 'POSTED', NOW()),
      (gen_random_uuid(), v_invoice.company_id, v_journal_id, v_journal_number, v_invoice.date, v_ap_account_id, '應付帳款', 0, v_invoice.total_amount, 'INVOICE', v_invoice.id, 'POSTED', NOW());

    IF v_invoice.tax_amount > 0 AND v_tax_account_id IS NOT NULL THEN
      INSERT INTO acc_transactions (id, company_id, journal_entry_id, number, date, account_id, description, debit, credit, source_type, invoice_id, status, posted_at)
      VALUES (gen_random_uuid(), v_invoice.company_id, v_journal_id, v_journal_number, v_invoice.date, v_tax_account_id, '進項稅額', v_invoice.tax_amount, 0, 'INVOICE', v_invoice.id, 'POSTED', NOW());
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
    'journal_number', v_journal_number,
    'status', 'POSTED'
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION post_invoice_with_journal IS '過帳發票並自動產生會計傳票 - 修正多格式編號相容性';

-- 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('053_fix_journal_number_sequence.sql')
ON CONFLICT (filename) DO NOTHING;
