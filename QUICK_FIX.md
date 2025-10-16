# 快速修復指南 - 匯率功能

## 🚨 問題分析

由於 PostgreSQL 和 Supabase 不是同一套系統，我們需要採用不同的方案。

## ✅ 解決方案 A: 純 API 模式（推薦，無需資料庫）

修改代碼讓匯率功能直接使用 API，不依賴資料庫快取。

### 步驟：

1. **前往 Supabase Dashboard SQL Editor**
   - https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby/sql

2. **執行以下 SQL** (複製貼上後點 Run)：

```sql
-- 移除舊政策
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;

-- 允許所有已驗證用戶讀取
CREATE POLICY "Authenticated users can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

-- 允許所有已驗證用戶插入
CREATE POLICY "Authenticated users can insert exchange rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 允許所有已驗證用戶更新
CREATE POLICY "Authenticated users can update exchange rates"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (true);
```

3. **驗證政策**：

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'exchange_rates';
```

應該看到 3 個政策：
- `Authenticated users can view exchange rates` (SELECT)
- `Authenticated users can insert exchange rates` (INSERT)
- `Authenticated users can update exchange rates` (UPDATE)

---

## ✅ 解決方案 B: 簡化版（如果不想用資料庫）

如果您不想處理資料庫權限，我可以修改代碼，讓匯率功能完全不依賴資料庫快取，只使用 API。

這樣的話：
- ✅ 優點：無需資料庫設定，立即可用
- ⚠️  缺點：每次都要呼叫外部 API（但有 Next.js 快取）

---

## 🔧 您想選擇哪個方案？

1. **方案 A**：我在 Supabase Dashboard 執行上面的 SQL（5 分鐘）
2. **方案 B**：修改代碼，完全移除資料庫依賴（我來改）

---

## 📝 Turbopack 錯誤的臨時解決方法

在執行測試前，先清理 Next.js 快取：

```bash
rm -rf .next
npm run dev
```

然後再測試 API。
