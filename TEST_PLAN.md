# API 修復測試計劃

## 測試目標
驗證產品和客戶編輯 API 在 Cloudflare Workers 環境中正常運作

## 部署資訊
- URL: https://quote24.cc
- 版本: 08866e7a-0fdb-44d5-9b5f-f27c931938d9
- 部署時間: 2025-10-31T05:14:21.257Z

## 測試步驟

### 1. 開啟 Chrome DevTools
1. 開啟 Chrome 瀏覽器
2. 按 F12 或 Cmd+Option+I (Mac) 開啟 DevTools
3. 切換到 **Console** 標籤（查看錯誤）
4. 切換到 **Network** 標籤（查看 API 請求）
5. 勾選 **Preserve log**（保留日誌）

### 2. 登入系統
1. 前往 https://quote24.cc/zh/login
2. 使用您的帳號登入（acejou27@gmail.com）
3. **檢查 Console**：應該沒有錯誤
4. **檢查 Network**：確認登入請求成功（200 OK）

### 3. 測試產品編輯功能
1. 前往產品列表頁面：https://quote24.cc/zh/products
2. 找到任一產品（例如 ID: c5f3ae6a-2d2f-4b9a-9f9e-dd25e66ccfc3）
3. 點擊「編輯」按鈕
4. **關鍵檢查點**：
   - ✅ **Console 標籤**：不應該有紅色錯誤
   - ✅ **Network 標籤**：找到 `GET /api/products/[id]` 請求
   - ✅ 狀態應該是 **200 OK**（不是 500）
   - ✅ Response 應該包含產品資料（JSON）
   - ✅ 編輯表單應該正確顯示產品資料

### 4. 測試客戶編輯功能
1. 前往客戶列表頁面：https://quote24.cc/zh/customers
2. 找到任一客戶
3. 點擊「編輯」按鈕
4. **關鍵檢查點**：
   - ✅ **Console 標籤**：不應該有紅色錯誤
   - ✅ **Network 標籤**：找到 `GET /api/customers/[id]` 請求
   - ✅ 狀態應該是 **200 OK**（不是 500）
   - ✅ Response 應該包含客戶資料（JSON）
   - ✅ 編輯表單應該正確顯示客戶資料

### 5. 測試產品更新功能
1. 在產品編輯頁面修改任一欄位（例如描述）
2. 點擊「儲存」
3. **關鍵檢查點**：
   - ✅ **Network 標籤**：找到 `PUT /api/products/[id]` 請求
   - ✅ 狀態應該是 **200 OK**
   - ✅ Response 應該包含更新後的產品資料
   - ✅ 頁面應該顯示成功訊息並重定向

### 6. 測試客戶更新功能
1. 在客戶編輯頁面修改任一欄位
2. 點擊「儲存」
3. **關鍵檢查點**：
   - ✅ **Network 標籤**：找到 `PUT /api/customers/[id]` 請求
   - ✅ 狀態應該是 **200 OK**
   - ✅ Response 應該包含更新後的客戶資料
   - ✅ 頁面應該顯示成功訊息並重定向

## 預期結果

### 修復前（錯誤）
- API 請求返回 **500 Internal Server Error**
- Console 顯示 `Failed to fetch` 錯誤
- 編輯頁面無法載入資料

### 修復後（正確）
- API 請求返回 **200 OK** 或 **401 Unauthorized**（未登入時）
- Console 沒有錯誤
- 編輯頁面正確顯示資料
- 更新操作成功執行

## 如何回報問題

如果測試失敗，請提供：
1. **Console 標籤的錯誤訊息**（紅色文字）
2. **Network 標籤的失敗請求**：
   - 請求 URL
   - 狀態碼
   - Response 內容
3. **截圖**（如果有畫面問題）

## 技術細節

### 修復內容
- 移除對 `@/lib/services/database` 的依賴（使用 `pg` 套件，不相容 Cloudflare Workers）
- 改用 `@supabase/ssr` 的 HTTP REST API
- 確保所有查詢都包含 `user_id` 檢查（RLS）

### 相關檔案
- `/app/api/products/[id]/route.ts` - 產品 API（GET, PUT, DELETE）
- `/app/api/customers/[id]/route.ts` - 客戶 API（GET, PUT, DELETE）

### Commit
- Hash: 4e06199
- Message: "修復: Cloudflare Workers API 使用 Supabase client"
