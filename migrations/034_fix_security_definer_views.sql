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
