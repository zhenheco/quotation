-- Supabase Storage RLS Policies
-- Execute this in Supabase Dashboard → SQL Editor
-- These policies ensure users can only access their own files

-- ============================================================================
-- BUCKET: company-files (Logo, Signature, Passbook)
-- ============================================================================

-- Policy: Users can view their own company files
CREATE POLICY "Users can view own company files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can upload their own company files
CREATE POLICY "Users can upload own company files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own company files
CREATE POLICY "Users can update own company files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own company files
CREATE POLICY "Users can delete own company files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- BUCKET: contract-files (Contract PDFs)
-- ============================================================================

-- Policy: Users can view their own contract files
CREATE POLICY "Users can view own contract files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contract-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can upload their own contract files
CREATE POLICY "Users can upload own contract files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contract-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own contract files
CREATE POLICY "Users can update own contract files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'contract-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own contract files
CREATE POLICY "Users can delete own contract files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contract-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- BUCKET: payment-receipts (Payment Receipt Images/PDFs)
-- ============================================================================

-- Policy: Users can view their own payment receipts
CREATE POLICY "Users can view own payment receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can upload their own payment receipts
CREATE POLICY "Users can upload own payment receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own payment receipts
CREATE POLICY "Users can update own payment receipts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own payment receipts
CREATE POLICY "Users can delete own payment receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- FILE PATH STRUCTURE
-- ============================================================================

-- Files should be uploaded with paths like:
-- company-files/2ba3df78-8b23-4b3f-918b-d4f7eea2bfba/logo.png
-- contract-files/2ba3df78-8b23-4b3f-918b-d4f7eea2bfba/contract-001.pdf
-- payment-receipts/2ba3df78-8b23-4b3f-918b-d4f7eea2bfba/receipt-001.pdf

-- Where the first folder is always the user's UUID (auth.uid())
