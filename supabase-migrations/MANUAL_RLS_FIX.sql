-- ========================================
-- 手動執行: 修復 exchange_rates 表的 RLS 政策
-- ========================================
-- 請在 Supabase Dashboard > SQL Editor 中執行此腳本
--
-- 路徑: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ========================================

-- 1. 移除舊的 SELECT 政策（如果存在）
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;

-- 2. 建立新的 RLS 政策

-- 允許所有已驗證用戶讀取匯率資料
CREATE POLICY "Authenticated users can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

-- 允許所有已驗證用戶插入匯率資料
CREATE POLICY "Authenticated users can insert exchange rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 允許所有已驗證用戶更新匯率資料
CREATE POLICY "Authenticated users can update exchange rates"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (true);

-- 注意：不允許刪除匯率資料，保持資料完整性

-- ========================================
-- 驗證 RLS 政策
-- ========================================
-- 執行以下查詢確認政策已正確建立:
--
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'exchange_rates';
-- ========================================
