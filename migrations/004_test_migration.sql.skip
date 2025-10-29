-- ============================================================================
-- Migration 004 Test Script
-- ============================================================================
-- 此腳本用於測試 migration 004 的功能是否正常運作
-- 執行前請確保已經執行 004_contracts_and_payments_enhancement.sql

-- ============================================================================
-- 1. 檢查表結構
-- ============================================================================

\echo '=== 檢查新增欄位 ==='

-- 檢查 quotations 表
SELECT
  'quotations' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'quotations'
  AND column_name IN (
    'contract_signed_date',
    'contract_expiry_date',
    'payment_frequency',
    'next_collection_date',
    'next_collection_amount'
  )
ORDER BY column_name;

-- 檢查 customer_contracts 表
SELECT
  'customer_contracts' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'customer_contracts'
  AND column_name IN (
    'next_collection_date',
    'next_collection_amount',
    'quotation_id'
  )
ORDER BY column_name;

-- 檢查 payments 表
SELECT
  'payments' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN (
    'payment_frequency',
    'is_overdue',
    'days_overdue'
  )
ORDER BY column_name;

-- 檢查 payment_schedules 表
SELECT
  'payment_schedules' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_schedules'
  AND column_name IN (
    'days_overdue',
    'last_reminder_sent_at',
    'reminder_count'
  )
ORDER BY column_name;

-- ============================================================================
-- 2. 檢查觸發器
-- ============================================================================

\echo '=== 檢查觸發器 ==='

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_update_next_collection_date',
  'trigger_check_payment_schedules_overdue'
)
ORDER BY trigger_name;

-- ============================================================================
-- 3. 檢查函式
-- ============================================================================

\echo '=== 檢查函式 ==='

SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_next_collection_date',
    'check_payment_schedules_overdue',
    'generate_payment_schedules_for_contract',
    'mark_overdue_payments'
  )
ORDER BY routine_name;

-- ============================================================================
-- 4. 檢查視圖
-- ============================================================================

\echo '=== 檢查視圖 ==='

SELECT
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'unpaid_payments_30_days',
    'collected_payments_summary',
    'next_collection_reminders'
  )
ORDER BY table_name;

-- ============================================================================
-- 5. 檢查索引
-- ============================================================================

\echo '=== 檢查索引 ==='

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_quotations_contract_expiry_date',
    'idx_quotations_next_collection_date',
    'idx_customer_contracts_quotation_id',
    'idx_customer_contracts_next_collection',
    'idx_payments_overdue',
    'idx_payment_schedules_overdue',
    'idx_payments_customer_date',
    'idx_schedules_customer_due'
  )
ORDER BY indexname;

-- ============================================================================
-- 6. 檢查約束
-- ============================================================================

\echo '=== 檢查約束 ==='

SELECT
  conname as constraint_name,
  contype as constraint_type,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname IN (
  'chk_quotations_payment_frequency',
  'chk_customer_contracts_payment_terms',
  'chk_payments_payment_type',
  'chk_payments_date_not_future',
  'chk_payments_amount_positive',
  'chk_schedules_amount_positive',
  'chk_contracts_next_collection_future'
)
ORDER BY conname;

-- ============================================================================
-- 7. 測試資料操作
-- ============================================================================

\echo '=== 開始測試資料操作 ==='

BEGIN;

