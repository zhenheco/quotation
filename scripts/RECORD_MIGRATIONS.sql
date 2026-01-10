-- ============================================================================
-- 記錄已執行的 Migration 到 schema_migrations 表
-- 如果表和政策已存在，只需要記錄這些 migration 已完成
-- ============================================================================

-- 先檢查 orders 表是否存在
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    RAISE NOTICE 'orders 表已存在，記錄 migration 為已完成';

    -- 記錄 071
    INSERT INTO schema_migrations (filename)
    VALUES ('071_create_orders_system.sql')
    ON CONFLICT (filename) DO NOTHING;

  END IF;
END $$;

-- 檢查 shipments 表是否存在
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipments') THEN
    RAISE NOTICE 'shipments 表已存在，記錄 migration 為已完成';

    -- 記錄 072
    INSERT INTO schema_migrations (filename)
    VALUES ('072_create_shipments_system.sql')
    ON CONFLICT (filename) DO NOTHING;

  END IF;
END $$;

-- 檢查 acc_invoices 是否有 order_id 欄位
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'acc_invoices' AND column_name = 'order_id'
  ) THEN
    RAISE NOTICE 'acc_invoices.order_id 欄位已存在，記錄 migration 為已完成';

    -- 記錄 073
    INSERT INTO schema_migrations (filename)
    VALUES ('073_acc_invoices_add_order_shipment.sql')
    ON CONFLICT (filename) DO NOTHING;

  END IF;
END $$;

-- 檢查 orders 權限是否存在
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM permissions WHERE name = 'orders:read') THEN
    RAISE NOTICE 'orders 權限已存在，記錄 migration 為已完成';

    -- 記錄 074
    INSERT INTO schema_migrations (filename)
    VALUES ('074_add_orders_shipments_permissions.sql')
    ON CONFLICT (filename) DO NOTHING;

  END IF;
END $$;

-- 記錄 combined（如果其他都存在）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipments') THEN

    INSERT INTO schema_migrations (filename)
    VALUES ('combined_orders_shipments.sql')
    ON CONFLICT (filename) DO NOTHING;

  END IF;
END $$;

-- 顯示結果
SELECT filename, executed_at
FROM schema_migrations
WHERE filename LIKE '07%' OR filename LIKE 'combined%'
ORDER BY filename;
