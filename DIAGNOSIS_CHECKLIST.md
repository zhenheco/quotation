# 產品頁面跳轉登入問題診斷清單

## 請您協助提供以下資訊

### 1. Network 標籤檢查
開啟 Chrome DevTools (F12) → Network 標籤：

**當您點擊「產品」時，請檢查：**
- [ ] 是否有任何請求返回 **401 Unauthorized**？
- [ ] 是否有請求返回 **302/307 重定向**？
- [ ] 請提供 `/zh/products` 請求的：
  - Status code: ____
  - Response headers (特別是 Set-Cookie)
  - Request headers (特別是 Cookie)

### 2. Console 標籤檢查
開啟 Chrome DevTools (F12) → Console 標籤：

**除了 autoinsert.js 錯誤外，是否有：**
- [ ] 任何紅色錯誤訊息？
- [ ] 任何 Supabase 相關錯誤？
- [ ] 任何 authentication 相關警告？

### 3. Application 標籤檢查
開啟 Chrome DevTools (F12) → Application 標籤 → Cookies → `https://quote24.cc`

**請檢查是否有以下 cookies：**
- [ ] `sb-access-token` 或類似名稱的 Supabase token
- [ ] 這些 cookies 的 **Expires / Max-Age** 是什麼？
- [ ] **SameSite** 設定是什麼？（None / Lax / Strict）
- [ ] **Secure** 是否為 true？

**當您從儀表板點擊產品時：**
- [ ] Cookies 是否仍然存在？
- [ ] Cookies 的值是否改變？

### 4. 測試其他頁面
**請測試以下頁面是否也會跳轉到登入：**
- [ ] 客戶頁面 (`/zh/customers`) - 結果: ______
- [ ] 報價單頁面 (`/zh/quotations`) - 結果: ______
- [ ] 設定頁面 (`/zh/settings`) - 結果: ______

### 5. 瀏覽器測試
**請測試：**
- [ ] 使用無痕模式（Incognito）是否有同樣問題？
- [ ] 清除瀏覽器快取後是否仍有問題？
- [ ] 使用其他瀏覽器（Firefox/Safari）是否有同樣問題？

### 6. 完整流程測試
**請按以下順序操作並記錄結果：**

1. 清除所有 cookies
2. 前往登入頁面 → 登入
3. **立即**點擊產品頁面 - 結果: ______
4. 回到儀表板
5. 等待 30 秒
6. 點擊產品頁面 - 結果: ______

## 最可能的原因

### 如果只有產品頁面跳轉
可能是：
- 產品頁面的 layout 有特殊問題
- 特定路由的 middleware 處理不同

### 如果所有頁面（除了儀表板）都跳轉
可能是：
- 儀表板和其他頁面的 layout 處理不同
- 儀表板有特殊的認證邏輯

### 如果間歇性跳轉
可能是：
- Session 快速過期
- Cookie 設定問題（SameSite、Secure）
- Cloudflare Workers 快取問題

## 回報格式

請將以上檢查結果整理後回報，特別是：
1. Network 標籤的 `/zh/products` 請求詳情
2. Application 標籤的 Cookies 清單和設定
3. 其他頁面的測試結果

這樣我才能準確診斷並修復問題。
