-- Migration: Add get_payment_statistics RPC function
-- Description: 建立取得付款統計資料的 RPC 函數

CREATE OR REPLACE FUNCTION get_payment_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  current_user_id uuid;
  current_month_start date;
  current_year_start date;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  current_month_start := date_trunc('month', CURRENT_DATE);
  current_year_start := date_trunc('year', CURRENT_DATE);

  WITH current_month_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_collected,
      COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0) as total_pending,
      COALESCE(SUM(CASE WHEN p.is_overdue = true THEN p.amount ELSE 0 END), 0) as total_overdue,
      COALESCE(MAX(p.currency), 'TWD') as currency
    FROM payments p
    WHERE p.user_id = current_user_id
      AND p.payment_date >= current_month_start
  ),
  current_year_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_collected,
      COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0) as total_pending,
      COALESCE(SUM(CASE WHEN p.is_overdue = true THEN p.amount ELSE 0 END), 0) as total_overdue,
      COALESCE(MAX(p.currency), 'TWD') as currency
    FROM payments p
    WHERE p.user_id = current_user_id
      AND p.payment_date >= current_year_start
  ),
  overdue_stats AS (
    SELECT
      COUNT(*)::int as count,
      COALESCE(SUM(p.amount), 0) as total_amount,
      COALESCE(AVG(p.days_overdue), 0)::int as average_days
    FROM payments p
    WHERE p.user_id = current_user_id
      AND p.is_overdue = true
  )
  SELECT jsonb_build_object(
    'current_month', jsonb_build_object(
      'total_collected', cm.total_collected,
      'total_pending', cm.total_pending,
      'total_overdue', cm.total_overdue,
      'currency', cm.currency
    ),
    'current_year', jsonb_build_object(
      'total_collected', cy.total_collected,
      'total_pending', cy.total_pending,
      'total_overdue', cy.total_overdue,
      'currency', cy.currency
    ),
    'overdue', jsonb_build_object(
      'count', o.count,
      'total_amount', o.total_amount,
      'average_days', o.average_days
    )
  ) INTO result
  FROM current_month_stats cm, current_year_stats cy, overdue_stats o;

  RETURN result;
END;
$$;

-- Grant execute permission to public (for Zeabur/standard PostgreSQL)
GRANT EXECUTE ON FUNCTION get_payment_statistics() TO public;

COMMENT ON FUNCTION get_payment_statistics() IS '取得付款統計資料，包含本月、本年度及逾期統計';
