-- ============================================================
-- 為 audit_logs 表建立 RLS 策略
-- ============================================================
-- 用途: 允許使用者查看和建立自己的稽核日誌
-- 日期: 2025-10-24
-- 策略設計:
--   - 使用者可以查看自己的稽核日誌（user_id = auth.uid()）
--   - 使用者可以建立稽核日誌
--   - 稽核日誌不應該被修改或刪除（保持稽核完整性）
--   - 但為了測試目的，我們先允許刪除操作
-- ============================================================

-- 確保 RLS 已啟用
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 刪除舊策略（如果存在）
DROP POLICY IF EXISTS "Users can view their audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can delete their audit logs" ON audit_logs;

-- 策略 1: SELECT - 使用者可以查看自己的稽核日誌
CREATE POLICY "Users can view their audit logs"
  ON audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- 策略 2: INSERT - 使用者可以建立稽核日誌
CREATE POLICY "Users can create audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 策略 3: DELETE - 使用者可以刪除自己的稽核日誌（僅用於測試）
-- 注意：在生產環境中，應該移除此策略以保持稽核完整性
CREATE POLICY "Users can delete their audit logs"
  ON audit_logs
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 驗證策略
-- ============================================================

-- 檢查 RLS 狀態
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'audit_logs';

-- 檢查策略
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'audit_logs'
ORDER BY policyname;

-- 統計
SELECT
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ 完整（' || COUNT(*) || ' 個策略）'
    WHEN COUNT(*) > 0 THEN '⚠️ 不完整（' || COUNT(*) || ' 個策略）'
    ELSE '❌ 無策略'
  END as status
FROM pg_policies
WHERE tablename = 'audit_logs';
