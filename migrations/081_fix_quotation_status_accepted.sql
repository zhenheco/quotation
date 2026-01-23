-- Migration: 081_fix_quotation_status_accepted.sql
-- 修正報價單狀態約束，確保使用 'accepted' 而非 'signed'
-- 這是因為 scripts/update-db-constraint.sql 可能錯誤地將狀態改為 signed

-- 1. 先將任何 signed 狀態轉回 accepted
UPDATE quotations SET status = 'accepted' WHERE status = 'signed';

-- 2. 移除舊的 CHECK 約束（如果存在）
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;

-- 3. 新增正確的 CHECK 約束（使用 accepted，不是 signed）
ALTER TABLE quotations ADD CONSTRAINT quotations_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired'));

-- 4. 驗證 create_order_from_quotation 函數存在且使用正確的狀態
-- （該函數應該檢查 status = 'accepted'）

-- 5. 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('081_fix_quotation_status_accepted.sql')
ON CONFLICT (filename) DO NOTHING;

-- 6. 重新載入 schema cache
NOTIFY pgrst, 'reload schema';
