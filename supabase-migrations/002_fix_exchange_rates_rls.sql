-- 修復 exchange_rates 表的 RLS 政策
-- 此 migration 允許已驗證用戶寫入匯率資料

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
