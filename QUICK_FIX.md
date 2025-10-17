# 🚀 快速修復權限錯誤

## 當前問題

你遇到了以下錯誤之一：
```
Error: permission denied for table customers
Error: permission denied for table products
ERROR: column "sku" does not exist
```

**根本原因**：表結構不正確或表不存在

## 🚨 快速解決方案（5 分鐘）

### ⚡ 選項 A：使用清理重建腳本（推薦）

這個腳本會：
1. 刪除所有舊表
2. 重新創建正確的表結構
3. 設置所有 RLS 策略

#### 步驟：

1. **打開 Supabase Dashboard SQL Editor**
   - 訪問：https://supabase.com/dashboard
   - 選擇項目：**nxlqtnnssfzzpbyfjnby**
   - 左側導航 → **SQL Editor** → **New query**

2. **執行清理重建腳本**
   - 打開 `supabase-migrations/000_drop_and_recreate.sql`
   - 複製全部內容（約 273 行）
   - 貼到 SQL Editor
   - 點擊 **Run** 按鈕

3. **驗證成功**
   - 應該看到：`Schema recreated successfully!`
   - Table Editor 中應出現 5 個表，且 products 表包含 `sku` 欄位

### 🔄 選項 B：分步執行（如果選項 A 失敗）

#### 步驟 1: 刪除舊表
在 SQL Editor 中執行：
```sql
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

#### 步驟 2: 執行完整遷移
- 打開 `supabase-migrations/001_initial_schema.sql`
- 複製全部內容
- 在 SQL Editor 中執行

---

## 4️⃣ 重啟開發伺服器

```bash
# 終端中按 Ctrl + C 停止伺服器
# 然後重新啟動
npm run dev
```

## 5️⃣ 測試修復

訪問 http://localhost:3000 並檢查：
- ✅ Dashboard 頁面正常顯示
- ✅ Customers 頁面正常顯示
- ✅ Products 頁面正常顯示（可以看到 SKU 欄位）
- ✅ Quotations 頁面正常顯示
- ✅ 終端無「permission denied」或「column does not exist」錯誤

## ✅ 完成！

所有錯誤已修復。現在可以：
1. 創建測試客戶
2. 創建測試產品（包含 SKU）
3. 創建測試報價單

## 🔍 驗證表結構

在 Supabase Dashboard 的 Table Editor 中：
1. 點擊 **products** 表
2. 確認以下欄位存在：
   - id, user_id
   - sku ← **新增欄位**
   - name (JSONB)
   - description (JSONB)
   - unit_price ← **正確名稱**
   - currency, category
   - created_at, updated_at

## 📖 需要更多幫助？

查看完整指南：`docs/SUPABASE_MIGRATION_GUIDE.md`

## 🐛 如果仍有問題

1. 確認 Supabase Dashboard 中表結構正確
2. 檢查瀏覽器控制台錯誤
3. 檢查終端伺服器日誌
4. 提供錯誤訊息截圖

---

**重要提示**：執行腳本後，所有現有數據會被清除。如果有重要數據，請先備份！
