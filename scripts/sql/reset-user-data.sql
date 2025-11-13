-- 清空特定用戶的所有業務資料
-- 使用方式：將 @USER_ID 替換為實際的 user_id

-- 1. 刪除付款排程
DELETE FROM payment_schedules WHERE user_id = @USER_ID;

-- 2. 刪除付款條款
DELETE FROM payment_terms WHERE user_id = @USER_ID;

-- 3. 刪除合約
DELETE FROM contracts WHERE user_id = @USER_ID;

-- 4. 刪除報價單項目
DELETE FROM quotation_items
WHERE quotation_id IN (SELECT id FROM quotations WHERE user_id = @USER_ID);

-- 5. 刪除報價單
DELETE FROM quotations WHERE user_id = @USER_ID;

-- 6. 刪除產品
DELETE FROM products WHERE user_id = @USER_ID;

-- 7. 刪除客戶
DELETE FROM customers WHERE user_id = @USER_ID;

-- 8. 刪除公司成員關係
DELETE FROM company_members WHERE user_id = @USER_ID;

-- 9. 刪除用戶擁有的公司
DELETE FROM companies
WHERE id IN (
  SELECT company_id
  FROM company_members
  WHERE user_id = @USER_ID AND is_owner = 1
);

-- 查看清理結果
SELECT 'Cleanup completed for user_id: ' || @USER_ID AS message;
