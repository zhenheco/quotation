# Supabase 遷移執行指南

## 🎯 目的

本指南將幫助你在 Supabase 上執行資料庫遷移，修復當前的「permission denied」錯誤。

## ❓ 為什麼需要執行遷移？

目前系統使用混合架構：
- **Supabase**: 認證（`auth.users`）
- **Zeabur PostgreSQL**: 業務數據（但表尚未創建）

但代碼中使用 Supabase 客戶端查詢業務表（`customers`, `products`, `quotations`），這些表不存在於 Supabase，導致權限錯誤。

**解決方案**: 在 Supabase 上創建業務表，統一使用 Supabase 存儲所有數據。

## 📋 執行步驟

### 步驟 1: 打開 Supabase Dashboard

1. 訪問 [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. 登入你的帳號
3. 選擇項目：**nxlqtnnssfzzpbyfjnby**（或根據你的 URL 選擇對應項目）

### 步驟 2: 進入 SQL Editor

1. 在左側導航欄中找到 **SQL Editor**
2. 點擊進入

### 步驟 3: 創建新查詢

1. 點擊右上角的 **New query** 按鈕
2. 或使用快捷鍵 `Cmd + N` (Mac) / `Ctrl + N` (Windows)

### 步驟 4: 複製遷移 SQL

1. 打開項目中的文件：`supabase-migrations/001_initial_schema.sql`
2. 複製整個文件的內容（約 291 行）

### 步驟 5: 貼上並執行

1. 將複製的 SQL 內容貼到 SQL Editor 中
2. 點擊右下角的 **Run** 按鈕（或使用 `Cmd + Enter` / `Ctrl + Enter`）
3. 等待執行完成（通常需要 5-10 秒）

### 步驟 6: 驗證執行結果

執行完成後，你應該看到：

✅ **Success** 訊息（綠色提示）

如果看到錯誤訊息，請查看下方的「常見錯誤處理」部分。

### 步驟 7: 驗證表已創建

1. 在左側導航欄中點擊 **Table Editor**
2. 你應該看到以下新表：
   - `customers` (客戶表)
   - `products` (產品表)
   - `quotations` (報價單表)
   - `quotation_items` (報價單項目表)
   - `exchange_rates` (匯率表)

### 步驟 8: 檢查 RLS 策略

1. 點擊任一表（例如 `customers`）
2. 點擊右上角的 **RLS** 標籤
3. 你應該看到 4 條策略：
   - Users can view their own customers
   - Users can insert their own customers
   - Users can update their own customers
   - Users can delete their own customers

### 步驟 9: 重啟開發伺服器

回到終端，執行以下命令重啟伺服器：

```bash
# 如果伺服器正在運行，先停止它（Ctrl + C）
# 然後重新啟動
npm run dev
```

### 步驟 10: 驗證修復

1. 打開瀏覽器訪問 [http://localhost:3000](http://localhost:3000)
2. 登入系統
3. 檢查以下頁面是否正常顯示（無錯誤）：
   - Dashboard (儀表板)
   - Customers (客戶管理)
   - Products (產品管理)
   - Quotations (報價單管理)

檢查瀏覽器控制台和終端日誌，確認沒有「permission denied」錯誤。

## 🔍 驗證清單

執行遷移後，確認以下項目：

- [ ] SQL 執行成功，無錯誤訊息
- [ ] Table Editor 中顯示 5 個新表
- [ ] 每個表都啟用了 RLS（Row Level Security）
- [ ] 每個表都有對應的安全策略
- [ ] 開發伺服器重啟後無權限錯誤
- [ ] Dashboard 頁面正常顯示
- [ ] Customers 頁面正常顯示
- [ ] Products 頁面正常顯示
- [ ] Quotations 頁面正常顯示

## ⚠️ 常見錯誤處理

### 錯誤 1: "extension uuid-ossp does not exist"

**原因**: UUID 擴展未啟用

**解決方法**:
1. 在 SQL Editor 中先執行：
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
2. 然後再執行完整的遷移 SQL

### 錯誤 2: "table already exists"

**原因**: 表已經存在（可能之前執行過）

**解決方法**:
1. 這是正常的，遷移腳本使用 `IF NOT EXISTS`，不會覆蓋現有表
2. 如果需要重新創建表，可以先刪除：
   ```sql
   DROP TABLE IF EXISTS quotation_items CASCADE;
   DROP TABLE IF EXISTS quotations CASCADE;
   DROP TABLE IF EXISTS products CASCADE;
   DROP TABLE IF EXISTS customers CASCADE;
   DROP TABLE IF EXISTS exchange_rates CASCADE;
   ```
3. 然後重新執行遷移

### 錯誤 3: "policy already exists"

**原因**: RLS 策略已經存在

**解決方法**:
- 遷移腳本會自動處理（使用 `DROP POLICY IF EXISTS`）
- 如果仍有問題，可以在 Table Editor 中手動刪除舊策略

### 錯誤 4: 權限錯誤仍然存在

**可能原因**:
1. 開發伺服器未重啟
2. 瀏覽器緩存
3. RLS 策略未正確設置

**解決方法**:
1. 重啟開發伺服器
2. 清除瀏覽器緩存（Ctrl + Shift + R / Cmd + Shift + R）
3. 在 Supabase Dashboard 中檢查 RLS 策略
4. 確認 `.env.local` 中的 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正確

## 📊 遷移內容說明

此遷移將創建以下內容：

### 資料表 (5 個)

1. **customers** - 客戶表
   - 儲存客戶基本資訊
   - 支持中英文雙語
   - 包含統一編號、聯絡人等欄位

2. **products** - 產品表
   - 儲存產品資訊
   - 支持中英文雙語
   - 包含產品編號（SKU）、單價、幣別等

3. **quotations** - 報價單表
   - 儲存報價單主表
   - 包含狀態、金額、稅率等資訊
   - 關聯客戶資料

4. **quotation_items** - 報價單項目表
   - 儲存報價單明細
   - 關聯報價單和產品
   - 包含數量、單價、折扣等

5. **exchange_rates** - 匯率表
   - 儲存匯率資訊
   - 支持多幣別轉換
   - 包含來源和日期資訊

### 索引 (11 個)

為以下欄位創建索引以提高查詢效能：
- `user_id` (所有業務表)
- `email` (customers)
- `sku` (products)
- `customer_id`, `status`, `quotation_number` (quotations)
- `quotation_id`, `product_id` (quotation_items)
- `from_currency`, `to_currency`, `date` (exchange_rates)

### 觸發器 (4 個)

為所有業務表創建 `updated_at` 自動更新觸發器

### RLS 策略 (20+ 個)

為每個表創建完整的 Row Level Security 策略：
- SELECT: 用戶只能查看自己的數據
- INSERT: 用戶只能插入自己的數據
- UPDATE: 用戶只能更新自己的數據
- DELETE: 用戶只能刪除自己的數據

特殊規則：
- `exchange_rates`: 所有認證用戶都可以讀取和寫入
- `quotation_items`: 通過 `quotations` 表檢查權限

## 🔐 安全性說明

- **RLS 已啟用**: 所有表都啟用了 Row Level Security
- **多租戶隔離**: 每個用戶只能訪問自己的數據
- **基於 auth.uid()**: 使用 Supabase 內建的用戶認證
- **CASCADE 刪除**: 刪除用戶時會自動刪除相關數據
- **RESTRICT 刪除**: 刪除客戶時，如果有報價單會阻止刪除

## 📞 需要幫助？

如果遇到問題，請提供以下資訊：
1. 錯誤訊息的完整內容
2. 執行的 SQL 語句
3. Supabase Dashboard 截圖
4. 瀏覽器控制台錯誤訊息

---

**版本**: 1.0
**最後更新**: 2025-01-17
**相關文件**: `supabase-migrations/001_initial_schema.sql`
