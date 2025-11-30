-- Migration: 將報價單編號改為按公司分組
-- 問題：quotation_number 有全域 UNIQUE 約束，導致不同公司間編號互撞
-- 解決：改為複合唯一約束 (company_id, quotation_number)

-- 1. 移除全域 UNIQUE 約束
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_quotation_number_key;

-- 2. 建立複合唯一約束 (company_id + quotation_number)
-- 這樣每個公司有獨立的編號命名空間
ALTER TABLE quotations
  ADD CONSTRAINT quotations_company_number_unique
  UNIQUE(company_id, quotation_number);

-- 3. 修改序列表：新增 company_id 欄位
ALTER TABLE quotation_number_sequences
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 4. 移除舊的唯一約束 (user_id, year_month)
ALTER TABLE quotation_number_sequences
  DROP CONSTRAINT IF EXISTS quotation_number_sequences_user_id_year_month_key;

-- 5. 建立新的唯一約束 (company_id, year_month)
-- 避免與舊約束衝突，先刪除可能存在的同名約束
ALTER TABLE quotation_number_sequences
  DROP CONSTRAINT IF EXISTS quotation_number_sequences_company_year_month_key;

ALTER TABLE quotation_number_sequences
  ADD CONSTRAINT quotation_number_sequences_company_year_month_key
  UNIQUE(company_id, year_month);

-- 6. 更新索引
DROP INDEX IF EXISTS idx_quotation_sequences_user_month;
CREATE INDEX IF NOT EXISTS idx_quotation_sequences_company_month
  ON quotation_number_sequences(company_id, year_month);

-- 7. 清理舊的 user_id 序列資料，並從現有報價單重建按公司分組的序列
DELETE FROM quotation_number_sequences WHERE company_id IS NULL;

INSERT INTO quotation_number_sequences (company_id, year_month, last_sequence)
SELECT
  company_id,
  SUBSTRING(quotation_number FROM 3 FOR 6) AS year_month,
  MAX(CAST(SUBSTRING(quotation_number FROM 10) AS INTEGER)) AS last_sequence
FROM quotations
WHERE quotation_number ~ '^QT[0-9]{6}-[0-9]{4}$'
  AND company_id IS NOT NULL
GROUP BY company_id, SUBSTRING(quotation_number FROM 3 FOR 6)
ON CONFLICT (company_id, year_month)
DO UPDATE SET last_sequence = GREATEST(
  quotation_number_sequences.last_sequence, EXCLUDED.last_sequence
);

-- 8. 刪除舊函數後建立新函數（參數名稱從 p_user_id 改為 p_company_id）
DROP FUNCTION IF EXISTS generate_quotation_number_atomic(UUID);

CREATE OR REPLACE FUNCTION generate_quotation_number_atomic(p_company_id UUID)
RETURNS VARCHAR(15) AS $$
DECLARE
  v_year_month VARCHAR(6);
  v_next_seq INTEGER;
  v_lock_key BIGINT;
BEGIN
  v_year_month := TO_CHAR(NOW(), 'YYYYMM');
  v_lock_key := hashtext(p_company_id::TEXT || v_year_month)::BIGINT;

  -- Advisory Lock（交易結束時自動釋放）
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 原子性 UPSERT：確保只有一個交易能更新序列
  INSERT INTO quotation_number_sequences (company_id, year_month, last_sequence)
  VALUES (p_company_id, v_year_month, 1)
  ON CONFLICT (company_id, year_month)
  DO UPDATE SET
    last_sequence = quotation_number_sequences.last_sequence + 1,
    updated_at = NOW()
  RETURNING last_sequence INTO v_next_seq;

  RETURN 'QT' || v_year_month || '-' || LPAD(v_next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 9. 可選：移除 user_id 欄位（如果確定不再需要）
-- 保留此欄位以便追蹤歷史，但設為可 NULL
ALTER TABLE quotation_number_sequences ALTER COLUMN user_id DROP NOT NULL;
