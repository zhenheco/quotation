-- ============================================================================
-- Migration 039: RLS for Business Tables
-- Created: 2025-12-10
-- Description: 為業務相關表啟用 RLS
--              customers, products, product_supplier_costs, quotations,
--              quotation_items, quotation_shares, quotation_versions,
--              customer_contracts, payments, payment_schedules, audit_logs
-- ============================================================================

-- ============================================================================
-- 1. customers - 客戶表
-- 策略：依 company_id 或 user_id 隔離
-- ============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Super admin 完全存取
CREATE POLICY "customers_super_admin"
ON customers FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 用戶可存取：自己的客戶 OR 所屬公司的客戶
CREATE POLICY "customers_access"
ON customers FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR (company_id IS NOT NULL AND can_access_company_rls(company_id))
)
WITH CHECK (
  user_id = auth.uid()
  OR (company_id IS NOT NULL AND can_access_company_rls(company_id))
);

CREATE POLICY "customers_service_role"
ON customers FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 2. products - 產品表
-- 策略：依 company_id 或 user_id 隔離
-- ============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_super_admin"
ON products FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "products_access"
ON products FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR (company_id IS NOT NULL AND can_access_company_rls(company_id))
)
WITH CHECK (
  user_id = auth.uid()
  OR (company_id IS NOT NULL AND can_access_company_rls(company_id))
);

CREATE POLICY "products_service_role"
ON products FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. product_supplier_costs - 產品供應商成本表
-- 策略：透過產品表繼承權限
-- ============================================================================

ALTER TABLE product_supplier_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_supplier_costs_super_admin"
ON product_supplier_costs FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "product_supplier_costs_access"
ON product_supplier_costs FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_supplier_costs.product_id
    AND (
      p.user_id = auth.uid()
      OR (p.company_id IS NOT NULL AND can_access_company_rls(p.company_id))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_supplier_costs.product_id
    AND (
      p.user_id = auth.uid()
      OR (p.company_id IS NOT NULL AND can_access_company_rls(p.company_id))
    )
  )
);

CREATE POLICY "product_supplier_costs_service_role"
ON product_supplier_costs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. quotations - 報價單表
-- 策略：依 company_id 或 user_id 隔離
-- ============================================================================

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotations_super_admin"
ON quotations FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "quotations_access"
ON quotations FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR (company_id IS NOT NULL AND can_access_company_rls(company_id))
)
WITH CHECK (
  user_id = auth.uid()
  OR (company_id IS NOT NULL AND can_access_company_rls(company_id))
);

CREATE POLICY "quotations_service_role"
ON quotations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 5. quotation_items - 報價單項目表
-- 策略：透過報價單表繼承權限
-- ============================================================================

ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotation_items_super_admin"
ON quotation_items FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "quotation_items_access"
ON quotation_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quotations q
    WHERE q.id = quotation_items.quotation_id
    AND (
      q.user_id = auth.uid()
      OR (q.company_id IS NOT NULL AND can_access_company_rls(q.company_id))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotations q
    WHERE q.id = quotation_items.quotation_id
    AND (
      q.user_id = auth.uid()
      OR (q.company_id IS NOT NULL AND can_access_company_rls(q.company_id))
    )
  )
);

CREATE POLICY "quotation_items_service_role"
ON quotation_items FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 6. quotation_shares - 報價單分享表
-- 策略：透過報價單繼承 + 公開分享連結需要 anon 存取
-- ============================================================================

ALTER TABLE quotation_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotation_shares_super_admin"
ON quotation_shares FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "quotation_shares_access"
ON quotation_shares FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quotations q
    WHERE q.id = quotation_shares.quotation_id
    AND (
      q.user_id = auth.uid()
      OR (q.company_id IS NOT NULL AND can_access_company_rls(q.company_id))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotations q
    WHERE q.id = quotation_shares.quotation_id
    AND (
      q.user_id = auth.uid()
      OR (q.company_id IS NOT NULL AND can_access_company_rls(q.company_id))
    )
  )
);

-- 公開分享連結：anon 可查看已啟用的分享（用於客戶查看報價單）
CREATE POLICY "quotation_shares_public_view"
ON quotation_shares FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "quotation_shares_service_role"
ON quotation_shares FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 7. quotation_versions - 報價單版本表
-- 策略：透過報價單表繼承權限
-- ============================================================================

ALTER TABLE quotation_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotation_versions_super_admin"
ON quotation_versions FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "quotation_versions_access"
ON quotation_versions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quotations q
    WHERE q.id = quotation_versions.quotation_id
    AND (
      q.user_id = auth.uid()
      OR (q.company_id IS NOT NULL AND can_access_company_rls(q.company_id))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotations q
    WHERE q.id = quotation_versions.quotation_id
    AND (
      q.user_id = auth.uid()
      OR (q.company_id IS NOT NULL AND can_access_company_rls(q.company_id))
    )
  )
);

CREATE POLICY "quotation_versions_service_role"
ON quotation_versions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 8. customer_contracts - 客戶合約表
-- 策略：依 user_id 隔離
-- ============================================================================

ALTER TABLE customer_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_contracts_super_admin"
ON customer_contracts FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "customer_contracts_access"
ON customer_contracts FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "customer_contracts_service_role"
ON customer_contracts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 9. payments - 付款表
-- 策略：依 user_id 隔離
-- ============================================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_super_admin"
ON payments FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "payments_access"
ON payments FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "payments_service_role"
ON payments FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 10. payment_schedules - 付款排程表
-- 策略：依 user_id 隔離
-- ============================================================================

ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_schedules_super_admin"
ON payment_schedules FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "payment_schedules_access"
ON payment_schedules FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_schedules_service_role"
ON payment_schedules FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 11. audit_logs - 稽核日誌表
-- 策略：用戶只能看自己的日誌，super_admin 可看所有
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_super_admin"
ON audit_logs FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "audit_logs_select_own"
ON audit_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "audit_logs_insert"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "audit_logs_service_role"
ON audit_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 記錄 Migration
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('039_rls_business_tables.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 039 completed: Business Tables RLS enabled';
  RAISE NOTICE '   - customers: RLS enabled';
  RAISE NOTICE '   - products: RLS enabled';
  RAISE NOTICE '   - product_supplier_costs: RLS enabled';
  RAISE NOTICE '   - quotations: RLS enabled';
  RAISE NOTICE '   - quotation_items: RLS enabled';
  RAISE NOTICE '   - quotation_shares: RLS enabled';
  RAISE NOTICE '   - quotation_versions: RLS enabled';
  RAISE NOTICE '   - customer_contracts: RLS enabled';
  RAISE NOTICE '   - payments: RLS enabled';
  RAISE NOTICE '   - payment_schedules: RLS enabled';
  RAISE NOTICE '   - audit_logs: RLS enabled';
END $$;
