# 報價單系統設置指南 | Setup Guide

本指南將帶您完成系統的完整設置流程。

---

## 📋 前置需求

在開始之前，請確認您已安裝：

- ✅ **Node.js** 18+ ([下載](https://nodejs.org/))
- ✅ **npm** 或 **yarn** (隨 Node.js 一起安裝)
- ✅ **Git** ([下載](https://git-scm.com/))
- ✅ **瀏覽器** (Chrome、Firefox、Safari 或 Edge)

---

## 🚀 快速開始

### 步驟 1: 取得專案代碼

```bash
# 如果您已經在專案目錄中，跳過此步驟
cd quotation-system
```

### 步驟 2: 安裝依賴

```bash
npm install
```

### 步驟 3: 建立環境變數檔案

```bash
# 複製範例檔案
cp .env.local.example .env.local
```

### 步驟 4: 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器訪問 [http://localhost:3000](http://localhost:3000)

**恭喜！** 🎉 系統已啟動。但要使用完整功能，請繼續以下設置。

---

## 🔧 完整設置流程

### 一、Supabase 設置

#### 1.1 建立 Supabase 帳號

1. 訪問 [supabase.com](https://supabase.com)
2. 點擊 **"Start your project"**
3. 使用 GitHub/Google 登入

#### 1.2 建立新專案

1. 點擊 **"New Project"**
2. 填寫專案資訊：
   - **Name**: `quotation-system` (或您喜歡的名稱)
   - **Database Password**: 設定一個強密碼（**請記住此密碼**）
   - **Region**: 選擇最接近您的區域（建議：Singapore 或 Tokyo）
3. 點擊 **"Create new project"**
4. 等待 1-2 分鐘讓專案初始化

#### 1.3 取得 API 金鑰

1. 專案建立完成後，前往 **Settings** → **API**
2. 複製以下資訊：
   - **Project URL** (例如：`https://xxxxx.supabase.co`)
   - **anon public** key (以 `eyJ` 開頭的長字串)

3. 打開 `.env.local` 檔案，填入這些資訊：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 1.4 執行資料庫 Schema

1. 在 Supabase Dashboard，前往 **SQL Editor**
2. 點擊 **"New query"**
3. 開啟專案中的 `supabase-schema.sql` 檔案
4. 複製**全部內容**並貼到 SQL Editor
5. 點擊 **"Run"** (或按 Ctrl/Cmd + Enter)
6. 確認看到 "Success" 訊息

**資料庫設置完成！** ✅

---

### 二、Google OAuth 設置

#### 2.1 建立 Google Cloud 專案

1. 訪問 [Google Cloud Console](https://console.cloud.google.com)
2. 點擊頂部的專案選擇器 → **"NEW PROJECT"**
3. 填寫專案名稱：`Quotation System`
4. 點擊 **"CREATE"**

#### 2.2 啟用 Google+ API

1. 在左側選單選擇 **"APIs & Services"** → **"Library"**
2. 搜尋 "Google+ API"
3. 點擊 **"Enable"**

#### 2.3 建立 OAuth 憑證

1. 前往 **"APIs & Services"** → **"Credentials"**
2. 點擊 **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. 如果提示設置同意畫面：
   - 點擊 **"CONFIGURE CONSENT SCREEN"**
   - 選擇 **"External"** → **"CREATE"**
   - 填寫基本資訊：
     - **App name**: Quotation System
     - **User support email**: 您的 email
     - **Developer contact**: 您的 email
   - 點擊 **"SAVE AND CONTINUE"**
   - Scopes 頁面直接點 **"SAVE AND CONTINUE"**
   - Test users 頁面直接點 **"SAVE AND CONTINUE"**
   - 點擊 **"BACK TO DASHBOARD"**

4. 返回 **"Credentials"**，再次點擊 **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
5. 選擇 **"Web application"**
6. 填寫資訊：
   - **Name**: Quotation System Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `http://localhost:3001`
     - `http://localhost:3002`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback`
     - `https://your-project-id.supabase.co/auth/v1/callback`
7. 點擊 **"CREATE"**
8. 複製 **Client ID** 和 **Client Secret**

#### 2.4 在 Supabase 設定 Google OAuth

1. 返回 Supabase Dashboard
2. 前往 **Authentication** → **Providers**
3. 找到 **Google** 並點擊
4. 切換開關為 **"Enabled"**
5. 填入剛才複製的：
   - **Client ID**
   - **Client Secret**
6. 點擊 **"Save"**

**Google OAuth 設置完成！** ✅

---

### 三、測試系統

#### 3.1 測試登入功能

1. 確保開發伺服器正在運行：
   ```bash
   npm run dev
   ```

2. 訪問 [http://localhost:3000](http://localhost:3000)

3. 點擊 **"Sign in with Google"** 按鈕

4. 選擇您的 Google 帳號

5. 應該會重定向到 Dashboard 頁面

**登入成功！** 🎉

#### 3.2 測試客戶管理

1. 在 Sidebar 點擊 **"Customers"** / **"客戶"**

2. 點擊 **"Create Customer"** / **"建立客戶"**

3. 填寫表單：
   - **中文名稱**: 測試公司
   - **英文名稱**: Test Company
   - **Email**: test@example.com
   - **電話**: +886 912 345 678
   - **中文地址**: 台北市信義區信義路五段7號
   - **英文地址**: No. 7, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City

4. 點擊 **"Save"** / **"儲存"**

5. 應該看到客戶出現在列表中

**客戶管理正常！** ✅

#### 3.3 測試產品管理

1. 在 Sidebar 點擊 **"Products"** / **"產品"**

2. 點擊 **"Create Product"** / **"建立產品"**

3. 填寫表單：
   - **中文名稱**: 網站開發服務
   - **英文名稱**: Web Development Service
   - **中文描述**: 客製化網站開發與維護
   - **英文描述**: Custom website development and maintenance
   - **價格**: 50000
   - **幣別**: TWD (新台幣)
   - **類別**: 軟體

4. 點擊 **"Save"** / **"儲存"**

5. 應該看到產品出現在列表中

**產品管理正常！** ✅

#### 3.4 測試報價單管理

1. 在 Sidebar 點擊 **"Quotations"** / **"報價單"**

2. 點擊 **"Create Quotation"** / **"建立報價單"**

3. 填寫表單：
   - **客戶**: 選擇剛才建立的客戶
   - **發行日期**: 今天
   - **有效期限**: 30 天後
   - **幣別**: TWD
   - **稅率**: 5

4. 點擊 **"Add Item"** / **"新增項目"**

5. 選擇剛才建立的產品，應該會自動填入價格

6. 設定數量為 `1`

7. 查看總計是否正確計算

8. 點擊 **"Save"** / **"儲存"**

9. 應該看到報價單出現在列表中

10. 點擊報價單查看詳細資訊

**報價單管理正常！** ✅

#### 3.5 測試語言切換

1. 在 Navbar 點擊 **"中文"** 或 **"English"** 按鈕

2. 確認所有文字都正確切換

3. 切換回來確認功能正常

**語言切換正常！** ✅

---

### 四、Supabase CLI 設置（進階，可選）

如果您想使用命令列工具管理資料庫：

#### 4.1 登入 Supabase CLI

```bash
npm run supabase:login
```

這會開啟瀏覽器讓您授權。

#### 4.2 連結到專案

```bash
npm run supabase:link
```

系統會詢問：
- **Project ID**: 在 Supabase Dashboard → Settings → General 找到
- **Database password**: 您在建立專案時設定的密碼

#### 4.3 生成 TypeScript 類型（可選）

```bash
npm run supabase:gen:types
```

這會根據資料庫 schema 自動生成 TypeScript 類型定義。

**更多 CLI 命令請參考 [SUPABASE.md](SUPABASE.md)**

---

## 🎨 自訂設定（可選）

### 更改預設語言

編輯 `i18n/routing.ts`：

```typescript
export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'zh',  // 改為 'zh' 將預設語言改為中文
  localePrefix: 'always'
})
```

### 修改幣別選項

編輯 `messages/en.json` 和 `messages/zh.json` 的 `currency` 區塊。

### 更改稅率預設值

編輯報價單表單中的預設值（通常是 5%）。

---

## 🐛 常見問題排除

### 問題 1: 無法啟動開發伺服器

**錯誤**: `EADDRINUSE: address already in use`

**解決方案**:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 問題 2: Supabase 連線失敗

**錯誤**: `Failed to connect to Supabase`

**檢查清單**:
- ✅ `.env.local` 檔案存在且有正確的金鑰
- ✅ Supabase 專案狀態為 "Active"
- ✅ 金鑰沒有多餘的空格或換行
- ✅ 重新啟動開發伺服器

### 問題 3: Google OAuth 登入失敗

**錯誤**: Redirect URI mismatch

**解決方案**:
1. 檢查 Google Cloud Console 中的 Redirect URIs 是否正確
2. 確認 Supabase 的 Redirect URL 已添加到 Google OAuth 設定
3. 清除瀏覽器快取重試

### 問題 4: 資料庫操作失敗

**錯誤**: `Row Level Security policy violation`

**解決方案**:
1. 確認已執行完整的 `supabase-schema.sql`
2. 檢查是否已登入（RLS 需要認證）
3. 重新執行 SQL schema

### 問題 5: 翻譯未顯示

**錯誤**: 頁面顯示翻譯鍵值而不是實際文字

**解決方案**:
1. 檢查 `messages/en.json` 和 `messages/zh.json` 是否有對應的鍵值
2. 重新啟動開發伺服器
3. 清除瀏覽器快取

---

## 📚 下一步

設置完成後，建議您：

1. 📖 閱讀 [README.md](README.md) 了解專案架構
2. 🗺️ 查看 [ROADMAP.md](ROADMAP.md) 了解開發計畫
3. 🔧 參考 [SUPABASE.md](SUPABASE.md) 學習 CLI 使用
4. 🚀 開始建立您的第一個報價單！

---

## 🆘 需要幫助？

如果您遇到其他問題：

1. **檢查文檔**: 查看 README.md、SUPABASE.md 和本文件
2. **檢查日誌**: 查看瀏覽器 Console 和終端機的錯誤訊息
3. **Google 搜尋**: 搜尋錯誤訊息通常能找到解決方案
4. **Supabase 文檔**: [docs.supabase.com](https://docs.supabase.com)
5. **Next.js 文檔**: [nextjs.org/docs](https://nextjs.org/docs)

---

## ✅ 設置檢查清單

完成以下所有項目即表示設置成功：

- [ ] Node.js 18+ 已安裝
- [ ] 專案依賴已安裝 (`npm install`)
- [ ] Supabase 專案已建立
- [ ] 資料庫 schema 已執行
- [ ] `.env.local` 已正確設定
- [ ] Google OAuth 已設定
- [ ] 開發伺服器可正常啟動
- [ ] 可以成功登入
- [ ] 可以建立客戶
- [ ] 可以建立產品
- [ ] 可以建立報價單
- [ ] 語言切換正常運作

**全部完成！** 🎉 開始享受您的報價單系統吧！

---

**最後更新**: 2025-10-16
**版本**: 1.0
