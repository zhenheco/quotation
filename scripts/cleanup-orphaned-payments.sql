-- 清理孤立的 Payment 記錄
-- 這些是由於競態條件或程式錯誤產生的，沒有被任何 payment_schedule 參照

-- 首先查看有多少孤立記錄
SELECT 'Orphaned payments count:' as info, COUNT(*) as count
FROM payments p
WHERE p.payment_type = 'installment'
  AND p.id NOT IN (
    SELECT payment_id 
    FROM payment_schedules 
    WHERE payment_id IS NOT NULL
  );

-- 查看這些孤立記錄的詳細資訊
SELECT p.id, p.amount, p.currency, p.payment_date, p.customer_id, p.created_at
FROM payments p
WHERE p.payment_type = 'installment'
  AND p.id NOT IN (
    SELECT payment_id 
    FROM payment_schedules 
    WHERE payment_id IS NOT NULL
  );

-- 刪除孤立的 payments (取消註釋下面的行來執行刪除)
-- DELETE FROM payments
-- WHERE payment_type = 'installment'
--   AND id NOT IN (
--     SELECT payment_id 
--     FROM payment_schedules 
--     WHERE payment_id IS NOT NULL
--   );
