# 寄送報價單功能測試指南

## 前置準備

1. **啟動開發伺服器**
   ```bash
   pnpm run dev
   ```
   伺服器應該運行在 http://localhost:3000

2. **確認測試資料**
   ```bash
   node test-send-quotation.mjs
   ```
   應該顯示至少一筆 `draft` 狀態的報價單

## 測試步驟

### 步驟 1：開啟 Chrome DevTools

1. 開啟 Chrome 瀏覽器
2. 訪問 http://localhost:3000
3. 按 `F12` 或 `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows) 開啟 DevTools
4. 切換到 **Network** 標籤
5. 確保 **Preserve log** 已勾選

### 步驟 2：登入系統

1. 使用測試帳號登入：`acejou27@gmail.com`
2. 在 Network 標籤中觀察登入請求
3. 確認登入成功

### 步驟 3：進入報價單列表

1. 點擊側邊欄的「報價單」
2. 在 Network 標籤中應該看到：
   - `GET /api/quotations` - 狀態碼 200
3. 頁面應該顯示報價單列表，包括：
   - Q2025-001 (狀態: sent)
   - Q2025-002 (狀態: signed)
   - Q2025-003 (狀態: draft)

### 步驟 4：測試寄送報價單（從列表頁面）

1. 找到 **Q2025-003** (draft 狀態)
2. 在操作欄中點擊綠色的「寄送」按鈕
3. 應該彈出確認對話框
4. 點擊「確定」

**預期結果**：
- ✅ Network 標籤顯示：
  - `POST /api/quotations/3d9ea7c9-11f1-436e-88c8-4f80515c69bb/send`
  - 狀態碼：200
  - Response：
    ```json
    {
      "success": true,
      "message": "Quotation sent successfully",
      "data": {
        "id": "3d9ea7c9-11f1-436e-88c8-4f80515c69bb",
        "status": "sent",
        ...
      }
    }
    ```
- ✅ 頁面顯示成功通知：「報價單已成功發送！」
- ✅ 報價單狀態自動更新為 「sent」

### 步驟 5：測試寄送報價單（從詳細頁面）

1. 點擊報價單列表中的「檢視」進入詳細頁面
2. 在詳細頁面找到綠色的「寄送報價單」按鈕
3. 點擊按鈕
4. 確認對話框顯示：「確定要將報價單發送至 avyshiu@gmail.com 嗎？」
5. 點擊「確定」

**預期結果**：
- ✅ 同步驟 4 的 Network 請求
- ✅ 頁面顯示成功通知：「報價單已成功發送！」
- ✅ 狀態選擇器顯示 「sent」

### 步驟 6：測試沒有客戶郵件的情況

如果需要測試此情況：
1. 在資料庫中建立一筆沒有客戶郵件的報價單
2. 寄送按鈕應該是 **disabled** 狀態（灰色、無法點擊）
3. 滑鼠移到按鈕上應該顯示提示：「客戶郵件地址不存在」

**預期結果**：
- ✅ 按鈕無法點擊
- ✅ 顯示提示訊息

## Chrome DevTools 檢查重點

### Network 標籤

1. **檢查請求方法**
   - Method: `POST`
   - URL: `/api/quotations/[id]/send`

2. **檢查請求標頭**
   - Content-Type: `application/json`
   - Cookie: 應該包含 session cookie

3. **檢查回應**
   - Status: `200 OK`
   - Response Type: `application/json`

4. **檢查時間**
   - 請求應該在 1 秒內完成

### Console 標籤

1. **檢查是否有錯誤**
   - 應該沒有紅色錯誤訊息
   - 可能會有一些 info 級別的日誌

2. **檢查成功日誌**
   - 可能會看到 React Query 的快取更新訊息

### Application 標籤

1. **檢查 Session Storage**
   - 確認 auth session 存在

2. **檢查 Cookies**
   - 確認 Supabase auth cookies 存在

## 錯誤排除

### 錯誤 1: 500 Internal Server Error

**症狀**：
- Network 標籤顯示 500 錯誤
- Console 顯示：`SyntaxError: Unexpected token '<', ... is not valid JSON`

**解決方法**：
1. 檢查 API route 檔案：`app/api/quotations/[id]/send/route.ts`
2. 確認使用 `updateQuotation` 函數而非直接 Supabase 呼叫
3. 重新建置：`pnpm run build`

### 錯誤 2: 401 Unauthorized

**症狀**：
- Network 標籤顯示 401 錯誤
- 回應：`{ "error": "Unauthorized" }`

**解決方法**：
1. 重新登入
2. 檢查 Cookies 是否存在
3. 清除瀏覽器快取後重試

### 錯誤 3: 404 Not Found

**症狀**：
- Network 標籤顯示 404 錯誤
- API 路徑錯誤

**解決方法**：
1. 確認報價單 ID 正確
2. 檢查資料庫中是否存在該報價單
3. 確認 user_id 匹配

### 錯誤 4: 400 Bad Request

**症狀**：
- Network 標籤顯示 400 錯誤
- 回應：`{ "error": "Customer email not found" }`

**解決方法**：
1. 確認報價單關聯的客戶有郵件地址
2. 檢查資料庫中的客戶資料

## 成功指標

所有以下項目都應該 ✅：

- [ ] 寄送按鈕顯示深綠色
- [ ] 沒有客戶郵件時按鈕無法點擊
- [ ] 點擊按鈕顯示確認對話框
- [ ] Network 請求返回 200 狀態碼
- [ ] Console 沒有錯誤訊息
- [ ] 頁面顯示成功通知
- [ ] 報價單狀態更新為 sent
- [ ] 整個流程在 2 秒內完成

## 測試完成後

1. 停止開發伺服器 (Ctrl+C)
2. 如果所有測試通過，可以 commit 並 push
3. 如果有問題，記錄錯誤訊息並修正

## 相關檔案

- API Route: `app/api/quotations/[id]/send/route.ts`
- Hook: `hooks/useQuotations.ts`
- 列表頁面: `app/[locale]/quotations/QuotationList.tsx`
- 詳細頁面: `app/[locale]/quotations/[id]/QuotationDetail.tsx`
- 測試腳本: `test-send-quotation.mjs`
