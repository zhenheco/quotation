-- ============================================================================
-- 安全執行 Migration 071-074
-- 先清理可能已存在的物件，然後再創建
-- ============================================================================

-- ========== 清理已存在的 RLS 政策 ==========

-- Orders 表政策
DROP POLICY IF EXISTS "Company members can view their orders" ON orders;
DROP POLICY IF EXISTS "Company members can insert orders" ON orders;
DROP POLICY IF EXISTS "Company members can update orders" ON orders;
DROP POLICY IF EXISTS "Company members can delete draft orders" ON orders;

-- Order Items 表政策
DROP POLICY IF EXISTS "Company members can view their order items" ON order_items;
DROP POLICY IF EXISTS "Company members can insert order items" ON order_items;
DROP POLICY IF EXISTS "Company members can update order items" ON order_items;
DROP POLICY IF EXISTS "Company members can delete order items" ON order_items;

-- Order Number Sequences 表政策
DROP POLICY IF EXISTS "Company members can view their sequences" ON order_number_sequences;
DROP POLICY IF EXISTS "Company members can insert sequences" ON order_number_sequences;
DROP POLICY IF EXISTS "Company members can update sequences" ON order_number_sequences;

-- Shipments 表政策
DROP POLICY IF EXISTS "Company members can view their shipments" ON shipments;
DROP POLICY IF EXISTS "Company members can insert shipments" ON shipments;
DROP POLICY IF EXISTS "Company members can update shipments" ON shipments;
DROP POLICY IF EXISTS "Company members can delete pending shipments" ON shipments;

-- Shipment Items 表政策
DROP POLICY IF EXISTS "Company members can view their shipment items" ON shipment_items;
DROP POLICY IF EXISTS "Company members can insert shipment items" ON shipment_items;
DROP POLICY IF EXISTS "Company members can update shipment items" ON shipment_items;
DROP POLICY IF EXISTS "Company members can delete shipment items" ON shipment_items;

-- Shipment Number Sequences 表政策
DROP POLICY IF EXISTS "Company members can view their shipment sequences" ON shipment_number_sequences;
DROP POLICY IF EXISTS "Company members can insert shipment sequences" ON shipment_number_sequences;
DROP POLICY IF EXISTS "Company members can update shipment sequences" ON shipment_number_sequences;

-- ========== 清理已存在的視圖 ==========
DROP VIEW IF EXISTS order_invoices_summary;
DROP VIEW IF EXISTS shipment_invoices_summary;

-- ========== 清理已存在的函數 ==========
DROP FUNCTION IF EXISTS update_order_totals();
DROP FUNCTION IF EXISTS update_order_item_shipped_quantity();
DROP FUNCTION IF EXISTS update_order_status_on_shipment();
DROP FUNCTION IF EXISTS create_order_from_quotation(UUID);
DROP FUNCTION IF EXISTS update_shipment_totals();
DROP FUNCTION IF EXISTS create_invoice_from_shipment(UUID, DATE, DATE);

-- ========== 清理已存在的觸發器 ==========
DROP TRIGGER IF EXISTS trigger_update_order_totals ON order_items;
DROP TRIGGER IF EXISTS trigger_update_order_item_shipped ON shipment_items;
DROP TRIGGER IF EXISTS trigger_update_order_status ON shipments;
DROP TRIGGER IF EXISTS trigger_update_shipment_totals ON shipment_items;

SELECT '清理完成，現在可以安全執行 combined_orders_shipments.sql' as status;
