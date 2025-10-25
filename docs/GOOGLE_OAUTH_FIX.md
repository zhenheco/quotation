# Google OAuth redirect_uri_mismatch 錯誤修復指南

## 問題描述

當嘗試使用 Google 登入時出現以下錯誤：

```
發生錯誤 400：redirect_uri_mismatch
已封鎖存取權：「報價單系統」的要求無效
```

## 錯誤原因

此錯誤發生於 Google Cloud Console 中配置的授權重定向 URI 與應用程式實際請求的 URI 不匹配。

## 解決步驟

### 1. 前往 Supabase Dashboard

1. 登入 [Supabase Dashboard](https://app.supabase.com)
2. 選擇你的專案：`https://nxlqtnnssfzzpbyfjnby.supabase.co`
3. 在左側選單點擊 **Authentication** > **Providers**
4. 找到 **Google** provider

### 2. 確認 Supabase 中的 Google OAuth 設定

在 Supabase 的 Google provider 設定中，你會看到：
- **Callback URL (for OAuth)**：`https://nxlqtnnssfzzpbyfjnby.supabase.co/auth/v1/callback`

記下這個 URL，稍後需要在 Google Cloud Console 中使用。

### 3. 前往 Google Cloud Console

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇你的專案（報價單系統）
3. 在左側選單選擇 **APIs & Services** > **Credentials**

### 4. 編輯 OAuth 2.0 Client ID

1. 找到你的 OAuth 2.0 Client ID（通常命名為 "Web client" 或類似名稱）
2. 點擊編輯（鉛筆圖示）
3. 在 **Authorized redirect URIs** 區塊，確保包含以下 URI：

**生產環境（Supabase）**：
```
https://nxlqtnnssfzzpbyfjnby.supabase.co/auth/v1/callback
```

**本地開發環境**：
```
http://localhost:3333/auth/callback
http://localhost:3000/auth/callback
```

**重要**：
- 確保 URI 完全一致（包括 http/https、域名、端口、路徑）
- 不要有多餘的斜線
- 使用正確的端口號（你的專案使用 3333）

### 5. 儲存變更

點擊 **Save** 儲存變更。

### 6. 更新 Supabase 設定（如果需要）

如果你還沒有在 Supabase 中配置 Google OAuth：

1. 在 Supabase Dashboard > Authentication > Providers > Google
2. 啟用 Google provider
3. 填入從 Google Cloud Console 獲得的：
   - **Client ID** (OAuth 2.0 Client ID)
   - **Client Secret** (OAuth 2.0 Client Secret)
4. 點擊 **Save**

### 7. 測試登入

1. 清除瀏覽器快取和 Cookie
2. 重新訪問登入頁面
3. 點擊 "使用 Google 帳戶登入"
4. 應該能成功重定向到 Google 登入頁面

## 常見問題排查

### 問題 1：仍然出現 redirect_uri_mismatch

**檢查清單**：
- [ ] Google Cloud Console 中的 Authorized redirect URIs 是否正確
- [ ] URI 是否包含正確的協議（http/https）
- [ ] 端口號是否正確（3333）
- [ ] 是否有多餘的斜線
- [ ] 變更後是否有儲存

### 問題 2：本地開發可以，但部署後不行

確保在 Google Cloud Console 中同時添加：
- 本地開發 URI：`http://localhost:3333/auth/callback`
- 生產環境 URI：`https://nxlqtnnssfzzpbyfjnby.supabase.co/auth/v1/callback`

### 問題 3：使用自定義域名

如果你使用了自定義域名（例如：`https://yourdomain.com`），需要添加：
```
https://yourdomain.com/auth/callback
```

## 完整的授權重定向 URI 列表

建議在 Google Cloud Console 中配置以下所有 URI：

```
# Supabase 生產環境
https://nxlqtnnssfzzpbyfjnby.supabase.co/auth/v1/callback

# 本地開發環境（多種端口以防萬一）
http://localhost:3000/auth/callback
http://localhost:3333/auth/callback
http://127.0.0.1:3000/auth/callback
http://127.0.0.1:3333/auth/callback

# 如果使用 Vercel 或其他部署平台
https://your-app.vercel.app/auth/callback
```

## 驗證步驟

配置完成後，驗證以下事項：

1. **Supabase 設定**：
   - [ ] Google provider 已啟用
   - [ ] Client ID 和 Secret 已填入
   - [ ] Callback URL 正確

2. **Google Cloud Console**：
   - [ ] Authorized redirect URIs 包含所有需要的 URI
   - [ ] OAuth consent screen 已配置
   - [ ] 應用程式已發布（如果需要）

3. **應用程式設定**：
   - [ ] `.env.local` 包含正確的 Supabase URL 和 keys
   - [ ] `NEXT_PUBLIC_APP_URL` 設定正確
   - [ ] 認證回調路由存在（`/auth/callback`）

## 參考資料

- [Supabase Google OAuth 文檔](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 文檔](https://developers.google.com/identity/protocols/oauth2)
- [常見 OAuth 錯誤](https://developers.google.com/identity/protocols/oauth2/web-server#handlingresponse)

## 需要幫助？

如果按照以上步驟仍然無法解決問題：

1. 檢查瀏覽器開發者工具的 Network 標籤，查看實際發送的 redirect_uri 參數
2. 確認 Google Cloud Console 中的專案是正確的專案
3. 嘗試建立新的 OAuth Client ID
4. 檢查 Supabase 專案的日誌（Dashboard > Logs）

---

**更新日期**：2025-10-25
**適用版本**：Supabase + Google OAuth
