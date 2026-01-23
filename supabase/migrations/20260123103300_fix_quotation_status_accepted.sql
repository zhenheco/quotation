-- Migration: 20260123103300_fix_quotation_status_accepted.sql
-- 修正報價單狀態約束，確保使用 'accepted' 而非 'signed'

-- 1. 先將任何 signed 狀態轉回 accepted
UPDATE quotations SET status = 'accepted' WHERE status = 'signed';

-- 2. 移除舊的 CHECK 約束（如果存在）
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;

-- 3. 新增正確的 CHECK 約束（使用 accepted，不是 signed）
ALTER TABLE quotations ADD CONSTRAINT quotations_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired'));
