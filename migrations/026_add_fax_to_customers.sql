-- Migration: Add fax column to customers table
-- Created: 2025-12-01

ALTER TABLE customers ADD COLUMN IF NOT EXISTS fax VARCHAR(50);
