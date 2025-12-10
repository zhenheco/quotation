-- ============================================================================
-- Migration 034: Fix Security Definer Views
-- Created: 2025-12-10
-- Description: 移除 Views 的 SECURITY DEFINER 屬性，加入 auth.uid() 過濾
--              解決 Supabase linter 報告的 security_definer_view 錯誤
-- ============================================================================

-- ============================================================================
-- 1. user_permissions view
-- 原本：無過濾，任何人可查看所有用戶的權限
-- 修復：加入 user_id = auth.uid() 過濾，只能查看自己的權限
-- ============================================================================

DROP VIEW IF EXISTS user_permissions CASCADE;

CREATE VIEW user_permissions AS
SELECT
  ur.user_id,
  r.name as role_name,
  r.level as role_level,
  p.resource,
  p.action,
  p.name as permission_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.user_id = auth.uid();

COMMENT ON VIEW user_permissions IS
  '用戶權限視圖 - 僅顯示當前用戶的權限（透過 auth.uid() 過濾）';

-- 授權給 authenticated 角色
GRANT SELECT ON user_permissions TO authenticated;

-- ============================================================================
-- 2. overdue_payments view
-- 原本：顯示所有逾期付款
-- 修復：只顯示當前用戶擁有的付款排程
-- ============================================================================

DROP VIEW IF EXISTS overdue_payments CASCADE;

CREATE VIEW overdue_payments AS
SELECT
  ps.id,
  ps.contract_id,
  ps.customer_id,
  ps.schedule_number,
  ps.due_date,
  ps.amount,
  ps.currency,
  ps.status,
  ps.payment_id,
  ps.user_id,
  ps.created_at,
  ps.updated_at,
  ps.days_overdue,
  ps.reminder_count,
  ps.last_reminder_sent_at,
  c.name->>'zh' as customer_name_zh,
  c.name->>'en' as customer_name_en,
  c.contact_person->>'zh' as contact_person
FROM payment_schedules ps
JOIN customers c ON ps.customer_id = c.id
WHERE ps.status = 'overdue'
  AND ps.user_id = auth.uid()
ORDER BY ps.due_date ASC;

COMMENT ON VIEW overdue_payments IS
  '逾期付款視圖 - 僅顯示當前用戶的逾期付款（透過 auth.uid() 過濾）';

GRANT SELECT ON overdue_payments TO authenticated;

-- ============================================================================
-- 3. upcoming_payments view
-- 原本：顯示所有即將到期的付款
-- 修復：只顯示當前用戶的付款
-- ============================================================================

DROP VIEW IF EXISTS upcoming_payments CASCADE;

CREATE VIEW upcoming_payments AS
SELECT
  ps.*,
  c.name->>'zh' as customer_name_zh,
  c.name->>'en' as customer_name_en,
  c.contact_person->>'zh' as contact_person,
  ps.due_date - CURRENT_DATE as days_until_due
FROM payment_schedules ps
JOIN customers c ON ps.customer_id = c.id
WHERE ps.status = 'pending'
  AND ps.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND ps.user_id = auth.uid()
ORDER BY ps.due_date ASC;

COMMENT ON VIEW upcoming_payments IS
  '即將到期付款視圖 - 僅顯示當前用戶未來30天內的付款（透過 auth.uid() 過濾）';

GRANT SELECT ON upcoming_payments TO authenticated;

-- ============================================================================
-- 4. unpaid_payments_30_days view
-- 原本：顯示所有超過30天未付款
-- 修復：只顯示當前用戶的未付款
-- ============================================================================

DROP VIEW IF EXISTS unpaid_payments_30_days CASCADE;

CREATE VIEW unpaid_payments_30_days AS
SELECT
  ps.id,
  ps.contract_id,
  ps.customer_id,
  c.name->>'zh' as customer_name_zh,
  c.name->>'en' as customer_name_en,
  c.email as customer_email,
  c.phone as customer_phone,
  ps.schedule_number,
  ps.due_date,
  ps.amount,
  ps.currency,
  ps.status,
  ps.days_overdue,
  ps.reminder_count,
  ps.last_reminder_sent_at,
  cc.contract_number,
  cc.title as contract_title,
  cc.payment_terms
FROM payment_schedules ps
JOIN customers c ON ps.customer_id = c.id
JOIN customer_contracts cc ON ps.contract_id = cc.id
WHERE ps.status IN ('pending', 'overdue')
  AND ps.days_overdue >= 30
  AND ps.user_id = auth.uid()
