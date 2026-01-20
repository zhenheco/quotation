-- Migration: 刪除「阿貝勒」供應商
-- 日期: 2026-01-17
-- 說明: 用戶要求刪除名稱為「阿貝勒」的供應商

-- 步驟 1: 先查詢供應商資訊（確認名稱）
-- SELECT id, name, company_id FROM suppliers WHERE name->>'zh' ILIKE '%阿貝勒%' OR name->>'en' ILIKE '%阿貝勒%';

-- 步驟 2: 檢查關聯的 product_supplier_costs 記錄
-- SELECT psc.* FROM product_supplier_costs psc
-- JOIN suppliers s ON psc.supplier_id = s.id
-- WHERE s.name->>'zh' ILIKE '%阿貝勒%' OR s.name->>'en' ILIKE '%阿貝勒%';

-- 步驟 3: 刪除關聯的 product_supplier_costs 記錄
-- 注意：由於外鍵設定為 ON DELETE CASCADE，這一步可能不需要
DELETE FROM product_supplier_costs
WHERE supplier_id IN (
  SELECT id FROM suppliers
  WHERE name->>'zh' ILIKE '%阿貝勒%' OR name->>'en' ILIKE '%阿貝勒%'
);

-- 步驟 4: 刪除供應商
DELETE FROM suppliers
WHERE name->>'zh' ILIKE '%阿貝勒%' OR name->>'en' ILIKE '%阿貝勒%';

-- 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('079_delete_abele_supplier.sql')
ON CONFLICT (filename) DO NOTHING;
