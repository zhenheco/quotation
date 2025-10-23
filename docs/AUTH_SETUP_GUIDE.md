# 🔐 Supabase 認證系統設定指南

## 📊 測試結果分析

### 問題：Email 格式被拒絕

**錯誤訊息**：`Email address "test-xxxxx@example.com" is invalid`

**原因分析**：
1. Supabase 預設的 Email provider 可能要求真實的 email domain
2. 開發環境可能啟用了 Email 驗證限制
3. 可能有 Email 白名單或黑名單設定

---

## ✅ 解決方案

### 選項 1: 使用測試 Email 服務（推薦用於開發）

使用以下任一測試 Email 服務：

1. **Mailinator**（免費，無需註冊）
   - 格式：`your-test@mailinator.com`
   - 收信：https://www.mailinator.com/
   - 優點：完全免費，即時可用

2. **Temp Mail**（免費，無需註冊）
   - 網址：https://temp-mail.org/
   - 優點：自動產生臨時 Email

3. **Gmail + 號技巧**（如果你有 Gmail）
   - 格式：`youremail+test1@gmail.com`
   - 所有郵件都會送到 `youremail@gmail.com`
   - 優點：可以無限建立測試帳號

### 選項 2: 關閉 Email 確認（僅開發環境）

在 Supabase Dashboard 中：

1. 前往 **Authentication > Settings**
2. 找到 **Email Auth** 區塊
3. 關閉 **"Enable email confirmations"**
4. 儲存變更

⚠️ **注意**：生產環境應該保持 Email 確認開啟！

### 選項 3: 設定自訂 SMTP（進階）

如果需要完整的 Email 功能：

1. 前往 **Project Settings > Auth**
2. 設定 SMTP 伺服器
3. 使用自己的 Email 服務（如 SendGrid, AWS SES, Mailgun）

---

## 🔍 目前認證系統狀態

### ✅ 正常運作的功能

1. **Supabase 連接** - 客戶端建立成功
2. **Session 管理** - Session 機制運作正常
3. **登出功能** - 登出和 Session 清除正常

### ⚠️ 需要設定的功能

1. **使用者註冊** - 需要調整 Email 設定
2. **使用者登入** - 依賴註冊功能

---

## 📝 建議的開發流程

### 短期測試方案（立即可用）

1. **使用 Mailinator 進行測試**：
   ```typescript
   const testUser = {
     email: 'quotation-test@mailinator.com',
     password: 'TestPassword123!',
     name: '測試使用者'
   }
   ```

2. **手動在 Dashboard 建立測試使用者**：
   - 前往 **Authentication > Users**
   - 點擊 **"Add user"**
   - 輸入 Email 和密碼
   - 勾選 **"Auto Confirm User"**

### 長期方案

1. 為開發環境設定專用的 SMTP 服務
2. 使用真實的 Email domain
3. 設定適當的 Email templates

---

## 🧪 重新測試步驟

完成上述任一設定後，重新執行測試：

```bash
npx tsx scripts/test-auth-flow.ts
```

或者手動測試：

1. 在應用程式中開啟註冊頁面
2. 使用測試 Email 註冊
3. 檢查 Mailinator 收信
4. 完成註冊流程

---

## 💡 開發提示

### 快速測試認證的方法

```typescript
// 1. 在 Supabase Dashboard 手動建立使用者
// 2. 使用此腳本直接測試登入

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'your-email@example.com',
  password: 'your-password'
})

if (error) console.error('登入失敗:', error)
else console.log('登入成功:', data.user)
```

---

## 🔗 相關資源

- [Supabase Auth 文檔](https://supabase.com/docs/guides/auth)
- [Email Templates 設定](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP 設定指南](https://supabase.com/docs/guides/auth/auth-smtp)

---

## ✨ 下一步

一旦認證系統設定完成，我們可以繼續：

1. ✅ 測試使用者註冊和登入
2. ✅ 建立 user_profiles 資料
3. ✅ 測試 RBAC 權限系統
4. ✅ 整合前端認證流程
