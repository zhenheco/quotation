-- Rollback Migration: 移除 payment_terms 表
-- Description: 回滾付款條款功能
-- Author: Claude Code
-- Date: 2025-11-03

-- 移除觸發器
DROP TRIGGER IF EXISTS trigger_update_payment_terms_timestamp ON payment_terms;

-- 移除觸發器函數
DROP FUNCTION IF EXISTS update_payment_terms_updated_at();

-- 移除索引
DROP INDEX IF EXISTS idx_payment_terms_quotation_term;
DROP INDEX IF EXISTS idx_payment_terms_due_date;
DROP INDEX IF EXISTS idx_payment_terms_status;
DROP INDEX IF EXISTS idx_payment_terms_quotation;

-- 移除表
DROP TABLE IF EXISTS payment_terms;

-- 移除 quotations 表的 contract_file_name 欄位
ALTER TABLE quotations DROP COLUMN IF EXISTS contract_file_name;
