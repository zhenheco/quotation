-- ============================================================================
-- Migration: 051_cleanup_pos_functions.sql
-- Created: 2025-12-24
-- Description: 清理 049 遷移中因參數簽名不符而未刪除的 POS 函數
-- ============================================================================

-- ============================================================================
-- 刪除 POS 相關函數（使用正確的參數簽名）
-- ============================================================================

-- 交易相關
DROP FUNCTION IF EXISTS calculate_transaction_commissions(UUID);
DROP FUNCTION IF EXISTS create_sales_transaction(UUID, UUID, JSONB, JSONB[], JSONB[]);
DROP FUNCTION IF EXISTS void_sales_transaction(UUID, UUID, TEXT);

-- 日結相關
DROP FUNCTION IF EXISTS count_and_approve_settlement(UUID, NUMERIC, TEXT, UUID);
DROP FUNCTION IF EXISTS create_or_get_settlement(UUID, DATE, NUMERIC, UUID);
DROP FUNCTION IF EXISTS lock_settlement(UUID);
DROP FUNCTION IF EXISTS get_sales_summary(UUID, UUID, DATE);

-- 會員儲值相關
DROP FUNCTION IF EXISTS process_member_deposit(UUID, NUMERIC, NUMERIC, payment_method_type, VARCHAR, UUID);

-- ============================================================================
-- 記錄遷移
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('051_cleanup_pos_functions.sql')
ON CONFLICT (filename) DO NOTHING;

-- 刷新 Schema Cache
NOTIFY pgrst, 'reload schema';

SELECT 'POS functions cleanup completed!' as status;
