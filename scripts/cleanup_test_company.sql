-- ============================================================================
-- 清理振禾有限公司的測試資料
-- Company ID: 9a987505-5044-493c-bb63-cba891bb79df
-- ============================================================================

-- 開始事務
BEGIN;

-- 1. 記錄將要刪除的資料（供確認）
DO $$
DECLARE
    company_id UUID := '9a987505-5044-493c-bb63-cba891bb79df';
    company_name TEXT;
BEGIN
    SELECT name INTO company_name FROM companies WHERE id = company_id;

    RAISE NOTICE '準備刪除公司: % (ID: %)', company_name, company_id;

    -- 顯示即將刪除的資料統計
    RAISE NOTICE '發票數量: (SELECT COUNT(*) FROM accounting_invoices WHERE company_id = %)', company_id;
    RAISE NOTICE '傳票數量: (SELECT COUNT(*) FROM accounting_journal_entries WHERE company_id = %)', company_id;
    RAISE NOTICE '報價單數量: (SELECT COUNT(*) FROM quotations WHERE company_id = %)', company_id;
    RAISE NOTICE '客戶數量: (SELECT COUNT(*) FROM customers WHERE company_id = %)', company_id;
    RAISE NOTICE '產品數量: (SELECT COUNT(*) FROM products WHERE company_id = %)', company_id;
END $$;

-- 2. 刪除會計發票相關資料
DELETE FROM accounting_invoice_items
WHERE invoice_id IN (
    SELECT id FROM accounting_invoices
    WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df'
);

DELETE FROM accounting_invoices
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 3. 刪除會計傳票相關資料
DELETE FROM accounting_journal_entry_lines
WHERE entry_id IN (
    SELECT id FROM accounting_journal_entries
    WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df'
);

DELETE FROM accounting_journal_entries
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 4. 刪除付款記錄
DELETE FROM payments
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 5. 刪除報價單項目
DELETE FROM quotation_items
WHERE quotation_id IN (
    SELECT id FROM quotations
    WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df'
);

-- 6. 刪除報價單
DELETE FROM quotations
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 7. 刪除客戶
DELETE FROM customers
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 8. 刪除產品
DELETE FROM products
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 9. 刪除供應商
DELETE FROM suppliers
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 10. 刪除訂單
DELETE FROM orders
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 11. 刪除出貨
DELETE FROM shipments
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 12. 刪除合約
DELETE FROM contracts
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 13. 刪除訂閱記錄
DELETE FROM subscriptions
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 14. 刪除公司設定
DELETE FROM company_settings
WHERE company_id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 15. 最後刪除公司
DELETE FROM companies
WHERE id = '9a987505-5044-493c-bb63-cba891bb79df';

-- 提交事務
COMMIT;

-- ============================================================================
-- 驗證刪除結果
-- ============================================================================
DO $$
DECLARE
    company_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM companies WHERE id = '9a987505-5044-493c-bb63-cba891bb79df')
    INTO company_exists;

    IF company_exists THEN
        RAISE NOTICE '⚠️ 警告: 公司仍然存在，刪除可能失敗';
    ELSE
        RAISE NOTICE '✅ 成功: 公司已完全刪除';
    END IF;
END $$;
