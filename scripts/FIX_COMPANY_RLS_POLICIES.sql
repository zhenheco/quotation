-- ============================================================
-- 修復公司管理系統的 RLS 策略
-- ============================================================
-- 用途: 為 companies, company_members, company_settings 表新增完整的 RLS 策略
-- 日期: 2025-10-24
-- 問題: 這些表已啟用 RLS，但缺少策略
-- 影響: 無法進行公司管理相關操作
-- ============================================================

-- ============================================================
-- 1. companies 表的 RLS 策略
-- ============================================================

-- 策略說明：
-- - 使用者可以查看、建立、更新、刪除自己建立的公司
-- - 透過 created_by 欄位驗證擁有權
-- - 也可以查看自己是成員的公司

-- 1.1 查看權限：使用者可以查看自己建立的公司或是成員的公司
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
CREATE POLICY "Users can view their companies"
  ON companies
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = companies.id
      AND company_members.user_id = auth.uid()
      AND company_members.is_active = true
    )
  );

-- 1.2 新增權限：使用者可以建立公司
DROP POLICY IF EXISTS "Users can create companies" ON companies;
CREATE POLICY "Users can create companies"
  ON companies
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 1.3 更新權限：使用者可以更新自己建立的公司
DROP POLICY IF EXISTS "Users can update their companies" ON companies;
CREATE POLICY "Users can update their companies"
  ON companies
  FOR UPDATE
  USING (created_by = auth.uid());

-- 1.4 刪除權限：使用者可以刪除自己建立的公司
DROP POLICY IF EXISTS "Users can delete their companies" ON companies;
CREATE POLICY "Users can delete their companies"
  ON companies
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================
-- 2. company_members 表的 RLS 策略
-- ============================================================

-- 策略說明：
-- - 使用者可以查看、管理所屬公司的成員
-- - 透過 company_members 表檢查使用者是否為該公司成員
-- - 或者透過 companies.created_by 檢查是否為公司建立者

-- 2.1 查看權限：使用者可以查看所屬公司的成員
DROP POLICY IF EXISTS "Users can view company members" ON company_members;
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
    OR EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = company_members.company_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
    )
  );

-- 2.2 新增權限：公司建立者可以新增成員
DROP POLICY IF EXISTS "Company creators can add members" ON company_members;
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
DROP POLICY IF EXISTS "Company creators can update members" ON company_members;
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
DROP POLICY IF EXISTS "Company creators can delete members" ON company_members;
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
-- 3. company_settings 表的 RLS 策略
-- ============================================================

-- 策略說明：
-- - 使用者可以查看、管理所屬公司的設定
-- - 透過 companies 表的 created_by 或 company_members 檢查權限

-- 3.1 查看權限：使用者可以查看所屬公司的設定
DROP POLICY IF EXISTS "Users can view company settings" ON company_settings;
CREATE POLICY "Users can view company settings"
  ON company_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_settings.company_id
      AND (
        companies.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM company_members
          WHERE company_members.company_id = companies.id
          AND company_members.user_id = auth.uid()
          AND company_members.is_active = true
        )
      )
    )
  );

-- 3.2 新增權限：公司建立者可以建立設定
DROP POLICY IF EXISTS "Company creators can create settings" ON company_settings;
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
DROP POLICY IF EXISTS "Company creators can update settings" ON company_settings;
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
DROP POLICY IF EXISTS "Company creators can delete settings" ON company_settings;
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
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- 檢查 company_members 的策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'company_members'
ORDER BY policyname;

-- 檢查 company_settings 的策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'company_settings'
ORDER BY policyname;

-- ============================================================
-- 完成！
-- ============================================================
-- 執行此腳本後，公司管理系統應該：
-- ✅ companies: 擁有完整的 SELECT, INSERT, UPDATE, DELETE RLS 策略
-- ✅ company_members: 擁有完整的 SELECT, INSERT, UPDATE, DELETE RLS 策略
-- ✅ company_settings: 擁有完整的 SELECT, INSERT, UPDATE, DELETE RLS 策略
-- ✅ 使用者只能操作自己建立的公司或所屬公司的資料
-- ✅ 公司建立者可以管理公司成員和設定
-- ✅ 公司成員可以查看公司資訊
-- ✅ 測試腳本應該能 100% 通過（預期 11/11 測試）
-- ============================================================
