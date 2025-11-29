-- Migration: 添加報價單匯率欄位
-- 日期: 2025-11-29

ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 6) DEFAULT 1.0;

COMMENT ON COLUMN quotations.exchange_rate IS '報價單匯率';
