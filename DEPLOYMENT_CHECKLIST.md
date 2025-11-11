# Cloudflare Workers 部署檢查清單

## 🚨 常見部署失敗原因

### 1. **pnpm-lock.yaml 過期** (最常見 - 90%)
**錯誤訊息**：
```
ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json
```

**原因**：
- 使用 `npm install` 而非 `pnpm install` 安裝套件
- 手動修改 `package.json` 後未執行 `pnpm install`
- 安裝套件後未提交 `pnpm-lock.yaml`

**解決方案**：
```bash
# 始終使用 pnpm 安裝套件
pnpm add <package-name>       # 生產依賴
pnpm add -D <package-name>    # 開發依賴

# 安裝後立即提交 lockfile
git add pnpm-lock.yaml
git commit -m "更新依賴：<描述>"
```

---

## ✅ 部署前強制檢查清單

### 步驟 1：依賴同步檢查
```bash
# 1. 檢查 lockfile 是否同步
pnpm install --frozen-lockfile

# 2. 如果失敗，執行 pnpm install 更新
pnpm install

# 3. 提交更新的 lockfile
git add pnpm-lock.yaml
```

### 步驟 2：程式碼品質檢查
```bash
# 1. Lint 檢查
pnpm run lint

# 2. TypeScript 類型檢查
pnpm run typecheck
# 或
npx tsc --noEmit

# 3. 測試（如有）
pnpm test:run
```

### 步驟 3：Build 測試
```bash
# 本地 build 測試
pnpm run build

# 檢查 build 輸出
# ✅ 應該顯示 "Compiled successfully"
# ⚠️  警告可接受，但不應有錯誤
```

### 步驟 4：提交和推送
```bash
# 1. 檢查 git status
git status

# 2. 確認 pnpm-lock.yaml 已包含在提交中
git add pnpm-lock.yaml

# 3. 提交
git commit -m "部署：<描述>"

# 4. 推送
git push origin main
```

---

## 🚫 絕對不要做的事

1. ❌ **不要使用 npm install**
   - 始終使用 `pnpm install`
   - 避免混用套件管理器

2. ❌ **不要跳過 lockfile 提交**
   - 每次安裝套件後必須提交 `pnpm-lock.yaml`
   - 即使是小的依賴更新

3. ❌ **不要在 build 失敗時強制推送**
   - 確保本地 build 成功
   - CI/CD 中的錯誤應該在本地先解決

---

## 📋 完整部署流程

### 新功能開發
1. 建立功能分支：`git checkout -b feature/<name>`
2. 開發和測試
3. 執行本地檢查（lint + typecheck + build）
4. 提交：`git commit -m "新增：<描述>"`
5. **確保 pnpm-lock.yaml 已包含在提交中**
6. 推送：`git push origin feature/<name>`
7. 建立 Pull Request
8. 合併到 main 後自動部署

---

## 📊 部署失敗診斷

### 查看 GitHub Actions 日誌
```bash
# 列出最近的執行
gh run list --limit 5

# 查看失敗的執行日誌
gh run view <run-id> --log
```

### 常見錯誤模式

| 錯誤訊息 | 原因 | 解決方案 |
|---------|------|---------|
| `ERR_PNPM_OUTDATED_LOCKFILE` | lockfile 過期 | `pnpm install` + 提交 lockfile |
| `Type error: ...` | TypeScript 錯誤 | 修正類型錯誤，執行 `tsc --noEmit` |
| `Module not found` | 缺少依賴 | `pnpm add <package>` |
| `Build failed` | Build 錯誤 | 本地執行 `pnpm run build` 查看詳細錯誤 |

---

**最後更新**：2025-11-11
**常見失敗原因統計**：
- pnpm-lock.yaml 過期：90%
- TypeScript 錯誤：8%
- 其他：2%
