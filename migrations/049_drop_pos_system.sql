-- ============================================================================
-- Migration: 049_drop_pos_system.sql
-- Created: 2025-12-21
-- Description: 移除 POS 系統所有表格、枚舉和相關物件
-- Reason: 系統專注於報價單、會計系統和報表分析，不再需要 POS 功能
-- ============================================================================

-- ============================================================================
-- 1. 刪除權限資料
-- ============================================================================

-- 刪除 POS 相關的角色權限關聯
DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions
  WHERE resource IN (
    'tenants', 'branches', 'pos_services', 'pos_staff',
    'pos_members', 'sales_transactions', 'daily_settlements'
  )
);

-- 刪除 POS 相關權限
DELETE FROM permissions
WHERE resource IN (
  'tenants', 'branches', 'pos_services', 'pos_staff',
  'pos_members', 'sales_transactions', 'daily_settlements'
);

-- ============================================================================
-- 2. 刪除 RLS 政策（按表格順序）
-- ============================================================================

-- transaction_commissions
DROP POLICY IF EXISTS "transaction_commissions_all" ON transaction_commissions;

-- transaction_payments
DROP POLICY IF EXISTS "transaction_payments_all" ON transaction_payments;

-- transaction_items
DROP POLICY IF EXISTS "transaction_items_all" ON transaction_items;

-- member_deposits
DROP POLICY IF EXISTS "member_deposits_select" ON member_deposits;
DROP POLICY IF EXISTS "member_deposits_insert" ON member_deposits;

-- staff_schedules
DROP POLICY IF EXISTS "staff_schedules_select" ON staff_schedules;
DROP POLICY IF EXISTS "staff_schedules_insert" ON staff_schedules;
DROP POLICY IF EXISTS "staff_schedules_update" ON staff_schedules;
DROP POLICY IF EXISTS "staff_schedules_delete" ON staff_schedules;

-- service_package_services
DROP POLICY IF EXISTS "service_package_services_select" ON service_package_services;
DROP POLICY IF EXISTS "service_package_services_insert" ON service_package_services;
DROP POLICY IF EXISTS "service_package_services_update" ON service_package_services;
DROP POLICY IF EXISTS "service_package_services_delete" ON service_package_services;

-- 租戶層級表格 RLS
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM (VALUES
      ('branches'), ('service_categories'), ('pos_services'),
      ('service_packages'), ('pos_staff'), ('commission_rules'),
      ('member_levels'), ('pos_members'), ('deposit_promotions'),
      ('daily_settlements'), ('sales_transactions')
    ) AS tables(table_name)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON %s', t, t);
  END LOOP;
END $$;

-- user_tenants
DROP POLICY IF EXISTS "user_tenants_select" ON user_tenants;
DROP POLICY IF EXISTS "user_tenants_insert" ON user_tenants;
DROP POLICY IF EXISTS "user_tenants_update" ON user_tenants;
DROP POLICY IF EXISTS "user_tenants_delete" ON user_tenants;

-- tenants
DROP POLICY IF EXISTS "tenants_select" ON tenants;
DROP POLICY IF EXISTS "tenants_insert" ON tenants;
DROP POLICY IF EXISTS "tenants_update" ON tenants;
DROP POLICY IF EXISTS "tenants_delete" ON tenants;

-- ============================================================================
-- 3. 刪除時間戳觸發器
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM (VALUES
      ('tenants'), ('user_tenants'), ('branches'), ('service_categories'),
      ('pos_services'), ('service_packages'), ('pos_staff'), ('staff_schedules'),
      ('commission_rules'), ('member_levels'), ('pos_members'),
      ('deposit_promotions'), ('daily_settlements'), ('sales_transactions')
    ) AS tables(table_name)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- 4. 刪除表格（按依賴順序：先刪子表，後刪父表）
-- ============================================================================

-- 交易相關子表
DROP TABLE IF EXISTS transaction_commissions CASCADE;
DROP TABLE IF EXISTS transaction_payments CASCADE;
DROP TABLE IF EXISTS transaction_items CASCADE;

-- 銷售交易主表
DROP TABLE IF EXISTS sales_transactions CASCADE;

-- 日結帳
DROP TABLE IF EXISTS daily_settlements CASCADE;

-- 會員相關
DROP TABLE IF EXISTS member_deposits CASCADE;
DROP TABLE IF EXISTS deposit_promotions CASCADE;
DROP TABLE IF EXISTS pos_members CASCADE;
DROP TABLE IF EXISTS member_levels CASCADE;

-- 抽成規則
DROP TABLE IF EXISTS commission_rules CASCADE;

-- 員工相關
DROP TABLE IF EXISTS staff_schedules CASCADE;
DROP TABLE IF EXISTS pos_staff CASCADE;

-- 服務相關
DROP TABLE IF EXISTS service_package_services CASCADE;
DROP TABLE IF EXISTS service_packages CASCADE;
DROP TABLE IF EXISTS pos_services CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;

-- 分店（需先移除 user_tenants 的 FK）
ALTER TABLE IF EXISTS user_tenants DROP CONSTRAINT IF EXISTS fk_user_tenants_branch;
DROP TABLE IF EXISTS branches CASCADE;

-- 租戶相關
DROP TABLE IF EXISTS user_tenants CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- ============================================================================
-- 5. 刪除 RLS Helper Function
-- ============================================================================

DROP FUNCTION IF EXISTS can_access_tenant_rls(UUID);

-- ============================================================================
-- 6. 刪除 POS RPC Functions（來自 048_pos_rpc_functions.sql）
-- ============================================================================

DROP FUNCTION IF EXISTS create_sales_transaction(JSONB);
DROP FUNCTION IF EXISTS void_sales_transaction(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS refund_sales_transaction(UUID, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS deposit_to_member(UUID, NUMERIC, NUMERIC, payment_method_type, UUID, TEXT);
DROP FUNCTION IF EXISTS create_daily_settlement(UUID, DATE, TEXT);
DROP FUNCTION IF EXISTS count_settlement_cash(UUID, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS approve_settlement(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS lock_settlement(UUID, TEXT);
DROP FUNCTION IF EXISTS calculate_commission(UUID);

-- ============================================================================
-- 7. 刪除 POS 專用枚舉類型
-- ============================================================================

-- 注意：只刪除 POS 專用的枚舉，保留共用的
DROP TYPE IF EXISTS tenant_plan CASCADE;
DROP TYPE IF EXISTS staff_role CASCADE;
DROP TYPE IF EXISTS schedule_status CASCADE;
DROP TYPE IF EXISTS commission_type CASCADE;
DROP TYPE IF EXISTS deposit_promotion_type CASCADE;
DROP TYPE IF EXISTS sales_status CASCADE;
DROP TYPE IF EXISTS discount_type CASCADE;
DROP TYPE IF EXISTS settlement_status CASCADE;

-- 保留的共用枚舉（不刪除）：
-- - payment_method_type（會計系統使用）
-- - gender（可能被客戶系統使用）

-- ============================================================================
-- 8. 記錄遷移
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('049_drop_pos_system.sql')
ON CONFLICT (filename) DO NOTHING;

-- 刷新 Schema Cache
NOTIFY pgrst, 'reload schema';

SELECT 'POS system removed successfully! 19 tables, 8 enums, and related objects dropped.' as status;
