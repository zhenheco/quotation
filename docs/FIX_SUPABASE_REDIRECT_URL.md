# 🔧 修正 Supabase 重定向 URL 問題

## ❌ 問題描述

當前 Supabase 專案的 Site URL 設定為 `tarot.zhenhe-dm.com`，導致：
- ✉️ 註冊驗證郵件中的連結跳轉到錯誤的網址
- 🔑 密碼重設郵件中的連結跳轉到錯誤的網址
- ❌ 用戶無法完成驗證和密碼重設流程

## ✅ 解決方案

### 方法 1: 透過 Supabase Dashboard（推薦）⭐

#### 步驟 1: 登入 Supabase Dashboard

1. 前往: https://supabase.com/dashboard
2. 使用您的帳號登入
3. 選擇專案: **nxlqtnnssfzzpbyfjnby**

#### 步驟 2: 進入 URL Configuration

1. 在左側選單點選 **Authentication**
2. 點選 **URL Configuration** 標籤

#### 步驟 3: 修改 Site URL

找到 **Site URL** 欄位並修改為：

**開發環境**:
```
http://localhost:3001
```

**正式環境** (部署後):
```
https://your-production-domain.com
```

#### 步驟 4: 設定 Redirect URLs

在 **Redirect URLs** 區域，新增以下網址到白名單:

```
http://localhost:3001/auth/callback
http://localhost:3001/auth/callback?next=/zh/dashboard
http://localhost:3001/auth/callback?next=/en/dashboard
http://localhost:3001/auth/callback?next=/zh/update-password
http://localhost:3001/auth/callback?next=/en/update-password
http://localhost:3000/auth/callback
http://localhost:3333/auth/callback
```

**正式環境** (部署後):
```
https://your-production-domain.com/auth/callback
https://your-production-domain.com/auth/callback?next=/zh/dashboard
https://your-production-domain.com/auth/callback?next=/en/dashboard
https://your-production-domain.com/auth/callback?next=/zh/update-password
https://your-production-domain.com/auth/callback?next=/en/update-password
```

#### 步驟 5: 儲存設定

1. 點擊 **Save** 按鈕
2. 等待設定生效（通常是即時的）

---

### 方法 2: 透過 Supabase Management API

如果您有 Supabase Management API 存取權限，可以使用 API 修改:

```bash
# 需要 Supabase Management API Token
curl -X PATCH \
  'https://api.supabase.com/v1/projects/nxlqtnnssfzzpbyfjnby/config' \
  -H 'Authorization: Bearer YOUR_MANAGEMENT_API_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_url": "http://localhost:3001",
    "redirect_urls": [
      "http://localhost:3001/auth/callback",
      "http://localhost:3001/auth/callback?next=/zh/dashboard",
      "http://localhost:3001/auth/callback?next=/en/dashboard",
      "http://localhost:3001/auth/callback?next=/zh/update-password",
      "http://localhost:3001/auth/callback?next=/en/update-password"
    ]
  }'
```

---

### 方法 3: 檢查環境變數

確認 `.env.local` 中的設定正確:

```bash
# 當前開發伺服器運行在 3001 埠
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://nxlqtnnssfzzpbyfjnby.supabase.co
```

⚠️ **注意**: 修改 `.env.local` 不會影響 Supabase 發送的郵件連結，還是需要在 Dashboard 修改 Site URL。

---

## 🧪 驗證修正

修改完成後，請依照以下步驟驗證:

### 1. 測試註冊流程

```bash
# 1. 前往註冊頁面
http://localhost:3001/zh/register

# 2. 填寫表單並提交
Email: test@example.com
Password: TestPassword123!

# 3. 檢查收到的驗證郵件
# 4. 點擊驗證連結
# 5. 確認跳轉到: http://localhost:3001/auth/callback
```

### 2. 測試密碼重設流程

```bash
# 1. 前往密碼重設頁面
http://localhost:3001/zh/reset-password

# 2. 輸入 Email 並提交
Email: test@example.com

# 3. 檢查收到的重設郵件
# 4. 點擊重設連結
# 5. 確認跳轉到: http://localhost:3001/auth/callback?next=/zh/update-password
```

### 3. 檢查郵件內容

驗證郵件中的連結應該類似:

**正確** ✅:
```
http://localhost:3001/auth/callback?token=...&type=signup
```

**錯誤** ❌:
```
https://tarot.zhenhe-dm.com/auth/callback?token=...&type=signup
```

---

## 📝 技術說明

### 為什麼會有這個問題？

Supabase 專案的 Site URL 設定會影響:
1. 📧 **Email 模板中的連結** - 所有發送的郵件都會使用 Site URL 作為基礎網址
2. 🔄 **OAuth 重定向** - Google 登入等 OAuth 流程的回調網址
3. 🔐 **Magic Link** - 無密碼登入的連結

### Site URL vs Redirect URLs

- **Site URL**: 專案的主要網址，用於生成郵件連結
- **Redirect URLs**: 允許的重定向網址白名單，用於驗證回調的安全性

### 開發 vs 正式環境

**開發環境**:
- Site URL: `http://localhost:3001`
- 用於本地測試

**正式環境**:
- Site URL: `https://your-production-domain.com`
- 部署到正式環境時需要更新

**最佳實務**:
- 使用環境變數來區分不同環境
- 在 Redirect URLs 中同時加入開發和正式環境的網址

---

## 🚨 常見問題

### Q1: 修改後多久生效？
**A**: 通常是即時生效，但建議等待 1-2 分鐘後再測試。

### Q2: 可以同時設定多個環境嗎？
**A**: 可以！在 Redirect URLs 中同時加入開發和正式環境的網址即可。

### Q3: 修改 Site URL 會影響現有用戶嗎？
**A**: 不會。現有用戶的登入不受影響，只有新發送的郵件會使用新的 Site URL。

### Q4: 為什麼之前是 tarot.zhenhe-dm.com？
**A**: 這可能是之前其他專案的設定，或者是 Supabase 專案被重複使用。

### Q5: 我沒有 Dashboard 存取權限怎麼辦？
**A**: 請聯繫專案擁有者或管理員協助修改，或使用 Management API Token。

---

## 📚 相關文檔

- [Supabase URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Management API](https://supabase.com/docs/reference/api/introduction)

---

## ✅ 檢查清單

修改完成後，請確認:

- [ ] Site URL 已改為 `http://localhost:3001`
- [ ] 至少加入了基本的 Redirect URL: `http://localhost:3001/auth/callback`
- [ ] 已儲存設定
- [ ] 測試註冊流程，驗證郵件連結正確
- [ ] 測試密碼重設流程，重設郵件連結正確
- [ ] 記錄正式環境的網址，準備部署時更新

---

**建立日期**: 2025-10-26
**最後更新**: 2025-10-26
**維護者**: Claude Code
