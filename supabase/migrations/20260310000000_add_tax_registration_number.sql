-- 新增稅籍編號欄位
-- 稅籍編號 (9碼) 與統一編號 (8碼) 是不同的：
-- 統一編號：經濟部核發的 8 碼營業登記號碼
-- 稅籍編號：國稅局核發的 9 碼編號，用於營業稅申報

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tax_registration_number VARCHAR(9);

COMMENT ON COLUMN companies.tax_registration_number IS
  '稅籍編號 (9碼)，由國稅局配發，用於營業稅媒體申報。與統一編號(8碼)不同。';

-- Record migration
INSERT INTO schema_migrations (filename)
VALUES ('20260310000000_add_tax_registration_number.sql')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
