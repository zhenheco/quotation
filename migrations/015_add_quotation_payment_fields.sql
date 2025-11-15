-- Migration: Add payment method and notes fields to quotations
-- Description: Add payment_method and payment_notes columns to quotations table
-- Created: 2025-11-15

-- Add payment_method column to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL;

-- Add payment_notes column to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS payment_notes TEXT NULL;

-- Add comment to payment_method column
COMMENT ON COLUMN quotations.payment_method IS 'Payment method for the quotation (cash, bank_transfer, ach_transfer, credit_card, check, cryptocurrency, other)';

-- Add comment to payment_notes column
COMMENT ON COLUMN quotations.payment_notes IS 'Additional notes about payment (max 500 characters)';

-- Note: No index needed for these columns as they are optional filter fields
-- and not used in JOIN operations or frequent WHERE clauses
