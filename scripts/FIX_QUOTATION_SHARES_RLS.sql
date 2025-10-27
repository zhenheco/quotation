-- ============================================================
-- 修復 quotation_shares 表的 RLS 策略
-- ============================================================

-- 1. SELECT 策略
DROP POLICY IF EXISTS "Users can view their quotation shares" ON quotation_shares;
CREATE POLICY "Users can view their quotation shares"
  ON quotation_shares
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_shares.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 2. INSERT 策略
DROP POLICY IF EXISTS "Users can insert their quotation shares" ON quotation_shares;
CREATE POLICY "Users can insert their quotation shares"
  ON quotation_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_shares.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 3. UPDATE 策略
DROP POLICY IF EXISTS "Users can update their quotation shares" ON quotation_shares;
CREATE POLICY "Users can update their quotation shares"
  ON quotation_shares
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_shares.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 4. DELETE 策略
DROP POLICY IF EXISTS "Users can delete their quotation shares" ON quotation_shares;
CREATE POLICY "Users can delete their quotation shares"
  ON quotation_shares
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_shares.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 驗證策略
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'quotation_shares'
ORDER BY policyname;
