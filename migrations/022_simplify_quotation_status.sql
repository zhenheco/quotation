-- Migration: 簡化報價單狀態
-- 將 rejected 轉換為 expired，將 approved 轉換為 accepted

-- 轉換現有狀態
UPDATE quotations SET status = 'expired' WHERE status = 'rejected';
UPDATE quotations SET status = 'accepted' WHERE status = 'approved';
