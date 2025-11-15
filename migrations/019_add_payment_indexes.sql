-- Migration: Add indexes for payment schedule queries optimization
-- Created: 2025-11-15
-- Purpose: Optimize getCurrentMonthReceivables and related payment queries

-- Index for querying payment schedules by due date and status
-- Used by: getCurrentMonthReceivables() to filter monthly receivables
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date
ON payment_schedules(due_date, status);

-- Index for querying payment schedules by user and due date
-- Used by: User-specific monthly receivable queries
CREATE INDEX IF NOT EXISTS idx_payment_schedules_user_due
ON payment_schedules(user_id, due_date);

-- Index for customer_contracts quotation lookups
-- Used by: JOIN operations between contracts and quotations
CREATE INDEX IF NOT EXISTS idx_customer_contracts_quotation
ON customer_contracts(quotation_id);

-- Verify indexes created successfully
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_payment_schedules_due_date',
    'idx_payment_schedules_user_due',
    'idx_customer_contracts_quotation'
  )
ORDER BY tablename, indexname;
