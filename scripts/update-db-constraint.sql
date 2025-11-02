-- 移除舊的 CHECK 約束
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;

-- 新增新的 CHECK 約束
ALTER TABLE quotations ADD CONSTRAINT quotations_status_check
  CHECK (status IN ('draft', 'sent', 'signed', 'expired'));

-- 更新現有的 accepted 狀態為 signed
UPDATE quotations SET status = 'signed' WHERE status = 'accepted';

-- 更新現有的 rejected 狀態為 expired
UPDATE quotations SET status = 'rejected' WHERE status = 'rejected';

-- 更新現有的 pending 狀態為 sent
UPDATE quotations SET status = 'sent' WHERE status = 'pending';

-- 檢查結果
SELECT status, COUNT(*) as count
FROM quotations
GROUP BY status
ORDER BY status;
