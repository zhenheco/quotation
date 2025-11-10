# 安全清理報告

## 洩漏的敏感資料

### 1. Zeabur API Token
**Token**: `***REMOVED***`
**洩漏位置**:
- `.mcp.json` (已追蹤到 Git)
- `.claude/settings.local.json`
- Git commit: `f1be98e4975e78f825e3843c28387c751839696d`

**狀態**: ⚠️ 需要立即撤銷

**行動項目**:
1. [ ] 登入 Zeabur Dashboard
2. [ ] 前往 Settings → API Tokens
3. [ ] 撤銷 token `***REMOVED***`
4. [ ] 確認不再需要 Zeabur 服務（因為正在遷移到 Cloudflare）

### 2. Zeabur PostgreSQL 密碼
**密碼**: `kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W`
**洩漏位置**:
- `.claude/settings.local.json`

**狀態**: ⚠️ 需要評估是否變更

**行動項目**:
1. [ ] 確認是否還在使用 Zeabur PostgreSQL
2. [ ] 如果仍在使用，變更密碼
3. [ ] 如果已遷移，可以保持原樣（將在 30 天後刪除 Zeabur 資料庫）

### 3. Supabase Anon Key
**Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
**洩漏位置**:
- `.mcp.json` (已追蹤到 Git)

**狀態**: ✅ 公開 Anon Key 是安全的（設計為公開使用）

**行動項目**:
- 無需撤銷（Anon Key 設計為客戶端使用，有 RLS 保護）

## 已完成的清理步驟

1. ✅ 從 `.mcp.json` 移除 Zeabur 配置
2. ✅ 從 `.claude/settings.local.json` 移除敏感權限
3. ✅ 將 `.mcp.json` 和 `.claude/settings.local.json` 加入 `.gitignore`
4. ✅ 建立 `.mcp.json.template` 和 `.env.local.template` 作為範例

## 待完成的清理步驟

### Git 歷史清理
由於 `.mcp.json` 已被追蹤到 Git，敏感資料存在於 Git 歷史中。

**選項 1: 使用 BFG Repo-Cleaner（推薦）**
```bash
# 安裝 BFG
brew install bfg

# 清理敏感資料
bfg --replace-text <(echo '***REMOVED***==>***REMOVED***') --no-blob-protection

# 清理 refs
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 強制推送（需要團隊確認）
git push --force --all
```

**選項 2: 使用 git filter-repo**
```bash
# 安裝 git-filter-repo
brew install git-filter-repo

# 清理特定字串
echo '***REMOVED***==>***REMOVED***' > /tmp/replacements.txt
git filter-repo --replace-text /tmp/replacements.txt

# 強制推送
git push --force --all
```

**選項 3: 接受現狀（如果 token 已撤銷）**
- 如果 Zeabur token 已撤銷，且不再使用 Zeabur
- 可以接受敏感資料存在於歷史中（已失效）
- 未來確保不再 commit 敏感資料

## 建議

1. **立即**: 撤銷 Zeabur API Token
2. **短期**: 完成 Cloudflare 遷移後，刪除 Zeabur 帳戶
3. **長期**: 實施 pre-commit hooks 檢查敏感資料

## Pre-commit Hook 範例

建立 `.git/hooks/pre-commit`:
```bash
#!/bin/bash

# 檢查是否包含敏感資料
if git diff --cached | grep -E "sk-[a-z0-9]{30,}|postgres://.*:[^@]*@|PGPASSWORD="; then
  echo "❌ Error: Sensitive data detected in commit!"
  echo "Please remove sensitive data before committing."
  exit 1
fi

exit 0
```

```bash
chmod +x .git/hooks/pre-commit
```

## 總結

- **高風險**: Zeabur API Token 需要立即撤銷
- **中風險**: Zeabur PostgreSQL 密碼（如仍在使用需變更）
- **低風險**: Supabase Anon Key（設計為公開）

**下一步**: 執行 Zeabur token 撤銷後，繼續進行資料庫遷移。
