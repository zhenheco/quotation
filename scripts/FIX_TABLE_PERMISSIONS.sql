-- ============================================================================
-- 修復資料表權限
-- 在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 授予 service_role 完全權限（Service Key 需要）
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.quotations TO service_role;
GRANT ALL ON public.quotation_items TO service_role;
GRANT ALL ON public.exchange_rates TO service_role;
GRANT ALL ON public.roles TO service_role;
GRANT ALL ON public.permissions TO service_role;
GRANT ALL ON public.role_permissions TO service_role;
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.company_members TO service_role;
GRANT ALL ON public.company_settings TO service_role;
GRANT ALL ON public.customer_contracts TO service_role;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.payment_schedules TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.quotation_shares TO service_role;
GRANT ALL ON public.quotation_versions TO service_role;

-- 授予 authenticated 角色完全權限（已登入使用者需要）
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.quotations TO authenticated;
GRANT ALL ON public.quotation_items TO authenticated;
GRANT ALL ON public.exchange_rates TO authenticated;
GRANT ALL ON public.roles TO authenticated;
GRANT ALL ON public.permissions TO authenticated;
GRANT ALL ON public.role_permissions TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.company_members TO authenticated;
GRANT ALL ON public.company_settings TO authenticated;
GRANT ALL ON public.customer_contracts TO authenticated;
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payment_schedules TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;
GRANT ALL ON public.quotation_shares TO authenticated;
GRANT ALL ON public.quotation_versions TO authenticated;

-- 授予 anon 角色 SELECT 權限（匿名使用者只能讀取公開資料）
GRANT SELECT ON public.roles TO anon;
GRANT SELECT ON public.permissions TO anon;
GRANT SELECT ON public.exchange_rates TO anon;

-- 驗證權限
SELECT
  tablename,
  HAS_TABLE_PRIVILEGE('service_role', 'public.' || tablename, 'INSERT') as service_can_insert,
  HAS_TABLE_PRIVILEGE('authenticated', 'public.' || tablename, 'INSERT') as auth_can_insert
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'products')
ORDER BY tablename;

-- ============================================================================
-- 預期結果：
-- customers  | true | true
-- products   | true | true
-- ============================================================================
