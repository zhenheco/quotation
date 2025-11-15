-- Migration: Add payment method and notes fields to quotations
-- Description: Add payment_method and payment_notes columns to quotations table
-- Created: 2025-11-15
-- D1 (SQLite) compatible version

-- Add payment_method column to quotations table
ALTER TABLE quotations
ADD COLUMN payment_method TEXT NULL;

-- Add payment_notes column to quotations table
ALTER TABLE quotations
ADD COLUMN payment_notes TEXT NULL;

-- Note: SQLite does not support comments on columns
-- payment_method: Payment method for the quotation (cash, bank_transfer, ach_transfer, credit_card, check, cryptocurrency, other)
-- payment_notes: Additional notes about payment (max 500 characters)