ORDER BY ps.days_overdue DESC, ps.due_date ASC;

COMMENT ON VIEW unpaid_payments_30_days IS
  '未收款列表（>30天）- 僅顯示當前用戶的資料（透過 auth.uid() 過濾）';

GRANT SELECT ON unpaid_payments_30_days TO authenticated;

-- ============================================================================
-- 5. collected_payments_summary view
-- 原本：顯示所有已收款
-- 修復：只顯示當前用戶的已收款
-- ============================================================================

DROP VIEW IF EXISTS collected_payments_summary CASCADE;

CREATE VIEW collected_payments_summary AS
SELECT
  p.id,
  p.customer_id,
  c.name->>'zh' as customer_name_zh,
  c.name->>'en' as customer_name_en,
  p.quotation_id,
  p.contract_id,
  p.payment_type,
  p.payment_frequency,
  p.payment_date,
  p.amount,
  p.currency,
  p.payment_method,
  p.reference_number,
  p.receipt_url,
  p.status,
  p.notes,
  CASE
    WHEN p.quotation_id IS NOT NULL THEN q.quotation_number
    WHEN p.contract_id IS NOT NULL THEN cc.contract_number
    ELSE NULL
  END as related_number,
  CASE
    WHEN p.payment_type = 'deposit' THEN '頭款'
    WHEN p.payment_type = 'installment' THEN '期款'
    WHEN p.payment_type = 'final' THEN '尾款'
    WHEN p.payment_type = 'full' THEN '全額'
    WHEN p.payment_type = 'recurring' THEN '定期收款'
    ELSE p.payment_type
  END as payment_type_display
FROM payments p
JOIN customers c ON p.customer_id = c.id
LEFT JOIN quotations q ON p.quotation_id = q.id
LEFT JOIN customer_contracts cc ON p.contract_id = cc.id
WHERE p.status = 'confirmed'
  AND p.user_id = auth.uid()
ORDER BY p.payment_date DESC;

COMMENT ON VIEW collected_payments_summary IS
  '已收款彙總 - 僅顯示當前用戶的已確認收款（透過 auth.uid() 過濾）';

GRANT SELECT ON collected_payments_summary TO authenticated;

-- ============================================================================
-- 6. next_collection_reminders view
-- 原本：顯示所有合約的下次收款提醒
-- 修復：只顯示當前用戶的合約
-- ============================================================================

DROP VIEW IF EXISTS next_collection_reminders CASCADE;

CREATE VIEW next_collection_reminders AS
SELECT
  cc.id as contract_id,
  cc.contract_number,
  cc.title,
  cc.customer_id,
  c.name->>'zh' as customer_name_zh,
  c.name->>'en' as customer_name_en,
  c.email,
  c.phone,
  cc.payment_terms,
  cc.next_collection_date,
  cc.next_collection_amount,
  cc.currency,
  CURRENT_DATE - cc.next_collection_date as days_until_collection,
  CASE
    WHEN cc.next_collection_date < CURRENT_DATE THEN 'overdue'
    WHEN cc.next_collection_date = CURRENT_DATE THEN 'due_today'
    WHEN cc.next_collection_date <= CURRENT_DATE + 7 THEN 'due_soon'
    ELSE 'upcoming'
  END as collection_status
FROM customer_contracts cc
JOIN customers c ON cc.customer_id = c.id
WHERE cc.status = 'active'
  AND cc.next_collection_date IS NOT NULL
  AND cc.user_id = auth.uid()
ORDER BY cc.next_collection_date ASC;

COMMENT ON VIEW next_collection_reminders IS
  '下次收款提醒 - 僅顯示當前用戶的合約（透過 auth.uid() 過濾）';

GRANT SELECT ON next_collection_reminders TO authenticated;