-- 7.1 建立測試客戶
INSERT INTO customers (id, user_id, name, email, phone, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000099',
  '{"zh": "測試客戶公司", "en": "Test Customer Co."}',
  'test@example.com',
  '0912-345-678',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 7.2 建立測試報價單
INSERT INTO quotations (
  id,
  user_id,
  customer_id,
  quotation_number,
  issue_date,
  valid_until,
  status,
  currency,
  subtotal,
  tax_amount,
  total_amount
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001',
  'Q-TEST-001',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  'draft',
  'TWD',
  100000,
  5000,
  105000
) ON CONFLICT (id) DO NOTHING;

-- 7.3 測試：將報價單轉為合約（接受報價）
UPDATE quotations
SET
  status = 'accepted',
  contract_signed_date = CURRENT_DATE,
  contract_expiry_date = CURRENT_DATE + INTERVAL '1 year',
  payment_frequency = 'quarterly',
  next_collection_date = DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')::DATE + 4,
  next_collection_amount = 26250 -- 105000 / 4 quarters
WHERE id = '00000000-0000-0000-0000-000000000002';

\echo '測試 7.3: 報價單轉合約 - 完成'

-- 7.4 建立測試合約
INSERT INTO customer_contracts (
  id,
  user_id,
  customer_id,
  quotation_id,
  contract_number,
  title,
  start_date,
  end_date,
  signed_date,
  status,
  total_amount,
  currency,
  payment_terms
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'C-TEST-001',
  '測試合約',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  CURRENT_DATE,
  'active',
  105000,
  'TWD',
  'quarterly'
) ON CONFLICT (id) DO NOTHING;

\echo '測試 7.4: 建立合約 - 完成'

-- 7.5 測試：產生付款排程
SELECT generate_payment_schedules_for_contract(
  '00000000-0000-0000-0000-000000000003'::UUID,
  CURRENT_DATE,
  5 -- 每月5號收款
) as schedule_count;

\echo '測試 7.5: 產生付款排程 - 完成'

-- 7.6 查看產生的付款排程
SELECT
  schedule_number,
  due_date,
  amount,
  currency,
  status
FROM payment_schedules
WHERE contract_id = '00000000-0000-0000-0000-000000000003'
ORDER BY schedule_number;

-- 7.7 測試：記錄一筆收款
INSERT INTO payments (
  user_id,
  contract_id,
  customer_id,
  payment_type,
  payment_date,
  amount,
  currency,
  payment_method,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'installment',
  CURRENT_DATE,
  26250,
  'TWD',
  'bank_transfer',
  'confirmed'
);

\echo '測試 7.7: 記錄收款 - 完成'

-- 7.8 檢查合約的 next_collection_date 是否自動更新
SELECT
  contract_number,
  next_collection_date,
  next_collection_amount,
  payment_terms
FROM customer_contracts
WHERE id = '00000000-0000-0000-0000-000000000003';

\echo '測試 7.8: 檢查自動更新下次應收 - 完成'

-- 7.9 測試：建立逾期的付款排程
UPDATE payment_schedules
SET
  due_date = CURRENT_DATE - INTERVAL '35 days',
  status = 'pending'
WHERE contract_id = '00000000-0000-0000-0000-000000000003'
  AND schedule_number = 2;

\echo '測試 7.9: 建立逾期排程 - 完成'

-- 7.10 測試：執行逾期標記
SELECT * FROM mark_overdue_payments();

\echo '測試 7.10: 標記逾期付款 - 完成'

-- 7.11 查看逾期付款視圖
SELECT
  contract_number,
  customer_name_zh,
  due_date,
  amount,
  days_overdue,
  status
FROM unpaid_payments_30_days
WHERE contract_id = '00000000-0000-0000-0000-000000000003';

\echo '測試 7.11: 查看逾期視圖 - 完成'

-- 7.12 查看已收款彙總視圖
SELECT
  customer_name_zh,
  payment_type_display,
  payment_date,
  amount,
  payment_method
FROM collected_payments_summary
WHERE customer_id = '00000000-0000-0000-0000-000000000001';

\echo '測試 7.12: 查看已收款視圖 - 完成'

-- 7.13 查看下次收款提醒視圖
SELECT
  contract_number,
  customer_name_zh,
  next_collection_date,
  next_collection_amount,
  collection_status
FROM next_collection_reminders
WHERE contract_id = '00000000-0000-0000-0000-000000000003';

\echo '測試 7.13: 查看收款提醒視圖 - 完成'

-- ============================================================================
-- 8. 清理測試資料
-- ============================================================================

\echo '=== 清理測試資料 ==='

DELETE FROM payments WHERE customer_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM payment_schedules WHERE contract_id = '00000000-0000-0000-0000-000000000003';
DELETE FROM customer_contracts WHERE id = '00000000-0000-0000-0000-000000000003';
DELETE FROM quotations WHERE id = '00000000-0000-0000-0000-000000000002';
DELETE FROM customers WHERE id = '00000000-0000-0000-0000-000000000001';

-- 回滾所有變更（如果要保留測試資料，請註解掉下一行）
ROLLBACK;

-- 如果要保留測試資料，請使用 COMMIT 替代 ROLLBACK
-- COMMIT;

-- ============================================================================
-- 測試完成
-- ============================================================================

\echo ''
\echo '=== Migration 004 測試完成 ==='
\echo '所有測試項目已執行，請檢查輸出結果。'
\echo ''
\echo '測試涵蓋範圍：'
\echo '  ✓ 表結構檢查（新欄位）'
\echo '  ✓ 觸發器檢查'
\echo '  ✓ 函式檢查'
\echo '  ✓ 視圖檢查'
\echo '  ✓ 索引檢查'
\echo '  ✓ 約束檢查'
\echo '  ✓ 報價單轉合約功能'
\echo '  ✓ 付款排程自動產生'
\echo '  ✓ 收款記錄與自動更新'
\echo '  ✓ 逾期偵測與標記'
\echo '  ✓ 視圖資料查詢'
\echo ''
