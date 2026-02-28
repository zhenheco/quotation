-- 增強的 Supabase Storage RLS 策略
-- 執行前請先刪除舊策略：DROP POLICY IF EXISTS "policy_name" ON storage.objects;

-- ============================================================================
-- 安全配置
-- ============================================================================

-- 確保啟用 RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BUCKET 政策
-- ============================================================================

-- 限制可存取的 bucket
CREATE POLICY "Users can only access allowed buckets"
ON storage.objects FOR ALL
USING (
  bucket_id IN ('company-files', 'contract-files', 'payment-receipts')
);

-- ============================================================================
-- BUCKET: company-files (Logo, Signature, Passbook)
-- ============================================================================

-- 增強的檢視策略：驗證路徑格式和檔案類型
CREATE POLICY "Enhanced: Users can view own company files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  -- 驗證路徑格式：user_id/company_id_type.ext
  name ~ '^[0-9a-f-]{36}/[0-9a-f-]+_(logo|signature|passbook)\.(jpg|jpeg|png|gif|webp)$'
);

-- 增強的上傳策略：限制檔案大小和類型
CREATE POLICY "Enhanced: Users can upload own company files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  -- 驗證路徑格式
  name ~ '^[0-9a-f-]{36}/[0-9a-f-]+_(logo|signature|passbook)\.(jpg|jpeg|png|gif|webp)$' AND
  -- 限制檔案大小 (10MB = 10485760 bytes)
  octet_length(decode(content_base64, 'base64')) <= 10485760 AND
  -- 限制檔案類型
  content_type IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp')
);

-- 增強的更新策略
CREATE POLICY "Enhanced: Users can update own company files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  name ~ '^[0-9a-f-]{36}/[0-9a-f-]+_(logo|signature|passbook)\.(jpg|jpeg|png|gif|webp)$'
);

-- 增強的刪除策略
CREATE POLICY "Enhanced: Users can delete own company files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  name ~ '^[0-9a-f-]{36}/[0-9a-f-]+_(logo|signature|passbook)\.(jpg|jpeg|png|gif|webp)$'
);

-- ============================================================================
-- BUCKET: contract-files (Contract PDFs)
-- ============================================================================

-- 增強的合約檔案檢視策略
CREATE POLICY "Enhanced: Users can view own contract files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contract-files' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  -- 驗證路徑格式和檔案類型
  name ~ '^[0-9a-f-]{36}/[0-9a-zA-Z_-]+\.(pdf|docx|doc)$' AND
  -- 限制路徑深度 (防止 ../../../ 攻擊)
  array_length(string_to_array(name, '/'), 1) = 2
);

-- 增強的合約檔案上傳策略
CREATE POLICY "Enhanced: Users can upload own contract files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contract-files' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  name ~ '^[0-9a-f-]{36}/[0-9a-zA-Z_-]+\.(pdf|docx|doc)$' AND
  array_length(string_to_array(name, '/'), 1) = 2 AND
  -- 限制檔案大小 (50MB)
  octet_length(decode(content_base64, 'base64')) <= 52428800 AND
  -- 限制檔案類型
  content_type IN (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
);

-- 增強的合約檔案更新策略
CREATE POLICY "Enhanced: Users can update own contract files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'contract-files' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  name ~ '^[0-9a-f-]{36}/[0-9a-zA-Z_-]+\.(pdf|docx|doc)$' AND
  array_length(string_to_array(name, '/'), 1) = 2
);

-- 增強的合約檔案刪除策略
CREATE POLICY "Enhanced: Users can delete own contract files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contract-files' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  name ~ '^[0-9a-f-]{36}/[0-9a-zA-Z_-]+\.(pdf|docx|doc)$' AND
  array_length(string_to_array(name, '/'), 1) = 2
);

-- ============================================================================
-- BUCKET: payment-receipts (Payment Receipt Images/PDFs)
-- ============================================================================