-- ============================================================================
-- 記錄 Migration
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('034_fix_security_definer_views.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 034 completed: Security Definer Views fixed';
  RAISE NOTICE '   - user_permissions: 加入 auth.uid() 過濾';
  RAISE NOTICE '   - overdue_payments: 加入 auth.uid() 過濾';
  RAISE NOTICE '   - upcoming_payments: 加入 auth.uid() 過濾';
  RAISE NOTICE '   - unpaid_payments_30_days: 加入 auth.uid() 過濾';
  RAISE NOTICE '   - collected_payments_summary: 加入 auth.uid() 過濾';
  RAISE NOTICE '   - next_collection_reminders: 加入 auth.uid() 過濾';
END $$;
-- ============================================================================
-- Migration 035: RLS Helper Functions
-- Created: 2025-12-10
-- Description: 建立 RLS 政策所需的輔助函數
-- ============================================================================

-- ============================================================================
-- 1. is_super_admin() - 檢查當前用戶是否為超級管理員
-- ============================================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- 檢查當前用戶是否有 super_admin 角色
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_super_admin() IS
  '檢查當前用戶是否為超級管理員（用於 RLS 政策）';

-- ============================================================================
-- 2. can_access_company_rls() - 檢查當前用戶是否可存取指定公司
-- ============================================================================

CREATE OR REPLACE FUNCTION can_access_company_rls(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- 如果 company_id 為 NULL，返回 true（相容舊資料）
  IF p_company_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- 超級管理員可以存取所有公司
  IF is_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- 檢查是否為公司成員
  RETURN EXISTS (
    SELECT 1
    FROM company_members
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_access_company_rls(UUID) IS
  '檢查當前用戶是否可存取指定公司。超級管理員可存取所有公司，一般用戶只能存取所屬公司。';

-- ============================================================================
-- 3. is_company_owner() - 檢查當前用戶是否為公司所有者
-- ============================================================================

CREATE OR REPLACE FUNCTION is_company_owner(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_company_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM company_members
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND is_owner = true
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_company_owner(UUID) IS
  '檢查當前用戶是否為指定公司的所有者';

-- ============================================================================
-- 4. get_user_company_ids() - 取得當前用戶所屬的所有公司 ID
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT company_id
  FROM company_members
  WHERE user_id = auth.uid()
  AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_company_ids() IS
  '取得當前用戶所屬的所有公司 ID（用於 RLS 政策的 IN 查詢）';

-- ============================================================================
-- 授權
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_company_rls(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_company_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company_ids() TO authenticated;

-- ============================================================================
-- 記錄 Migration
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('035_rls_helper_functions.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 035 completed: RLS Helper Functions created';
  RAISE NOTICE '   - is_super_admin()';
  RAISE NOTICE '   - can_access_company_rls(UUID)';
  RAISE NOTICE '   - is_company_owner(UUID)';
  RAISE NOTICE '   - get_user_company_ids()';
END $$;
-- ============================================================================
-- Migration 036: RLS for System Tables
-- Created: 2025-12-10
-- Description: 為系統表啟用 RLS
--              roles, permissions, role_permissions, exchange_rates, schema_migrations
-- ============================================================================

-- ============================================================================
-- 1. roles - 角色表
-- 策略：所有人可讀，僅 super_admin 可修改
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 所有已認證用戶可讀取角色
CREATE POLICY "roles_select_authenticated"
ON roles FOR SELECT
TO authenticated
USING (true);

-- 僅 super_admin 可修改角色
CREATE POLICY "roles_modify_super_admin"
ON roles FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Service role 完全存取（用於系統操作）
CREATE POLICY "roles_service_role"
ON roles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 2. permissions - 權限表
-- 策略：所有人可讀，僅 super_admin 可修改
-- ============================================================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_select_authenticated"
ON permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "permissions_modify_super_admin"
ON permissions FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "permissions_service_role"
ON permissions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. role_permissions - 角色權限關聯表
-- 策略：所有人可讀，僅 super_admin 可修改
-- ============================================================================

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select_authenticated"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "role_permissions_modify_super_admin"
ON role_permissions FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "role_permissions_service_role"
ON role_permissions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. exchange_rates - 匯率表
-- 策略：所有人可讀（查看匯率），super_admin 可修改
-- ============================================================================

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exchange_rates_select_authenticated"
ON exchange_rates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "exchange_rates_modify_super_admin"
ON exchange_rates FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "exchange_rates_service_role"
ON exchange_rates FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 5. schema_migrations - Migration 追蹤表
-- 策略：僅 super_admin 和 service_role 可存取
-- ============================================================================

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schema_migrations_super_admin"
ON schema_migrations FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "schema_migrations_service_role"
ON schema_migrations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 記錄 Migration
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('036_rls_system_tables.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 036 completed: System Tables RLS enabled';
  RAISE NOTICE '   - roles: RLS enabled';
  RAISE NOTICE '   - permissions: RLS enabled';
  RAISE NOTICE '   - role_permissions: RLS enabled';
  RAISE NOTICE '   - exchange_rates: RLS enabled';
  RAISE NOTICE '   - schema_migrations: RLS enabled';
END $$;
-- ============================================================================
-- Migration 037: RLS for User Tables
-- Created: 2025-12-10
-- Description: 為用戶相關表啟用 RLS
--              user_roles
-- ============================================================================

-- ============================================================================
-- 1. user_roles - 用戶角色關聯表
-- 策略：用戶只能看自己的角色，super_admin 可看所有，管理由 super_admin 執行
-- ============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 用戶可查看自己的角色
CREATE POLICY "user_roles_select_own"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Super admin 可查看所有用戶角色
CREATE POLICY "user_roles_select_super_admin"
ON user_roles FOR SELECT
TO authenticated
USING (is_super_admin());

-- Super admin 可管理用戶角色
CREATE POLICY "user_roles_modify_super_admin"
ON user_roles FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Service role 完全存取（用於系統自動分配角色）
CREATE POLICY "user_roles_service_role"
ON user_roles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 記錄 Migration
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('037_rls_user_tables.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 037 completed: User Tables RLS enabled';
  RAISE NOTICE '   - user_roles: RLS enabled';
END $$;
-- ============================================================================
-- Migration 038: RLS for Company Tables
-- Created: 2025-12-10
-- Description: 為公司相關表啟用 RLS
--              companies, company_members, company_settings
-- ============================================================================

-- ============================================================================
-- 1. companies - 公司表
-- 策略：公司成員可查看自己的公司，super_admin 可查看所有
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Super admin 可存取所有公司
CREATE POLICY "companies_super_admin"
ON companies FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 公司成員可查看自己的公司
CREATE POLICY "companies_select_member"
ON companies FOR SELECT
TO authenticated
USING (
  id IN (SELECT get_user_company_ids())
);

-- 任何已認證用戶可建立公司
CREATE POLICY "companies_insert_authenticated"
ON companies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 公司 owner 可更新公司資料
CREATE POLICY "companies_update_owner"
ON companies FOR UPDATE
TO authenticated
USING (is_company_owner(id));

-- Service role 完全存取
CREATE POLICY "companies_service_role"
ON companies FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 2. company_members - 公司成員表
-- 策略：公司成員可查看同公司成員，owner 可管理成員
-- ============================================================================

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- Super admin 完全存取
CREATE POLICY "company_members_super_admin"
ON company_members FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 公司成員可查看同公司的成員
CREATE POLICY "company_members_select_same_company"
ON company_members FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT get_user_company_ids())
);

-- 公司 owner 可新增成員
CREATE POLICY "company_members_insert_owner"
ON company_members FOR INSERT
TO authenticated
WITH CHECK (is_company_owner(company_id));

-- 公司 owner 可更新成員（但不能更改自己的 owner 狀態）
CREATE POLICY "company_members_update_owner"
ON company_members FOR UPDATE
TO authenticated
USING (
  is_company_owner(company_id)
  -- 不能更改自己的 owner 狀態（防止 owner 把自己降級）
  AND NOT (user_id = auth.uid() AND is_owner = false)
);

-- 公司 owner 可刪除成員（但不能刪除自己）
CREATE POLICY "company_members_delete_owner"
ON company_members FOR DELETE
TO authenticated
USING (
  is_company_owner(company_id)
  AND user_id != auth.uid()
);

-- Service role 完全存取
CREATE POLICY "company_members_service_role"
ON company_members FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. company_settings - 公司設定表
-- 策略：用戶只能存取自己的設定
-- ============================================================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Super admin 完全存取
CREATE POLICY "company_settings_super_admin"
ON company_settings FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 用戶可存取自己的設定
CREATE POLICY "company_settings_own"
ON company_settings FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role 完全存取
CREATE POLICY "company_settings_service_role"
ON company_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 記錄 Migration
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('038_rls_company_tables.sql')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- 驗證
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 038 completed: Company Tables RLS enabled';
  RAISE NOTICE '   - companies: RLS enabled';
  RAISE NOTICE '   - company_members: RLS enabled';
  RAISE NOTICE '   - company_settings: RLS enabled';
END $$;
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
