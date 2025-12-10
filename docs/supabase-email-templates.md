# Supabase Email Templates

請到 Supabase Dashboard → Authentication → Email Templates 設定以下模板。

## 設定位置

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 左側選單點擊 **Authentication**
4. 點擊 **Email Templates** 標籤

---

## 1. Confirm Signup (Email 驗證確認信)

### Subject
```
歡迎加入報價單系統 - 請確認您的電子郵件
```

### Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>確認您的電子郵件</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Logo -->
        <div style="background-color: #4f46e5; width: 64px; height: 64px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
          <span style="color: white; font-size: 24px; font-weight: bold;">Q</span>
        </div>

        <!-- Card -->
        <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h1 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 700;">
            歡迎加入報價單系統！
          </h1>
          <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
            感謝您註冊報價單系統。請點擊下方按鈕確認您的電子郵件地址，以啟用您的帳號。
          </p>

          <!-- Button -->
          <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            確認電子郵件
          </a>

          <p style="margin: 24px 0 0; color: #9ca3af; font-size: 14px;">
            如果按鈕無法點擊，請複製以下連結到瀏覽器：
          </p>
          <p style="margin: 8px 0 0; color: #4f46e5; font-size: 14px; word-break: break-all;">
            {{ .ConfirmationURL }}
          </p>
        </div>

        <!-- Footer -->
        <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px;">
          此郵件由報價單系統自動發送，請勿回覆。
        </p>
        <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
          © 2024 Quote24. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Reset Password (密碼重設信)

### Subject
```
報價單系統 - 重設您的密碼
```

### Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>重設您的密碼</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Logo -->
        <div style="background-color: #4f46e5; width: 64px; height: 64px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
          <span style="color: white; font-size: 24px; font-weight: bold;">Q</span>
        </div>

        <!-- Card -->
        <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h1 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 700;">
            重設您的密碼
          </h1>
          <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
            我們收到了重設您報價單系統帳號密碼的請求。請點擊下方按鈕設定新密碼。
          </p>

          <!-- Button -->
          <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            重設密碼
          </a>

          <p style="margin: 24px 0 0; color: #9ca3af; font-size: 14px;">
            如果按鈕無法點擊，請複製以下連結到瀏覽器：
          </p>
          <p style="margin: 8px 0 0; color: #4f46e5; font-size: 14px; word-break: break-all;">
            {{ .ConfirmationURL }}
          </p>

          <!-- Warning -->
          <div style="margin: 24px 0 0; padding: 16px; background-color: #fef3c7; border-radius: 8px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              ⚠️ 如果您沒有申請重設密碼，請忽略此郵件。您的密碼不會被更改。
            </p>
          </div>

          <p style="margin: 24px 0 0; color: #9ca3af; font-size: 14px;">
            此連結將在 24 小時後失效。
          </p>
        </div>

        <!-- Footer -->
        <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px;">
          此郵件由報價單系統自動發送，請勿回覆。
        </p>
        <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
          © 2024 Quote24. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 設定說明

### 可用變數
- `{{ .ConfirmationURL }}` - 確認連結
- `{{ .Email }}` - 使用者電子郵件
- `{{ .Token }}` - 驗證 token（較少使用）

### Redirect URLs 設定
確保在 **Authentication → URL Configuration** 中設定：
- **Site URL**: `https://quote24.cc`
- **Redirect URLs**: 加入 `https://quote24.cc/**`

### 注意事項
1. 測試時可以用自己的郵箱註冊測試
2. 確認郵件是否有進入垃圾郵件資料夾
3. 如果郵件未送達，檢查 Supabase Dashboard 的 Logs
