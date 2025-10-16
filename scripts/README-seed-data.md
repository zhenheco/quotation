# 測試數據匯入指南

## 📋 概要

此目錄包含用於建立測試數據的 SQL 腳本，包括：
- 5 個測試客戶
- 10 個測試產品
- 5 個測試報價單（涵蓋所有狀態）
- 匯率數據

## 🚀 執行步驟

### 方法 1: 使用 Supabase Dashboard（推薦）

1. **登入 Supabase Dashboard**
   - 前往 [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - 選擇您的專案

2. **獲取您的 User ID**
   - 前往 **Authentication** → **Users**
   - 登入一次系統（使用 Google OAuth）
   - 複製您的 User ID（UUID 格式，例如：`a1b2c3d4-e5f6-7890-abcd-ef1234567890`）

3. **準備 SQL 腳本**
   - 打開 `scripts/seed-test-data.sql`
   - 使用文字編輯器的「尋找與取代」功能
   - 將所有 `{USER_ID}` 替換為您實際的 User ID
   - 儲存檔案

4. **執行 SQL 腳本**
   - 在 Supabase Dashboard 前往 **SQL Editor**
   - 點擊 **New Query**
   - 複製並貼上修改後的 SQL 腳本
   - 點擊 **Run** 執行

5. **驗證數據**
   - 前往 **Table Editor**
   - 檢查以下表格：
     - `customers` - 應該有 5 筆資料
     - `products` - 應該有 10 筆資料
     - `quotations` - 應該有 5 筆資料
     - `quotation_items` - 應該有約 15-20 筆資料

### 方法 2: 使用 Supabase CLI

```bash
# 1. 登入 Supabase
npm run supabase:login

# 2. 連結到您的專案
npm run supabase:link

# 3. 獲取 User ID（執行此查詢）
npx supabase db execute --sql "SELECT id FROM auth.users LIMIT 1;"

# 4. 修改 seed-test-data.sql，將 {USER_ID} 替換為實際 ID

# 5. 執行腳本
npx supabase db execute --file scripts/seed-test-data.sql
```

## 📊 測試數據詳情

### 客戶 (Customers)
1. **台灣科技股份有限公司** - 台北
2. **優質貿易有限公司** - 新竹
3. **創新設計工作室** - 台中
4. **全球物流企業** - 高雄
5. **美國進口商公司** - 舊金山

### 產品 (Products)
- 筆記型電腦 (TWD 35,000)
- 無線滑鼠 (TWD 800)
- 機械式鍵盤 (TWD 2,500)
- 27吋 4K 顯示器 (TWD 12,000)
- 網路攝影機 (TWD 1,500)
- 外接硬碟 1TB (TWD 1,800)
- 多功能印表機 (TWD 8,500)
- 辦公椅 (TWD 4,500)
- 電腦包 (TWD 1,200)
- USB 集線器 (TWD 600)

### 報價單 (Quotations)
1. **Q2025-001** - 台灣科技 - Draft（草稿）- TWD 52,815
2. **Q2025-002** - 優質貿易 - Sent（已發送）- TWD 27,825
3. **Q2025-003** - 創新設計 - Accepted（已接受）- TWD 40,320
4. **Q2025-004** - 美國進口商 - Sent（已發送）- USD 1,587.30
5. **Q2025-005** - 全球物流 - Rejected（已拒絕）- TWD 15,750

## 🧹 清除測試數據

如果需要清除測試數據並重新開始，在 SQL Editor 中執行：

```sql
-- 注意：這會刪除所有數據！請謹慎使用
DELETE FROM quotation_items;
DELETE FROM quotations;
DELETE FROM customers;
DELETE FROM products;
DELETE FROM exchange_rates;
```

## ⚠️ 注意事項

1. **User ID 必須存在**：確保您已經至少登入過一次系統
2. **RLS 政策**：所有數據都會與您的 User ID 關聯
3. **UUID 格式**：不要修改腳本中的 UUID，它們是預先設定好的測試 ID
4. **重複執行**：如果重複執行腳本，可能會因為 UUID 衝突而失敗（需先清除數據）

## 🔍 驗證測試

執行數據匯入後，建議測試以下功能：

### Dashboard
- [ ] 統計數字是否正確顯示（5 客戶、10 產品、5 報價單）
- [ ] 歡迎訊息是否顯示中文

### 客戶管理
- [ ] 列表頁顯示 5 個客戶
- [ ] 搜尋功能正常
- [ ] 編輯客戶資料
- [ ] 刪除測試（建議先建立一個新客戶再測試刪除）

### 產品管理
- [ ] 列表頁顯示 10 個產品
- [ ] 搜尋功能正常
- [ ] 編輯產品資料
- [ ] 刪除測試

### 報價單管理
- [ ] 列表頁顯示 5 個報價單
- [ ] 狀態篩選功能（Draft, Sent, Accepted, Rejected）
- [ ] 查看報價單詳情
- [ ] 編輯報價單
- [ ] 建立新報價單（選擇客戶和產品）
- [ ] 多幣別顯示（TWD 和 USD）

### 語言切換
- [ ] 中英文切換正常
- [ ] 所有頁面的翻譯正確
- [ ] 雙語數據顯示正確（客戶名稱、產品名稱等）

## 📚 相關文檔

- [README.md](../README.md) - 專案總覽
- [SUPABASE.md](../SUPABASE.md) - Supabase CLI 使用指南
- [ROADMAP.md](../ROADMAP.md) - 開發路線圖

---

**建立日期**: 2025-10-16
**最後更新**: 2025-10-16
