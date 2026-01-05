# 教學截圖採集指南

本文件說明如何採集和更新教學截圖。

---

## 📋 前置準備

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 準備測試資料

```bash
# 執行資料庫 seed
pnpm seed

# 或使用 admin 測試資料
pnpm seed:admin
```

### 3. 設定環境變數

在 `.env` 或 `.env.local` 中設定測試帳號：

```env
# 截圖測試用帳號
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Test1234!

# 或使用 production 環境
BASE_URL=https://quote24.cc
```

---

## 🚀 執行方式

### 方式 1：自動化截圖（推薦）

使用 Playwright 自動採集：

```bash
# 採集所有截圖
pnpm playwright test tests/screenshots/screenshot-capture.spec.ts

# 或使用自訂腳本（如果已設定）
pnpm screenshot:capture
```

### 方式 2：手動截圖

1. 啟動開發伺服器：
   ```bash
   pnpm dev
   ```

2. 登入測試帳號並準備資料

3. 依照 `SCREENSHOT_CHECKLIST.md` 逐一截圖

4. 將截圖存放到 `docs/screenshots-tutorial/screenshots/`

---

## 📁 檔案結構

```
docs/screenshots-tutorial/
├── screenshots/              # 截圖存放目錄
│   ├── 01-registration.png
│   ├── 02-login.png
│   └── ...
├── USER_GUIDE.md            # 使用者教學文件
├── SCREENSHOT_CHECKLIST.md  # 截圖清單
└── README.md               # 本文件
```

---

## 🔧 故障排除

### 問題：測試帳號不存在

**解決方案**：
```bash
# 重新建立測試資料
pnpm seed
```

### 問題：截圖背景是透明的

**解決方案**：在測試腳本中設定背景色：
```typescript
await page.goto(url);
await page.evaluate(() => {
  document.body.style.backgroundColor = 'white';
});
```

### 問題：截圖包含滾動條

**解決方案**：在截圖前隱藏滾動條：
```typescript
await page.evaluate(() => {
  document.body.style.overflow = 'hidden';
});
```

---

## 📝 更新流程

### 當 UI 更新時

1. 確認需要更新的截圖範圍
2. 執行截圖腳本或手動截圖
3. 更新 `SCREENSHOT_CHECKLIST.md` 的狀態
4. 更新 `USER_GUIDE.md` 如果有功能變更

### 版本控制

截圖檔案應該加入 Git：

```bash
# 加入截圖
git add docs/screenshots-tutorial/screenshots/

# 提交變更
git commit -m "docs: 更新教學截圖"
```

---

## 🎨 截圖規格

| 項目 | 規格 |
|------|------|
| 解析度 | 1920 x 1080 (Full HD) |
| 格式 | PNG |
| 命名 | 序號-頁面名稱.png |
| 背景 | 白色 |
| 語言 | 繁體中文 |

---

## 📊 採集記錄

| 日期 | 採集者 | 完成數量 | 備註 |
|------|--------|----------|------|
| 2025-01-05 | Claude | 0/30 | 初始建立 |

---

*最後更新：2025-01-05*
