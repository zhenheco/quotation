-- ============================================================================
-- 效能優化索引
-- 日期：2026-01-26
-- 說明：新增關鍵查詢的複合索引，提升列表頁面和篩選效能
-- ============================================================================

-- 報價單：按公司和建立日期排序（最常用的查詢模式）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_company_created
ON quotations(company_id, created_at DESC);

-- 報價單：按公司和狀態篩選
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_company_status
ON quotations(company_id, status);

-- 報價單：按擁有者篩選（RBAC 場景）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_owner_created
ON quotations(owner_id, created_at DESC);

-- 訂單：按公司和建立日期排序
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_company_created
ON orders(company_id, created_at DESC);

-- 訂單：按公司和狀態篩選
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_company_status
ON orders(company_id, status);

-- 訂單：按客戶篩選
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer
ON orders(customer_id);

-- 出貨單：按公司和建立日期排序
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_company_created
ON shipments(company_id, created_at DESC);

-- 出貨單：按訂單關聯
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_order
ON shipments(order_id);

-- 出貨單：按狀態篩選
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_status
ON shipments(status);

-- 客戶：按公司和郵件查詢（用於驗證重複）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_company_email
ON customers(company_id, email);

-- 客戶：按公司和建立日期排序
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_company_created
ON customers(company_id, created_at DESC);

-- 產品：按公司和建立日期排序
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_company_created
ON products(company_id, created_at DESC);

-- 產品：按公司和 SKU 查詢（用於驗證重複）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_company_sku
ON products(company_id, sku);

-- 報價單項目：按報價單和排序順序
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotation_items_quotation_sort
ON quotation_items(quotation_id, sort_order);

-- 訂單項目：按訂單和排序順序
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_sort
ON order_items(order_id, sort_order);

-- 出貨單項目：按出貨單
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipment_items_shipment
ON shipment_items(shipment_id);

-- ============================================================================
-- 驗證索引建立
-- ============================================================================
-- 執行後可用以下查詢驗證：
-- SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;
