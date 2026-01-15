-- Migration: 076_add_image_url_to_products.sql
-- 新增產品圖片 URL 欄位，支援報價單產品圖片雙向同步

-- 1. 新增 image_url 欄位到 products 表
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN products.image_url IS 'Product image URL - can be synced from quotation items';

-- 2. 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('076_add_image_url_to_products.sql')
ON CONFLICT (filename) DO NOTHING;

-- 通知 PostgREST 重新載入 schema
NOTIFY pgrst, 'reload schema';
