# Gmail Email 發送設置指南

本指南協助您設定 Gmail 來發送報價單 Email。

## 📧 為什麼使用 Gmail？

- **免費**：每日可發送 500 封郵件（一般帳戶）
- **簡單**：不需要額外註冊服務
- **穩定**：Google 的基礎設施保證高可用性
- **測試友善**：適合開發和測試環境

## 🔧 設置步驟

### 步驟 1：啟用兩步驟驗證

1. 前往 [Google 帳戶設定](https://myaccount.google.com/)
2. 點擊左側選單的「安全性」
3. 在「登入 Google」區塊中，點擊「兩步驟驗證」
4. 點擊「開始使用」
5. 按照指示完成設定（通常需要手機號碼驗證）

### 步驟 2：產生應用程式密碼

1. 在兩步驟驗證啟用後，前往 [應用程式密碼頁面](https://myaccount.google.com/apppasswords)
2. 在「選擇應用程式」下拉選單中，選擇「郵件」
3. 在「選擇裝置」下拉選單中，選擇「其他（自訂名稱）」
4. 輸入名稱：`Quotation System`
5. 點擊「產生」
6. **重要**：複製顯示的 16 位密碼（格式：xxxx xxxx xxxx xxxx）
   - 移除所有空格
   - 這個密碼只會顯示一次！

### 步驟 3：設定環境變數

編輯 `.env.local` 檔案：

```env
# Gmail 設定
GMAIL_USER=your-email@gmail.com              # 您的 Gmail 地址
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx          # 16 位應用程式密碼（不含空格）

# 公司名稱（顯示在郵件中）
COMPANY_NAME="您的公司名稱"
```

**範例：**
```env
GMAIL_USER=john.doe@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
COMPANY_NAME="ABC Trading Company"
```

### 步驟 4：測試連線

使用 curl 測試 Email 連線：

```bash
# 測試連線狀態
curl http://localhost:3000/api/test-email

# 發送測試郵件
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "recipient@example.com", "locale": "zh"}'
```

或使用瀏覽器開發者工具：

```javascript
// 在瀏覽器 Console 中執行
// 測試連線
fetch('/api/test-email')
  .then(res => res.json())
  .then(console.log)

// 發送測試郵件
fetch('/api/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'your-test-email@example.com',
    locale: 'zh'
  })
})
  .then(res => res.json())
  .then(console.log)
```

## 🚨 常見問題

### 1. "Invalid login" 錯誤

**原因**：應用程式密碼錯誤或包含空格

**解決方案**：
- 確認密碼是 16 個字元（不含空格）
- 重新產生應用程式密碼
- 確認兩步驟驗證已啟用

### 2. "Less secure app access" 錯誤

**原因**：使用一般密碼而非應用程式密碼

**解決方案**：
- 必須使用應用程式密碼，不是您的 Gmail 登入密碼
- 確認已啟用兩步驟驗證

### 3. 郵件進入垃圾郵件

**解決方案**：
- 確保發件人名稱正確（設定 `COMPANY_NAME`）
- 在測試收件者信箱中將發件地址加入聯絡人
- 避免測試內容包含過多連結或附件

### 4. 發送限制

**Gmail 限制**：
- 每日最多 500 封（一般帳戶）
- 每日最多 2000 封（Google Workspace）
- 每封郵件最多 500 個收件者

## 🔄 切換到其他郵件服務

系統同時支援多種郵件服務：

### 使用 Brevo (Sendinblue)

如果您偏好使用 Brevo，可以修改 `service-gmail.ts` 加入 Brevo 支援：

```env
# Brevo 設定
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
```

### 使用 Resend

```env
# Resend 設定
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com
```

## 📝 測試檢查清單

- [ ] 兩步驟驗證已啟用
- [ ] 應用程式密碼已產生
- [ ] 環境變數已設定
- [ ] 測試連線成功
- [ ] 測試郵件發送成功
- [ ] 收件箱收到測試郵件（非垃圾郵件）

## 🛠️ 開發建議

1. **開發環境**：使用 Gmail + 測試收件箱
2. **生產環境**：考慮使用專業郵件服務（Brevo、SendGrid、Resend）
3. **監控**：記錄所有郵件發送狀態
4. **備份**：實作多個郵件服務作為備援

## 📚 相關連結

- [Google 應用程式密碼說明](https://support.google.com/accounts/answer/185833)
- [Gmail SMTP 設定](https://support.google.com/mail/answer/7126229)
- [Nodemailer 文檔](https://nodemailer.com/usage/)

---

**注意事項**：
- 應用程式密碼不同於您的 Google 密碼
- 請妥善保管應用程式密碼，避免外洩
- 定期更換應用程式密碼以維護安全性