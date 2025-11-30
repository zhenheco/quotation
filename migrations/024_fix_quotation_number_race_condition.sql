-- Migration: 修復報價單編號競爭條件（Race Condition）
-- 問題：多個併發請求可能獲得相同編號導致 UNIQUE 約束違反

-- 1. 建立報價單編號序列表
CREATE TABLE IF NOT EXISTS quotation_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year_month VARCHAR(6) NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_quotation_sequences_user_month
  ON quotation_number_sequences(user_id, year_month);

-- 2. 從現有報價單初始化序列
INSERT INTO quotation_number_sequences (user_id, year_month, last_sequence)
SELECT
  user_id,
  SUBSTRING(quotation_number FROM 3 FOR 6) AS year_month,
  MAX(CAST(SUBSTRING(quotation_number FROM 10) AS INTEGER)) AS last_sequence
FROM quotations
WHERE quotation_number ~ '^QT[0-9]{6}-[0-9]{4}$'
GROUP BY user_id, SUBSTRING(quotation_number FROM 3 FOR 6)
ON CONFLICT (user_id, year_month)
DO UPDATE SET last_sequence = GREATEST(
  quotation_number_sequences.last_sequence, EXCLUDED.last_sequence
);

-- 3. 原子性報價單編號生成函數（使用 Advisory Lock 防止競爭條件）
CREATE OR REPLACE FUNCTION generate_quotation_number_atomic(p_user_id UUID)
RETURNS VARCHAR(15) AS $$
DECLARE
  v_year_month VARCHAR(6);
  v_next_seq INTEGER;
  v_lock_key BIGINT;
BEGIN
  v_year_month := TO_CHAR(NOW(), 'YYYYMM');
  v_lock_key := hashtext(p_user_id::TEXT || v_year_month)::BIGINT;

  -- Advisory Lock（交易結束時自動釋放）
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 原子性 UPSERT：確保只有一個交易能更新序列
  INSERT INTO quotation_number_sequences (user_id, year_month, last_sequence)
  VALUES (p_user_id, v_year_month, 1)
  ON CONFLICT (user_id, year_month)
  DO UPDATE SET
    last_sequence = quotation_number_sequences.last_sequence + 1,
    updated_at = NOW()
  RETURNING last_sequence INTO v_next_seq;

  RETURN 'QT' || v_year_month || '-' || LPAD(v_next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
