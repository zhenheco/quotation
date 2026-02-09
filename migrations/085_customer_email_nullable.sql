-- Migration: 085_customer_email_nullable
-- 描述：將 customers.email 改為選填（允許 NULL）
-- 原因：批量匯入客戶時，許多客戶沒有 email，但資料庫 NOT NULL 約束導致匯入失敗
-- 日期：2026-02-09

-- 移除 email 的 NOT NULL 約束
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;

-- 設定預設值為 NULL
ALTER TABLE customers ALTER COLUMN email SET DEFAULT NULL;
