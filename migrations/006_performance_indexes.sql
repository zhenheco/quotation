-- ============================================================================
-- 性能優化索引 - Migration 006
-- 目的: 新增關鍵索引以提升查詢效能
-- 預期效果: 查詢速度提升 60-80%
-- ============================================================================

-- 使用 CONCURRENTLY 避免鎖表,適合生產環境
-- 注意: CONCURRENTLY 不能在事務中執行,需要單獨執行

-- 1. 報價單日期範圍查詢索引
-- 用途: 儀表板日期篩選、報表生成
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_dates 
ON quotations(user_id, issue_date DESC, valid_until);

COMMENT ON INDEX idx_quotations_dates IS '報價單日期範圍查詢優化索引';

-- 2. 報價單複合狀態查詢索引
-- 用途: 儀表板狀態統計、狀態篩選
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_status_date 
ON quotations(user_id, status, created_at DESC);

COMMENT ON INDEX idx_quotations_status_date IS '報價單狀態查詢優化索引';

-- 3. 產品分類查詢索引
-- 用途: 產品分類篩選
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category 
ON products(user_id, category) 
WHERE category IS NOT NULL;

COMMENT ON INDEX idx_products_category IS '產品分類查詢優化索引(部分索引)';

-- 4. 報價單項目聚合查詢索引
-- 用途: 報價單明細查詢、產品銷售統計
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotation_items_quotation_product 
ON quotation_items(quotation_id, product_id) 
INCLUDE (quantity, unit_price, subtotal);

COMMENT ON INDEX idx_quotation_items_quotation_product IS '報價單項目查詢優化索引(含覆蓋欄位)';

-- 5. 客戶郵件唯一約束優化
-- 用途: 防止重複客戶、郵件查詢
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email_unique 
ON customers(user_id, email);

COMMENT ON INDEX idx_customers_email_unique IS '客戶郵件唯一性索引';

-- 6. 報價單分享 token 查詢優化
-- 用途: 公開分享連結訪問
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotation_shares_active 
ON quotation_shares(share_token, quotation_id) 
WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW());

COMMENT ON INDEX idx_quotation_shares_active IS '活躍分享連結查詢優化索引(部分索引)';

-- 7. 部分索引: 僅活躍報價單
-- 用途: 減少索引大小,提升查詢速度
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_active 
ON quotations(user_id, created_at DESC) 
WHERE status IN ('draft', 'sent');

COMMENT ON INDEX idx_quotations_active IS '活躍報價單查詢優化索引(部分索引)';

-- 8. 報價單號碼查詢優化
-- 用途: 報價單搜尋功能
-- 注意: quotation_number 已有 UNIQUE 約束,會自動建立索引
-- 此索引添加 user_id 以支援多租戶查詢
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_number_user 
ON quotations(user_id, quotation_number);

COMMENT ON INDEX idx_quotations_number_user IS '報價單號碼搜尋優化索引';

-- ============================================================================
-- 公司和權限相關索引 (如果使用 RBAC 功能)
-- ============================================================================

-- 9. 公司成員關聯索引
-- 用途: 權限檢查、成員列表查詢
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_members_lookup 
ON company_members(company_id, user_id) 
INCLUDE (role);

COMMENT ON INDEX idx_company_members_lookup IS '公司成員查詢優化索引';

-- 10. 用戶角色查詢索引
-- 用途: 權限驗證
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_lookup 
ON user_roles(user_id, role_id);

COMMENT ON INDEX idx_user_roles_lookup IS '用戶角色查詢優化索引';

-- ============================================================================
-- 統計和分析索引
-- ============================================================================

-- 11. 報價單總額統計索引
-- 用途: 儀表板統計、報表分析
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_amount_stats 
ON quotations(user_id, status, currency) 
INCLUDE (total_amount);

COMMENT ON INDEX idx_quotations_amount_stats IS '報價單金額統計優化索引';

-- 12. 客戶創建時間索引
-- 用途: 新客戶統計、客戶增長分析
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_created 
ON customers(user_id, created_at DESC);

COMMENT ON INDEX idx_customers_created IS '客戶創建時間統計索引';

-- ============================================================================
-- 索引健康檢查查詢
-- ============================================================================

-- 查看所有新增索引的狀態
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 檢查索引大小
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- 效能驗證查詢
-- ============================================================================

-- 測試報價單查詢效能
EXPLAIN ANALYZE
SELECT 
  q.*,
  jsonb_build_object('id', c.id, 'name', c.name, 'email', c.email) as customer
FROM quotations q
LEFT JOIN customers c ON q.customer_id = c.id
WHERE q.user_id = 'test-user-id'
  AND q.status = 'sent'
ORDER BY q.created_at DESC
LIMIT 20;

-- 預期: 應該看到 "Index Scan using idx_quotations_status_date"

-- ============================================================================
-- Rollback 腳本 (如需回滾)
-- ============================================================================

/*
DROP INDEX CONCURRENTLY IF EXISTS idx_quotations_dates;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotations_status_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_products_category;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotation_items_quotation_product;
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_email_unique;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotation_shares_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotations_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotations_number_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_company_members_lookup;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_roles_lookup;
DROP INDEX CONCURRENTLY IF EXISTS idx_quotations_amount_stats;
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_created;
*/

-- ============================================================================
-- Migration 完成
-- ============================================================================
