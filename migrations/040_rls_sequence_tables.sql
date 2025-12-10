-- ============================================================================
-- Migration 040: RLS for Sequence Tables
-- Created: 2025-12-10
-- Description: 為序號表啟用 RLS
--              quotation_number_sequences, product_number_sequences,
--              customer_number_sequences
-- ============================================================================

-- ============================================================================
-- 1. quotation_number_sequences - 報價單編號序列表
-- 策略：依 company_id 隔離
-- ============================================================================

ALTER TABLE quotation_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotation_number_sequences_super_admin"
ON quotation_number_sequences FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "quotation_number_sequences_access"
ON quotation_number_sequences FOR ALL
TO authenticated
USING (can_access_company_rls(company_id))
WITH CHECK (can_access_company_rls(company_id));

CREATE POLICY "quotation_number_sequences_service_role"
ON quotation_number_sequences FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 2. product_number_sequences - 產品編號序列表
-- 策略：依 company_id 隔離
-- ============================================================================

ALTER TABLE product_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_number_sequences_super_admin"
ON product_number_sequences FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "product_number_sequences_access"
ON product_number_sequences FOR ALL
TO authenticated
USING (can_access_company_rls(company_id))
WITH CHECK (can_access_company_rls(company_id));

CREATE POLICY "product_number_sequences_service_role"
ON product_number_sequences FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. customer_number_sequences - 客戶編號序列表
-- 策略：依 company_id 隔離
-- ============================================================================

ALTER TABLE customer_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_number_sequences_super_admin"
ON customer_number_sequences FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "customer_number_sequences_access"
ON customer_number_sequences FOR ALL
TO authenticated
USING (can_access_company_rls(company_id))
WITH CHECK (can_access_company_rls(company_id));

CREATE POLICY "customer_number_sequences_service_role"
ON customer_number_sequences FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 記錄 Migration
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('040_rls_sequence_tables.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 040 completed: Sequence Tables RLS enabled';
  RAISE NOTICE '   - quotation_number_sequences: RLS enabled';
  RAISE NOTICE '   - product_number_sequences: RLS enabled';
  RAISE NOTICE '   - customer_number_sequences: RLS enabled';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 All RLS migrations completed!';
  RAISE NOTICE '   Total: 7 migrations (034-040)';
  RAISE NOTICE '   - 6 Views fixed (security definer removed)';
  RAISE NOTICE '   - 22 Tables now have RLS enabled';
END $$;
