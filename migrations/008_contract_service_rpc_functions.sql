-- ============================================================================
-- Migration 008: Contract Service RPC Functions
-- Created: 2025-10-29
-- Description: Add missing RPC functions for contracts.ts service
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION - Get Payment Schedules with Details
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payment_schedules_with_details(
  p_user_id UUID,
  p_contract_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  contract_id UUID,
  customer_id UUID,
  schedule_number INTEGER,
  due_date DATE,
  amount DECIMAL(12,2),
  currency VARCHAR(3),
  status VARCHAR(20),
  paid_date DATE,
  payment_id UUID,
  notes TEXT,
  days_overdue INTEGER,
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  customer JSONB,
  contract JSONB,
  days_until_due INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.user_id,
    ps.contract_id,
    ps.customer_id,
    ps.schedule_number,
    ps.due_date,
    ps.amount,
    ps.currency,
    ps.status,
    ps.paid_date,
    ps.payment_id,
    ps.notes,
    ps.days_overdue,
    ps.last_reminder_sent_at,
    ps.reminder_count,
    ps.created_at,
    ps.updated_at,
    jsonb_build_object(
      'id', c.id,
      'company_name_zh', c.company_name_zh,
      'company_name_en', c.company_name_en,
      'contact_person', c.contact_person
    ) as customer,
    jsonb_build_object(
      'id', cc.id,
      'contract_number', cc.contract_number,
      'title', cc.title
    ) as contract,
    CASE
      WHEN ps.status = 'pending' THEN (ps.due_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_until_due
  FROM payment_schedules ps
  JOIN customers c ON ps.customer_id = c.id
  JOIN customer_contracts cc ON ps.contract_id = cc.id
  WHERE ps.user_id = p_user_id
    AND (p_contract_id IS NULL OR ps.contract_id = p_contract_id)
  ORDER BY ps.due_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_payment_schedules_with_details IS
  '取得帶詳細資訊的付款排程 - 包含客戶和合約資訊';

-- ============================================================================
-- 2. FUNCTION - Get Contract Payment Progress
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contract_payment_progress(
  p_user_id UUID,
  p_contract_id UUID
)
RETURNS TABLE (
  contract_id UUID,
  contract_number VARCHAR(50),
  title TEXT,
  customer_name_zh VARCHAR(255),
  customer_name_en VARCHAR(255),
  total_amount DECIMAL(12,2),
  currency VARCHAR(3),
  status VARCHAR(20),
  next_payment_due DATE,
  total_paid DECIMAL(12,2),
  total_pending DECIMAL(12,2),
  total_overdue DECIMAL(12,2),
  payment_completion_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id as contract_id,
    cc.contract_number,
    cc.title,
    c.company_name_zh as customer_name_zh,
    c.company_name_en as customer_name_en,
    cc.total_amount,
    cc.currency,
    cc.status,
    cc.next_collection_date as next_payment_due,
    COALESCE(SUM(CASE WHEN ps.status = 'paid' THEN ps.amount ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN ps.status = 'pending' THEN ps.amount ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN ps.status = 'overdue' THEN ps.amount ELSE 0 END), 0) as total_overdue,
    CASE
      WHEN cc.total_amount > 0 THEN
        ROUND((COALESCE(SUM(CASE WHEN ps.status = 'paid' THEN ps.amount ELSE 0 END), 0) / cc.total_amount * 100), 2)
      ELSE 0
    END as payment_completion_rate
  FROM customer_contracts cc
  JOIN customers c ON cc.customer_id = c.id
  LEFT JOIN payment_schedules ps ON cc.id = ps.contract_id
  WHERE cc.id = p_contract_id
    AND cc.user_id = p_user_id
  GROUP BY cc.id, c.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_contract_payment_progress IS
  '取得合約的收款進度 - 包含已付、待付、逾期金額和完成率';

-- ============================================================================
-- 3. FUNCTION - Get Contracts with Overdue Payments
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contracts_with_overdue_payments(
  p_user_id UUID
)
RETURNS TABLE (
  contract_id UUID,
  contract_number VARCHAR(50),
  title TEXT,
  customer_id UUID,
  customer_name_zh VARCHAR(255),
  customer_name_en VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  overdue_count BIGINT,
  total_overdue_amount DECIMAL(12,2),
  max_days_overdue INTEGER,
  currency VARCHAR(3)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id as contract_id,
    cc.contract_number,
    cc.title,
    c.id as customer_id,
    c.company_name_zh as customer_name_zh,
    c.company_name_en as customer_name_en,
    c.email as customer_email,
    c.phone as customer_phone,
    COUNT(ps.id) as overdue_count,
    SUM(ps.amount) as total_overdue_amount,
    MAX(ps.days_overdue) as max_days_overdue,
    cc.currency
  FROM customer_contracts cc
  JOIN customers c ON cc.customer_id = c.id
  JOIN payment_schedules ps ON cc.id = ps.contract_id
  WHERE cc.user_id = p_user_id
    AND cc.status = 'active'
    AND ps.status = 'overdue'
  GROUP BY cc.id, c.id
  ORDER BY max_days_overdue DESC, total_overdue_amount DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_contracts_with_overdue_payments IS
  '取得有逾期款項的合約列表 - 按逾期天數和金額排序';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 008 completed successfully!' as status,
       'Added RPC functions for contract service' as description;