-- 增強的收據檢視策略
CREATE POLICY "Enhanced: Users can view own payment receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  -- 驗證路徑格式
  name ~ '^[0-9a-f-]{36}/[0-9a-zA-Z_-]+\.(pdf|jpg|jpeg|png|gif|webp)$' AND
  array_length(string_to_array(name, '/'), 1) = 2
);

-- 增強的收據上傳策略
CREATE POLICY "Enhanced: Users can upload own payment receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  name ~ '^[0-9a-f-]{36}/[0-9a-zA-Z_-]+\.(pdf|jpg|jpeg|png|gif|webp)$' AND
  array_length(string_to_array(name, '/'), 1) = 2 AND
  -- 限制檔案大小 (20MB)
  octet_length(decode(content_base64, 'base64')) <= 20971520 AND
  -- 限制檔案類型
  content_type IN (
    'application/pdf',
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp'
  )
);

-- 增強的收據更新策略
CREATE POLICY "Enhanced: Users can update own payment receipts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  name ~ '^[0-9a-f-]{36}/[0-9a-zA-Z_-]+\.(pdf|jpg|jpeg|png|gif|webp)$' AND
  array_length(string_to_array(name, '/'), 1) = 2
);

-- 增強的收據刪除策略
CREATE POLICY "Enhanced: Users can delete own payment receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  name ~ '^[0-9a-f-]{36}/[0-9a-zA-Z_-]+\.(pdf|jpg|jpeg|png|gif|webp)$' AND
  array_length(string_to_array(name, '/'), 1) = 2
);

-- ============================================================================
-- 防止惡意行為的額外策略
-- ============================================================================

-- 防止路徑遍歷攻擊
CREATE POLICY "Block path traversal attacks"
ON storage.objects FOR ALL
USING (
  NOT (
    name ~ '\.\.' OR
    name ~ '//' OR
    name ~ '^/' OR
    name ~ '/$' OR
    name ~ '\0' OR
    name ~ '[\x00-\x1f\x7f-\x9f]'
  )
);

-- 防止超長檔案名稱
CREATE POLICY "Limit filename length"
ON storage.objects FOR ALL
USING (
  length(name) <= 255 AND
  length((string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)]) <= 100
);

-- 限制每個用戶的檔案總數
CREATE POLICY "Limit files per user"
ON storage.objects FOR INSERT
WITH CHECK (
  (
    SELECT COUNT(*)
    FROM storage.objects
    WHERE (storage.foldername(name))[1] = auth.uid()::text
  ) < 1000
);

-- ============================================================================
-- 安全監控和記錄
-- ============================================================================

-- 建立審計日誌表（需要手動執行）
-- CREATE TABLE IF NOT EXISTS storage_audit_log (
--   id SERIAL PRIMARY KEY,
--   user_id UUID REFERENCES auth.users(id),
--   bucket_id TEXT,
--   object_name TEXT,
--   operation TEXT,
--   ip_address INET,
--   user_agent TEXT,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- ============================================================================
-- 檔案路徑規範
-- ============================================================================

-- 正確的檔案路徑格式：
-- company-files: {user_uuid}/{company_id}_{type}.{ext}
-- contract-files: {user_uuid}/{contract_name}.{ext}
-- payment-receipts: {user_uuid}/{receipt_name}.{ext}

-- 允許的檔案類型：
-- 圖片：jpg, jpeg, png, gif, webp
-- 文檔：pdf, doc, docx

-- 檔案大小限制：
-- 公司檔案：10MB
-- 合約檔案：50MB
-- 收據檔案：20MB

-- ============================================================================
-- 使用說明
-- ============================================================================

-- 1. 執行此腳本之前，請先刪除舊的策略：
--    DROP POLICY IF EXISTS "Users can view own company files" ON storage.objects;
--    DROP POLICY IF EXISTS "Users can upload own company files" ON storage.objects;
--    (重複其他所有舊策略)

-- 2. 執行此腳本後，測試檔案上傳功能確保正常運作

-- 3. 監控 PostgreSQL 日誌，檢查是否有策略違規嘗試

-- 4. 定期檢查 storage.objects 表，確保沒有異常檔案

-- 5. 建議設定 bucket 級別的檔案大小限制作為額外保護