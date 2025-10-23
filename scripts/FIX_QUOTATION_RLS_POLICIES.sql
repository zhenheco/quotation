-- ============================================================
-- 修復報價單版本控制和分享功能的 RLS 策略
-- ============================================================
-- 用途: 為 quotation_versions 和 quotation_shares 表新增缺失的 RLS 策略
-- 日期: 2025-10-24
-- 問題: 這兩個表已啟用 RLS，但缺少 INSERT/UPDATE/DELETE 策略
-- 影響: 無法建立版本記錄和分享連結
-- ============================================================

-- ============================================================
-- 1. quotation_versions 表的 RLS 策略
-- ============================================================

-- 策略說明：
-- - 使用者只能查看、建立、更新、刪除自己報價單的版本記錄
-- - 透過 quotations 表的 user_id 來驗證擁有權
-- - 採用 EXISTS 子查詢檢查關聯的報價單是否屬於當前使用者

-- 1.1 查看權限：使用者可以查看自己報價單的版本
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

-- 1.2 新增權限：使用者可以為自己的報價單建立版本
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

-- 1.3 更新權限：使用者可以更新自己報價單的版本（主要是 change_summary）
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

-- 1.4 刪除權限：使用者可以刪除自己報價單的版本
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

-- ============================================================
-- 2. quotation_shares 表的 RLS 策略
-- ============================================================

-- 策略說明：
-- - 使用者可以查看、建立、更新、刪除自己報價單的分享連結
-- - 同樣透過 quotations 表的 user_id 驗證擁有權
-- - 分享連結可以由擁有者自由管理（設定過期時間、密碼等）

-- 2.1 查看權限：使用者可以查看自己報價單的分享連結
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

-- 2.2 新增權限：使用者可以為自己的報價單建立分享連結
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

-- 2.3 更新權限：使用者可以更新自己報價單的分享連結（例如更新 view_count）
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

-- 2.4 刪除權限：使用者可以刪除自己報價單的分享連結（撤銷分享）
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

-- ============================================================
-- 3. 驗證策略已正確建立
-- ============================================================

-- 檢查 quotation_versions 的策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'quotation_versions'
ORDER BY policyname;

-- 檢查 quotation_shares 的策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'quotation_shares'
ORDER BY policyname;

-- ============================================================
-- 完成！
-- ============================================================
-- 執行此腳本後，quotation_versions 和 quotation_shares 表應該：
-- ✅ 擁有完整的 SELECT, INSERT, UPDATE, DELETE RLS 策略
-- ✅ 使用者只能操作自己報價單的相關記錄
-- ✅ 透過 quotations 表的 user_id 進行權限驗證
-- ✅ 測試腳本應該能 100% 通過（9/9 測試）
-- ============================================================
