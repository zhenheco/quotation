# Cloudflare Workers 部署指南

## 🌐 網址資訊

**正式環境：** https://quotation-system.acejou27.workers.dev

- 帳號：Acejou27@gmail.com's Account
- Account ID: `f9916b95d011e8ad2a3fe10883053b0f`
- Worker 名稱：`quotation-system`

---

## 🚀 部署方式

### 方案 A：手動部署

每次要更新時執行：

```bash
# 1. 建置專案
pnpm run build

# 2. 部署到 Cloudflare
pnpm run deploy:cf
```

**優點：** 完全控制何時部署
**缺點：** 需要手動執行，容易忘記

---

### 方案 B：自動部署（推薦）⭐

**設定步驟：**

#### 1. 取得 Cloudflare API Token

前往 Cloudflare Dashboard：
1. 登入 https://dash.cloudflare.com/
2. 點擊右上角頭像 → **My Profile**
3. 左側選單 → **API Tokens**
4. 點擊 **Create Token**
5. 使用範本：**Edit Cloudflare Workers**
6. 權限設定：
   - Account：`Acejou27@gmail.com's Account`
   - Zone Resources：`All zones`
   - Permissions：
     - Account - Workers Scripts: Edit
     - Account - Workers KV Storage: Edit
7. 點擊 **Continue to summary** → **Create Token**
8. **複製並儲存** 這個 Token（只會顯示一次！）

#### 2. 在 GitHub 設定 Secret

1. 前往你的 GitHub repository
2. Settings → Secrets and variables → Actions
3. 點擊 **New repository secret**
4. 新增以下 Secret：
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: 貼上剛才複製的 API Token
5. 點擊 **Add secret**

#### 3. 推送程式碼

完成以上設定後，**每次 push 到 main 分支都會自動部署**：

```bash
git add .
git commit -m "更新功能"
git push origin main
```

GitHub Actions 會自動：
1. ✅ 安裝依賴
2. ✅ 執行建置
3. ✅ 部署到 Cloudflare Workers
4. ✅ 約 2-3 分鐘完成

#### 4. 查看部署狀態

- GitHub repository → Actions 標籤
- 查看最新的 workflow run
- 綠色勾勾 = 部署成功 ✅
- 紅色叉叉 = 部署失敗 ❌（可點進去看錯誤訊息）

---

## 📊 查看部署歷史

```bash
# 列出所有部署記錄
pnpm exec wrangler deployments list --name quotation-system

# 查看特定部署的詳細資訊
pnpm exec wrangler deployments view <deployment-id>
```

---

## 🔄 回滾到先前版本

如果新版本有問題，可以快速回滾：

```bash
# 1. 查看部署歷史，找到要回滾的 version-id
pnpm exec wrangler deployments list --name quotation-system

# 2. 回滾到指定版本
pnpm exec wrangler rollback --version-id <version-id> --name quotation-system
```

---

## 🔐 環境變數管理

Cloudflare Workers 使用 **Secrets** 儲存敏感資料：

### 設定 Secret

```bash
# 單個設定
pnpm exec wrangler secret put DATABASE_URL --name quotation-system

# 批次設定（使用腳本）
for secret in \
  "DATABASE_URL:your_database_url" \
  "SUPABASE_SERVICE_ROLE_KEY:your_key"; do
  key="${secret%%:*}"
  value="${secret#*:}"
  echo "設定 $key..."
  pnpm exec wrangler secret put "$key" --name quotation-system <<< "$value"
done
```

### 查看已設定的 Secrets

```bash
pnpm exec wrangler secret list --name quotation-system
```

### 刪除 Secret

```bash
pnpm exec wrangler secret delete SECRET_NAME --name quotation-system
```

---

## 🐛 除錯技巧

### 1. 查看即時日誌

```bash
pnpm exec wrangler tail quotation-system --format pretty
```

在另一個終端測試：
```bash
curl https://quotation-system.acejou27.workers.dev/
```

### 2. 本地預覽

```bash
pnpm run preview:cf
```

訪問：http://localhost:8787

### 3. 檢查建置輸出

確認 `.open-next/` 目錄結構正確：

```bash
ls -la .open-next/
# 應該包含:
# - worker.js
# - assets/
# - middleware-manifest.json
# - etc.
```

---

## ⚠️ 常見問題

### Q: 部署後出現 500 錯誤？

**可能原因：**
1. 環境變數未設定（使用 `wrangler secret` 設定）
2. TypeScript 類型錯誤（執行 `pnpm run build` 檢查）
3. 資料庫連線問題（檢查 `DATABASE_URL` 是否正確）

**解決方法：**
```bash
# 查看錯誤日誌
pnpm exec wrangler tail quotation-system

# 檢查環境變數
pnpm exec wrangler secret list --name quotation-system
```

### Q: GitHub Actions 部署失敗？

**檢查清單：**
- [ ] `CLOUDFLARE_API_TOKEN` Secret 是否已設定
- [ ] API Token 權限是否正確（需要 Workers Scripts: Edit）
- [ ] Account ID 是否正確（`f9916b95d011e8ad2a3fe10883053b0f`）
- [ ] 本地建置是否成功（`pnpm run build`）

### Q: 如何切換回 Vercel？

如果想暫時切換回 Vercel：

1. 保留 Cloudflare Workers（不刪除）
2. 在 Vercel 重新部署
3. 使用不同的網域區分：
   - Cloudflare: `quotation-system.acejou27.workers.dev`
   - Vercel: `your-project.vercel.app`

---

## 📈 效能監控

### Cloudflare Dashboard

1. 登入 https://dash.cloudflare.com/
2. Workers & Pages → quotation-system
3. 查看：
   - 請求數量（Requests）
   - CPU 使用時間（CPU Time）
   - 錯誤率（Errors）
   - 成功率（Success Rate）

### 免費版限制

- ✅ 100,000 requests/day
- ✅ 10ms CPU time/request
- ✅ 128MB memory
- ✅ 1MB script size

目前狀態：移除 PDF API 後，完全符合免費版限制 ✅

---

## 🎯 下一步

1. ✅ 完成自動部署設定（GitHub Actions）
2. ⏳ 測試自動部署流程
3. ⏳ 監控效能和錯誤率
4. ⏳ 考慮設定自訂網域（optional）

---

## 📞 支援

- Cloudflare 文檔：https://developers.cloudflare.com/workers/
- OpenNext 文檔：https://opennext.js.org/cloudflare
- GitHub Issues：報告問題或尋求協助
