-- ========================================
-- 會計系統測試數據腳本
-- ========================================
-- 使用說明：
-- 1. 在 Supabase SQL Editor 中執行此腳本
-- 2. 或使用 psql 連接資料庫執行
-- ========================================

-- 首先查詢 acejou27@gmail.com 的 user_id 和 company_id
-- SELECT
--   u.id as user_id,
--   u.email,
--   cm.company_id
-- FROM auth.users u
-- LEFT JOIN company_members cm ON cm.user_id = u.id
-- WHERE u.email = 'acejou27@gmail.com';

-- 使用變數儲存 company_id（在 psql 中使用）
-- 或直接替換下方的 {COMPANY_ID} 為實際值

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
BEGIN
  -- 查詢用戶和公司 ID
  SELECT u.id, cm.company_id
  INTO v_user_id, v_company_id
  FROM auth.users u
  LEFT JOIN company_members cm ON cm.user_id = u.id
  WHERE u.email = 'acejou27@gmail.com'
  LIMIT 1;

  -- 如果找不到用戶，拋出錯誤
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User acejou27@gmail.com not found';
  END IF;

  -- 如果找不到公司，拋出錯誤
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company not found for user acejou27@gmail.com';
  END IF;

  -- 輸出找到的 ID
  RAISE NOTICE 'Found user_id: %, company_id: %', v_user_id, v_company_id;

  -- 刪除舊的測試發票（可選，避免重複）
  DELETE FROM acc_invoices
  WHERE company_id = v_company_id
  AND number LIKE 'TEST-%';

  -- 插入 6 筆測試發票
  INSERT INTO acc_invoices (
    company_id,
    number,
    type,
    date,
    untaxed_amount,
    tax_amount,
    total_amount,
    counterparty_name,
    counterparty_tax_id,
    description,
    status,
    payment_status
  ) VALUES
  (
    v_company_id,
    'TEST-001',
    'OUTPUT',
    '2024-12-01',
    10000.00,
    500.00,
    10500.00,
    '測試客戶 A',
    '12345678',
    '軟體開發服務費',
    'VERIFIED',
    'PAID'
  ),
  (
    v_company_id,
    'TEST-002',
    'OUTPUT',
    '2024-12-05',
    25000.00,
    1250.00,
    26250.00,
    '測試客戶 B',
    '23456789',
    '系統維護服務',
    'VERIFIED',
    'UNPAID'
  ),
  (
    v_company_id,
    'TEST-003',
    'INPUT',
    '2024-12-10',
    8000.00,
    400.00,
    8400.00,
    '測試供應商 A',
    '34567890',
    '辦公設備採購',
    'VERIFIED',
    'PAID'
  ),
  (
    v_company_id,
    'TEST-004',
    'OUTPUT',
    '2024-12-15',
    15000.00,
    750.00,
    15750.00,
    '測試客戶 C',
    '45678901',
    '顧問諮詢服務',
    'DRAFT',
    'UNPAID'
  ),
  (
    v_company_id,
    'TEST-005',
    'INPUT',
    '2024-12-20',
    12000.00,
    600.00,
    12600.00,
    '測試供應商 B',
    '56789012',
    '雲端服務費用',
    'VERIFIED',
    'UNPAID'
  ),
  (
    v_company_id,
    'TEST-006',
    'OUTPUT',
    '2024-12-25',
    30000.00,
    1500.00,
    31500.00,
    '測試客戶 D',
    '67890123',
    '專案開發費用',
    'VERIFIED',
    'PARTIAL'
  );

  RAISE NOTICE 'Successfully inserted 6 test invoices for company_id: %', v_company_id;

END $$;

-- 驗證插入結果
SELECT
  number,
  type,
  date,
  total_amount,
  counterparty_name,
  status,
  payment_status
FROM acc_invoices
WHERE number LIKE 'TEST-%'
ORDER BY date;
