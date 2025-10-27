-- ============================================================
-- 修復 quotation_versions 表的 RLS 策略
-- ============================================================

-- 1. SELECT 策略
DROP POLICY IF EXISTS "Users can view their quotation versions" ON quotation_versions;
CREATE POLICY "Users can view their quotation versions"
  ON quotation_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_versions.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 2. INSERT 策略
DROP POLICY IF EXISTS "Users can insert their quotation versions" ON quotation_versions;
CREATE POLICY "Users can insert their quotation versions"
  ON quotation_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_versions.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 3. UPDATE 策略
DROP POLICY IF EXISTS "Users can update their quotation versions" ON quotation_versions;
CREATE POLICY "Users can update their quotation versions"
  ON quotation_versions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_versions.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 4. DELETE 策略
DROP POLICY IF EXISTS "Users can delete their quotation versions" ON quotation_versions;
CREATE POLICY "Users can delete their quotation versions"
  ON quotation_versions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_versions.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 驗證策略
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'quotation_versions'
ORDER BY policyname;
