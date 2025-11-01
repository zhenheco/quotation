-- 報價單付款管理功能遷移
-- 執行位置：Supabase Dashboard > SQL Editor
-- 專案：https://nxlqtnnssfzzpbyfjnby.supabase.co

-- 1. 匯率欄位
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 4) DEFAULT 1;

-- 2. 付款狀態欄位
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue'));

-- 3. 付款到期日
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMP;

-- 4. 已付總額
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS total_paid NUMERIC(10, 2) DEFAULT 0;

-- 5. 訂金金額
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2);

-- 6. 訂金付款日期
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS deposit_paid_date TIMESTAMP;

-- 7. 尾款金額
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS final_payment_amount NUMERIC(10, 2);

-- 8. 尾款到期日
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS final_payment_due_date TIMESTAMP;

-- 9. 合約簽署日期
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS contract_signed_date TIMESTAMP;

-- 10. 合約到期日
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS contract_expiry_date TIMESTAMP;

-- 11. 收款頻率
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS payment_frequency TEXT
CHECK (payment_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual'));

-- 12. 下次收款日期
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS next_collection_date TIMESTAMP;

-- 13. 下次收款金額
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS next_collection_amount NUMERIC(10, 2);

-- 驗證新增的欄位
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'quotations'
AND column_name IN (
  'exchange_rate', 'payment_status', 'payment_due_date', 'total_paid',
  'deposit_amount', 'deposit_paid_date', 'final_payment_amount',
  'final_payment_due_date', 'contract_signed_date', 'contract_expiry_date',
  'payment_frequency', 'next_collection_date', 'next_collection_amount'
)
ORDER BY ordinal_position;
