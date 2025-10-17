# 🔐 環境變數安全指南

## ⚠️ 重要警告

**絕對不要將包含真實敏感資訊的 `.env.local` 檔案上傳到 GitHub！**

這包括：
- 🔑 API 金鑰（Supabase、Gmail、Resend、ExchangeRate 等）
- 🔒 資料庫連線字串（包含密碼）
- 📧 Email 應用程式密碼
- 🔐 任何 Secret Keys 或 Tokens

## 🛡️ 風險說明

如果您不小心將 `.env.local` 上傳到 GitHub：

1. **立即暴露風險**
   - 任何人都可以看到您的密碼和 API 金鑰
   - 駭客會掃描 GitHub 尋找洩露的密鑰（幾分鐘內）
   - 您的資料庫可能被入侵或刪除
   - API 配額可能被濫用（產生高額費用）

2. **長期風險**
   - 即使刪除檔案，Git 歷史仍保留記錄
   - Fork 的 repo 也會包含這些資訊
   - 搜尋引擎可能已經快取內容

## ✅ 安全最佳實踐

### 1. 使用 .gitignore（已設定）

您的專案已正確設定：
```gitignore
# env files
.env*
```
這會忽略所有 `.env` 開頭的檔案。

### 2. 使用 .env.local.example

```bash
# 正確做法：
# 1. 創建範例檔案（不含真實資料）
cp .env.local .env.local.example

# 2. 編輯範例檔案，替換所有真實值為佔位符
# GMAIL_USER=john@gmail.com → GMAIL_USER=your-email@gmail.com
# GMAIL_APP_PASSWORD=abcd1234efgh5678 → GMAIL_APP_PASSWORD=your-app-password

# 3. 只提交範例檔案
git add .env.local.example
git commit -m "Add environment variables example"
```

### 3. 驗證檔案是否被忽略

```bash
# 檢查 .env.local 是否被忽略
git check-ignore .env.local

# 查看所有被忽略的檔案
git status --ignored

# 確保沒有追蹤 .env.local
git ls-files | grep -E "\.env"
```

### 4. 使用環境管理工具

#### 開發環境
- 本地保存 `.env.local`
- 使用密碼管理器儲存敏感資訊
- 定期備份到加密儲存

#### 生產環境（Vercel）
```bash
# 使用 Vercel CLI 設定環境變數
vercel env add GMAIL_USER
vercel env add GMAIL_APP_PASSWORD
vercel env add ZEABUR_POSTGRES_URL
```

#### 生產環境（其他平台）
- **Heroku**: 使用 Config Vars
- **AWS**: 使用 Secrets Manager
- **Azure**: 使用 Key Vault
- **Railway/Render**: 使用環境變數面板

## 🚨 緊急應變措施

### 如果不小心上傳了 .env.local：

#### 步驟 1：立即撤銷所有密鑰
```bash
# 1. 更換所有密碼和金鑰
# - Gmail: 產生新的應用程式密碼
# - Supabase: 重新產生 API 金鑰
# - 資料庫: 更改密碼
# - API Keys: 申請新的金鑰
```

#### 步驟 2：從 Git 歷史移除
```bash
# 安裝 BFG Repo-Cleaner
brew install bfg  # macOS
# 或下載: https://rtyley.github.io/bfg-repo-cleaner/

# 清理歷史
bfg --delete-files .env.local
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 強制推送（會改寫歷史）
git push --force --all
git push --force --tags
```

#### 步驟 3：檢查洩漏
- 檢查 GitHub 的 Security 標籤
- 查看是否有異常的 API 使用
- 檢查資料庫是否有未授權存取

## 🔒 額外安全措施

### 1. 使用 git-secrets
```bash
# 安裝
brew install git-secrets  # macOS
# 或
git clone https://github.com/awslabs/git-secrets
cd git-secrets && make install

# 設定
git secrets --install
git secrets --register-aws  # AWS 金鑰
git secrets --add 'GMAIL_APP_PASSWORD=.*'  # 自定義規則
```

### 2. Pre-commit Hook
創建 `.git/hooks/pre-commit`：
```bash
#!/bin/sh
# 檢查是否有 .env 檔案被提交
if git diff --cached --name-only | grep -E "\.env"; then
    echo "❌ 錯誤：嘗試提交 .env 檔案！"
    echo "請使用 git reset HEAD <file> 來取消暫存"
    exit 1
fi
```

### 3. GitHub Secret Scanning
- GitHub 自動掃描公開 repo 的密鑰
- 啟用 Secret scanning alerts（Settings → Security）

## 📋 安全檢查清單

- [ ] `.env.local` 已加入 `.gitignore`
- [ ] 只提交 `.env.local.example`（含佔位符）
- [ ] 定期更換密碼和金鑰
- [ ] 使用強密碼（16+ 字元）
- [ ] 啟用 2FA（兩步驟驗證）
- [ ] 生產環境使用環境變數服務
- [ ] 定期檢查 git 歷史
- [ ] 設定 pre-commit hooks

## 🏷️ 範例：正確的 .env.local.example

```env
# ✅ 正確（只有佔位符）
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
ZEABUR_POSTGRES_URL=postgresql://user:password@host:port/database

# ❌ 錯誤（包含真實資料）
GMAIL_USER=john.doe@gmail.com
GMAIL_APP_PASSWORD=abcd1234efgh5678
ZEABUR_POSTGRES_URL=postgresql://root:MyR3alP@ssw0rd@43.159.54.250:30428/zeabur
```

## 📚 相關資源

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [12 Factor App - Config](https://12factor.net/config)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**記住：安全第一！寧可多花時間設定，也不要冒險洩露敏感資訊。**