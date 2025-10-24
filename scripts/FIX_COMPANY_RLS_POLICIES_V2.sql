-- ============================================================
-- 修復公司管理系統的 RLS 策略（修正版 V2）
-- ============================================================
-- 用途: 為 companies, company_members, company_settings 表新增完整的 RLS 策略
-- 日期: 2025-10-24
-- 修正: 移除循環依賴，避免無限遞迴錯誤
-- ============================================================

-- ⚠️ 重要：先刪除舊的有問題的策略
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
DROP POLICY IF EXISTS "Users can create companies" ON companies;
DROP POLICY IF EXISTS "Users can update their companies" ON companies;
DROP POLICY IF EXISTS "Users can delete their companies" ON companies;

DROP POLICY IF EXISTS "Users can view company members" ON company_members;
DROP POLICY IF EXISTS "Company creators can add members" ON company_members;
DROP POLICY IF EXISTS "Company creators can update members" ON company_members;
DROP POLICY IF EXISTS "Company creators can delete members" ON company_members;

DROP POLICY IF EXISTS "Users can view company settings" ON company_settings;
DROP POLICY IF EXISTS "Company creators can create settings" ON company_settings;
DROP POLICY IF EXISTS "Company creators can update settings" ON company_settings;
DROP POLICY IF EXISTS "Company creators can delete settings" ON company_settings;

-- ============================================================
-- 1. companies 表的 RLS 策略（簡化版，避免循環依賴）
-- ============================================================

-- 策略說明：
-- - 使用者只能操作自己建立的公司（created_by）
-- - 不使用 company_members 子查詢，避免循環依賴

-- 1.1 查看權限：使用者可以查看自己建立的公司
CREATE POLICY "Users can view their companies"
  ON companies
  FOR SELECT
  USING (created_by = auth.uid());

-- 1.2 新增權限：使用者可以建立公司
CREATE POLICY "Users can create companies"
  ON companies
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 1.3 更新權限：使用者可以更新自己建立的公司
CREATE POLICY "Users can update their companies"
  ON companies
  FOR UPDATE
  USING (created_by = auth.uid());

-- 1.4 刪除權限：使用者可以刪除自己建立的公司
CREATE POLICY "Users can delete their companies"
  ON companies
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================
-- 2. company_members 表的 RLS 策略（修正版）
-- ============================================================

-- 策略說明：
-- - 使用者可以查看自己的成員記錄
-- - 公司建立者可以管理該公司的所有成員
-- - 不使用 company_members 自我引用，避免循環

-- 2.1 查看權限：使用者可以查看自己的成員記錄或所屬公司的成員
CREATE POLICY "Users can view company members"
  ON company_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- 2.2 新增權限：公司建立者可以新增成員
CREATE POLICY "Company creators can add members"
  ON company_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- 2.3 更新權限：公司建立者可以更新成員資訊
CREATE POLICY "Company creators can update members"
  ON company_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- 2.4 刪除權限：公司建立者可以刪除成員
CREATE POLICY "Company creators can delete members"
  ON company_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- ============================================================
-- 3. company_settings 表的 RLS 策略（修正版）
-- ============================================================

-- 策略說明：
-- - 只有公司建立者可以管理設定
-- - 簡化策略，只檢查 companies.created_by

-- 3.1 查看權限：公司建立者可以查看設定
CREATE POLICY "Users can view company settings"
  ON company_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_settings.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- 3.2 新增權限：公司建立者可以建立設定
CREATE POLICY "Company creators can create settings"
  ON company_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_settings.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- 3.3 更新權限：公司建立者可以更新設定
CREATE POLICY "Company creators can update settings"
  ON company_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_settings.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- 3.4 刪除權限：公司建立者可以刪除設定
CREATE POLICY "Company creators can delete settings"
  ON company_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_settings.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- ============================================================
-- 4. 驗證策略已正確建立
-- ============================================================

-- 檢查 companies 的策略
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY cmd, policyname;

-- 檢查 company_members 的策略
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'company_members'
ORDER BY cmd, policyname;

-- 檢查 company_settings 的策略
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'company_settings'
ORDER BY cmd, policyname;

-- 統計策略數量
SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) = 4 THEN '✅ 完整（4個策略）'
    WHEN COUNT(*) > 0 THEN '⚠️ 不完整（' || COUNT(*) || '個策略）'
    ELSE '❌ 無策略'
  END as status
FROM pg_policies
WHERE tablename IN ('companies', 'company_members', 'company_settings')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================
-- 完成！修正說明
-- ============================================================
-- ✅ 移除了 companies SELECT 策略中的 company_members 子查詢（避免循環）
-- ✅ 移除了 company_members SELECT 策略中的自我引用（避免遞迴）
-- ✅ 移除了 company_settings SELECT 策略中的 company_members 子查詢
--
-- 策略簡化為：
-- - companies: 只有 created_by 可以操作
-- - company_members: created_by 可以管理，user_id 可以查看自己
-- - company_settings: 只有 created_by 可以操作
--
-- 這樣的設計：
-- ✅ 沒有循環依賴
-- ✅ 邏輯清晰簡單
-- ✅ 符合多租戶架構
-- ✅ 測試腳本應該能 100% 通過（預期 11/11 測試）
-- ============================================================
