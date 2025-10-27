-- ============================================================
-- 修復合約與付款系統的 RLS 策略
-- ============================================================
-- 用途: 為 customer_contracts, payments, payment_schedules 表新增完整的 RLS 策略
-- 日期: 2025-10-24
-- 策略: 簡化設計，避免循環依賴，只檢查 user_id
-- ============================================================

-- ⚠️ 重要：先刪除舊的策略（如果存在）
DROP POLICY IF EXISTS "Users can view their contracts" ON customer_contracts;
DROP POLICY IF EXISTS "Users can create contracts" ON customer_contracts;
DROP POLICY IF EXISTS "Users can update their contracts" ON customer_contracts;
DROP POLICY IF EXISTS "Users can delete their contracts" ON customer_contracts;

DROP POLICY IF EXISTS "Users can view their payments" ON payments;
DROP POLICY IF EXISTS "Users can create payments" ON payments;
DROP POLICY IF EXISTS "Users can update their payments" ON payments;
DROP POLICY IF EXISTS "Users can delete their payments" ON payments;

DROP POLICY IF EXISTS "Users can view their payment schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Users can create payment schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Users can update their payment schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Users can delete their payment schedules" ON payment_schedules;

-- ============================================================
-- 1. customer_contracts 表的 RLS 策略
-- ============================================================

-- 策略說明：
-- - 使用者只能操作自己建立的合約（user_id）
-- - 不涉及其他表，避免循環依賴

-- 1.1 查看權限：使用者可以查看自己的合約
CREATE POLICY "Users can view their contracts"
  ON customer_contracts
  FOR SELECT
  USING (user_id = auth.uid());

-- 1.2 新增權限：使用者可以建立合約
CREATE POLICY "Users can create contracts"
  ON customer_contracts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 1.3 更新權限：使用者可以更新自己的合約
CREATE POLICY "Users can update their contracts"
  ON customer_contracts
  FOR UPDATE
  USING (user_id = auth.uid());

-- 1.4 刪除權限：使用者可以刪除自己的合約
CREATE POLICY "Users can delete their contracts"
  ON customer_contracts
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 2. payments 表的 RLS 策略
-- ============================================================

-- 策略說明：
-- - 使用者只能操作自己建立的付款記錄（user_id）
-- - 簡化設計，只檢查擁有權

-- 2.1 查看權限：使用者可以查看自己的付款記錄
CREATE POLICY "Users can view their payments"
  ON payments
  FOR SELECT
  USING (user_id = auth.uid());

-- 2.2 新增權限：使用者可以建立付款記錄
CREATE POLICY "Users can create payments"
  ON payments
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 2.3 更新權限：使用者可以更新自己的付款記錄
CREATE POLICY "Users can update their payments"
  ON payments
  FOR UPDATE
  USING (user_id = auth.uid());

-- 2.4 刪除權限：使用者可以刪除自己的付款記錄
CREATE POLICY "Users can delete their payments"
  ON payments
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 3. payment_schedules 表的 RLS 策略
-- ============================================================

-- 策略說明：
-- - 使用者只能操作自己的付款排程（user_id）
-- - 簡化設計，只檢查擁有權

-- 3.1 查看權限：使用者可以查看自己的付款排程
CREATE POLICY "Users can view their payment schedules"
  ON payment_schedules
  FOR SELECT
  USING (user_id = auth.uid());

-- 3.2 新增權限：使用者可以建立付款排程（通常由系統函數自動生成）
CREATE POLICY "Users can create payment schedules"
  ON payment_schedules
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3.3 更新權限：使用者可以更新自己的付款排程
CREATE POLICY "Users can update their payment schedules"
  ON payment_schedules
  FOR UPDATE
  USING (user_id = auth.uid());

-- 3.4 刪除權限：使用者可以刪除自己的付款排程
CREATE POLICY "Users can delete their payment schedules"
  ON payment_schedules
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 4. 驗證策略已正確建立
-- ============================================================

-- 檢查 customer_contracts 的策略
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'customer_contracts'
ORDER BY cmd, policyname;

-- 檢查 payments 的策略
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY cmd, policyname;

-- 檢查 payment_schedules 的策略
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'payment_schedules'
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
WHERE tablename IN ('customer_contracts', 'payments', 'payment_schedules')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================
-- 完成！策略說明
-- ============================================================
-- ✅ customer_contracts: 使用者只能操作自己的合約（user_id）
-- ✅ payments: 使用者只能操作自己的付款記錄（user_id）
-- ✅ payment_schedules: 使用者只能操作自己的排程（user_id）
--
-- 策略設計：
-- ✅ 沒有循環依賴
-- ✅ 邏輯清晰簡單
-- ✅ 符合多租戶架構
-- ✅ 測試腳本應該能 100% 通過（預期 21 個測試）
-- ============================================================
