-- ⚠️ 已棄用：此腳本已被 migrations/081_fix_quotation_status_accepted.sql 取代
-- 請勿執行此腳本，它會造成狀態不一致問題
--
-- 正確的狀態值應該是：draft, sent, accepted, rejected, expired
-- 不要使用 'signed'，系統統一使用 'accepted'

-- 如果需要更新約束，請執行：
-- psql -f migrations/081_fix_quotation_status_accepted.sql

RAISE EXCEPTION '此腳本已棄用，請使用 migrations/081_fix_quotation_status_accepted.sql';
