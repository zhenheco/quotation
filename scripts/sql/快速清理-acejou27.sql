-- ========================================
-- 快速清理 acejou27@gmail.com 的資料
-- ========================================
--
-- 使用方式：
-- 1. 前往 Cloudflare Dashboard
-- 2. Workers & Pages > D1 > quotation-system-db > Console
-- 3. 複製貼上以下 SQL 並執行
--
-- ========================================

-- 步驟 1：查詢所有用戶及其資料量
-- （找出您的 user_id）
SELECT
  user_id,
  COUNT(*) as 資料筆數
FROM (
  SELECT user_id FROM quotations
  UNION ALL
  SELECT user_id FROM customers
  UNION ALL
  SELECT user_id FROM products
)
GROUP BY user_id
ORDER BY 資料筆數 DESC;

-- ========================================
-- 步驟 2：查看特定用戶的詳細資料
-- （將下方的 'USER_ID' 替換為步驟 1 找到的 user_id）
-- ========================================

-- 替換此處的 USER_ID
-- 例如：'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

SELECT
  (SELECT COUNT(*) FROM quotations WHERE user_id = 'USER_ID') as 報價單,
  (SELECT COUNT(*) FROM customers WHERE user_id = 'USER_ID') as 客戶,
  (SELECT COUNT(*) FROM products WHERE user_id = 'USER_ID') as 產品,
  (SELECT COUNT(*) FROM contracts WHERE user_id = 'USER_ID') as 合約,
  (SELECT COUNT(*) FROM payment_schedules WHERE user_id = 'USER_ID') as 付款;

-- ========================================
-- 步驟 3：清理所有資料
-- ⚠️  警告：此操作無法復原！
-- ========================================

-- 將下方所有的 'USER_ID' 替換為您的 user_id
-- 然後全選複製，貼上到 D1 Console 執行

DELETE FROM payment_schedules WHERE user_id = 'USER_ID';
DELETE FROM payment_terms WHERE user_id = 'USER_ID';
DELETE FROM contracts WHERE user_id = 'USER_ID';
DELETE FROM quotation_items WHERE quotation_id IN (SELECT id FROM quotations WHERE user_id = 'USER_ID');
DELETE FROM quotations WHERE user_id = 'USER_ID';
DELETE FROM products WHERE user_id = 'USER_ID';
DELETE FROM customers WHERE user_id = 'USER_ID';
DELETE FROM company_members WHERE user_id = 'USER_ID';

-- ========================================
-- 步驟 4：驗證清理結果（應該全部為 0）
-- ========================================

SELECT
  (SELECT COUNT(*) FROM quotations WHERE user_id = 'USER_ID') as 報價單,
  (SELECT COUNT(*) FROM customers WHERE user_id = 'USER_ID') as 客戶,
  (SELECT COUNT(*) FROM products WHERE user_id = 'USER_ID') as 產品,
  (SELECT COUNT(*) FROM contracts WHERE user_id = 'USER_ID') as 合約,
  (SELECT COUNT(*) FROM payment_schedules WHERE user_id = 'USER_ID') as 付款;
