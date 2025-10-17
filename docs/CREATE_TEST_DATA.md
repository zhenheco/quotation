# 建立測試數據指南

本指南說明如何在開發環境中建立測試數據，包括客戶、產品和報價單。

## 📋 測試數據內容

執行腳本後將建立以下測試數據：

### 客戶 (5個)
1. 台灣科技股份有限公司 - 台北
2. 優質貿易有限公司 - 新竹
3. 創新設計工作室 - 台中
4. 全球物流企業 - 高雄
5. 美國進口商公司 - 舊金山

### 產品 (10個)
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

### 報價單 (5個)
1. **Q2025-001** - 台灣科技 - Draft（草稿）- TWD 51,450
2. **Q2025-002** - 優質貿易 - Sent（已發送）- TWD 27,825
3. **Q2025-003** - 創新設計 - Accepted（已接受）- TWD 40,320
4. **Q2025-004** - 美國進口商 - Sent（已發送）- USD 1,512
5. **Q2025-005** - 全球物流 - Rejected（已拒絕）- TWD 15,750

## 🚀 執行步驟

### 步驟 1: 登入系統並獲取 User ID

1. 啟動開發伺服器（如果尚未啟動）：
   ```bash
   npm run dev
   ```

2. 前往 http://localhost:3000 並使用 Google OAuth 登入

3. 登入後，開啟瀏覽器開發者工具（按 F12）

4. 切換到 **Console** 標籤

5. 執行以下 JavaScript 程式碼來獲取您的 User ID：
   ```javascript
   // 方法 1: 從 localStorage 獲取
   const session = JSON.parse(localStorage.getItem('sb-nxlqtnnssfzzpbyfjnby-auth-token'))
   console.log('User ID:', session?.user?.id)

   // 方法 2: 直接複製
   const userId = session?.user?.id
   copy(userId)  // 自動複製到剪貼簿
   console.log('User ID 已複製到剪貼簿:', userId)
   ```

6. 複製顯示的 User ID（應該是類似 `a1b2c3d4-e5f6-7890-abcd-ef1234567890` 的格式）

### 步驟 2: 執行測試數據建立腳本

在終端機中執行以下命令（將 `YOUR_USER_ID` 替換為您在步驟 1 獲取的 User ID）：

```bash
npx tsx scripts/create-test-data.ts YOUR_USER_ID
```

例如：
```bash
npx tsx scripts/create-test-data.ts a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### 步驟 3: 驗證數據

1. 重新整理瀏覽器頁面
2. 前往各個頁面確認數據已建立：
   - **Dashboard** - 應該顯示統計數字
   - **客戶管理** - 應該列出 5 個客戶
   - **產品管理** - 應該列出 10 個產品
   - **報價單管理** - 應該列出 5 個報價單

## 🔄 重新建立測試數據

如果您想清除現有數據並重新建立，可以：

### 方法 1: 直接執行腳本
腳本使用 `ON CONFLICT` 來處理重複，所以可以直接重複執行。

### 方法 2: 手動清除後重新建立
```bash
# 連接到 Zeabur PostgreSQL
PGPASSWORD='your-password' psql -h your-host -U root -d zeabur

# 執行清除命令
DELETE FROM quotation_items;
DELETE FROM quotations;
DELETE FROM customers;
DELETE FROM products;

# 退出 psql
\q

# 重新執行建立腳本
npx tsx scripts/create-test-data.ts YOUR_USER_ID
```

## ⚠️ 注意事項

1. **User ID 必須存在**：確保您已經至少登入過一次系統
2. **環境變數**：確保 `.env.local` 中的 `ZEABUR_POSTGRES_URL` 已正確設定
3. **資料庫連線**：確保可以連接到 Zeabur PostgreSQL
4. **重複執行**：腳本使用 `ON CONFLICT` 處理重複，可以安全地重複執行

## 🐛 故障排除

### 錯誤：無法連接到資料庫
- 檢查 `.env.local` 中的 `ZEABUR_POSTGRES_URL` 是否正確
- 確認 Zeabur PostgreSQL 服務正在運行
- 檢查網路連線

### 錯誤：User ID 格式不正確
- 確保 User ID 是 UUID 格式（8-4-4-4-12）
- 重新從瀏覽器獲取正確的 User ID

### 錯誤：權限被拒絕
- 確保 Zeabur PostgreSQL 的使用者有適當的權限
- 檢查資料庫連線字串是否包含正確的使用者名稱和密碼

### 看不到數據
- 確認您使用的是正確的 User ID
- 重新整理瀏覽器頁面
- 檢查瀏覽器開發者工具的 Console 是否有錯誤

## 📚 相關文檔

- [README.md](../README.md) - 專案總覽
- [ZEABUR_POSTGRES_SETUP.md](./ZEABUR_POSTGRES_SETUP.md) - Zeabur PostgreSQL 設定
- [ENV_SECURITY_GUIDE.md](./ENV_SECURITY_GUIDE.md) - 環境變數安全指南

---

**建立日期**: 2025-10-17
**最後更新**: 2025-10-17
