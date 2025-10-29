-- ============================================================================
-- Migration 014: Fix customers column references in RPC functions
-- Created: 2025-10-29
-- Description: Fix RPC functions that reference non-existent company_name_zh/en columns
--              The actual column is 'name' (JSONB type)
-- ============================================================================

-- ============================================================================
-- 1. Fix get_contracts_with_overdue_payments
-- ============================================================================

DROP FUNCTION IF EXISTS get_contracts_with_overdue_payments(UUID);

CREATE OR REPLACE FUNCTION get_contracts_with_overdue_payments(p_user_id UUID)
RETURNS TABLE (
  contract_id UUID,
  contract_number VARCHAR(50),
  title VARCHAR(255),
  customer_id UUID,
  customer_name_zh VARCHAR(255),
  customer_name_en VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  overdue_count BIGINT,
  total_overdue_amount NUMERIC(15,2),
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
    (c.name->>'zh')::VARCHAR(255) as customer_name_zh,
    (c.name->>'en')::VARCHAR(255) as customer_name_en,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Check if get_payment_reminders exists and fix it
-- ============================================================================

-- First, check what the function signature is
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_payment_reminders'
  ) THEN
    DROP FUNCTION get_payment_reminders(UUID);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_payment_reminders(p_user_id UUID)
RETURNS TABLE (
  schedule_id UUID,
  contract_id UUID,
  contract_number VARCHAR(50),
  customer_id UUID,
  customer_name_zh VARCHAR(255),
  customer_name_en VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  due_date DATE,
  amount NUMERIC(15,2),
  currency VARCHAR(3),
  days_until_due INTEGER,
  status VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id as schedule_id,
    cc.id as contract_id,
    cc.contract_number,
    c.id as customer_id,
    (c.name->>'zh')::VARCHAR(255) as customer_name_zh,
    (c.name->>'en')::VARCHAR(255) as customer_name_en,
    c.email as customer_email,
    c.phone as customer_phone,
    ps.due_date,
    ps.amount,
    cc.currency,
    (ps.due_date - CURRENT_DATE)::INTEGER as days_until_due,
    ps.status::VARCHAR(20)
  FROM payment_schedules ps
  JOIN customer_contracts cc ON ps.contract_id = cc.id
  JOIN customers c ON cc.customer_id = c.id
  WHERE cc.user_id = p_user_id
    AND ps.status IN ('pending', 'upcoming')
    AND ps.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  ORDER BY ps.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Fix get_contract_by_id if it exists
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_contract_by_id'
  ) THEN
    DROP FUNCTION get_contract_by_id(UUID, UUID);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_contract_by_id(
  p_contract_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', cc.id,
    'contract_number', cc.contract_number,
    'title', cc.title,
    'description', cc.description,
    'status', cc.status,
    'currency', cc.currency,
    'total_amount', cc.total_amount,
    'signed_date', cc.signed_date,
    'start_date', cc.start_date,
    'end_date', cc.end_date,
    'customer', json_build_object(
      'id', c.id,
      'name_zh', c.name->>'zh',
      'name_en', c.name->>'en',
      'email', c.email,
      'phone', c.phone
    )
  ) INTO result
  FROM customer_contracts cc
  JOIN customers c ON cc.customer_id = c.id
  WHERE cc.id = p_contract_id
    AND cc.user_id = p_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 014 completed successfully!' as status,
       'Fixed all RPC functions to use customers.name JSONB column' as description;
