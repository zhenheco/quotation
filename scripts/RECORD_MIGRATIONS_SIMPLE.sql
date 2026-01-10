-- ============================================================================
-- 記錄已執行的 Migration（簡化版）
-- ============================================================================

-- 直接記錄所有 migration（ON CONFLICT 會忽略已存在的記錄）
INSERT INTO schema_migrations (filename) VALUES ('071_create_orders_system.sql') ON CONFLICT (filename) DO NOTHING;
INSERT INTO schema_migrations (filename) VALUES ('072_create_shipments_system.sql') ON CONFLICT (filename) DO NOTHING;
INSERT INTO schema_migrations (filename) VALUES ('073_acc_invoices_add_order_shipment.sql') ON CONFLICT (filename) DO NOTHING;
INSERT INTO schema_migrations (filename) VALUES ('074_add_orders_shipments_permissions.sql') ON CONFLICT (filename) DO NOTHING;
INSERT INTO schema_migrations (filename) VALUES ('combined_orders_shipments.sql') ON CONFLICT (filename) DO NOTHING;

-- 顯示結果
SELECT filename, executed_at FROM schema_migrations WHERE filename LIKE '07%' OR filename LIKE 'combined%' ORDER BY filename;
