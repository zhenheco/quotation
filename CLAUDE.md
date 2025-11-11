<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

## 🚨 Cloudflare Workers 部署檢查（強制執行）

**每次推送到 main 分支前必須執行**：

### 1. 依賴同步檢查（最重要！90% 部署失敗原因）
```bash
# 如果安裝了任何套件，必須執行：
pnpm install
git add pnpm-lock.yaml
```

**原因**：GitHub Actions 使用 `pnpm install --frozen-lockfile`，lockfile 過期會導致部署失敗

**絕對不要**：
- ❌ 使用 `npm install`（會導致 lockfile 不同步）
- ❌ 安裝套件後未提交 `pnpm-lock.yaml`
- ❌ 手動修改 `package.json` 後未執行 `pnpm install`

### 2. Build 測試
```bash
pnpm run build
```

### 3. 提交前確認
```bash
# 確保 pnpm-lock.yaml 已包含在提交中
git status
git add pnpm-lock.yaml
```

**完整檢查清單**：參考 `DEPLOYMENT_CHECKLIST.md`

**如遇到部署失敗**：
1. 查看 GitHub Actions 日誌：`gh run view <run-id> --log`
2. 如果是 `ERR_PNPM_OUTDATED_LOCKFILE`：執行 `pnpm install` 並提交 lockfile
3. 更新 `DEPLOYMENT_CHECKLIST.md` 記錄新的失敗模式

---

## 🛡️ 自動化品質防護機制

本專案已啟用 **Pre-commit hooks**（使用 Husky + lint-staged），確保程式碼品質。

### Pre-commit Hook 行為

每次執行 `git commit` 時，會自動：

1. **ESLint 檢查和自動修復**
   - 檢查所有 staged 的 `.ts` 和 `.tsx` 檔案
   - 自動修復可修復的問題（如格式化、移除未使用的導入等）
   - 如果有無法自動修復的錯誤，會阻止 commit 並顯示錯誤訊息

2. **TypeScript 類型檢查**
   - 執行 `tsc --noEmit` 檢查整個專案的類型錯誤
   - 如果有類型錯誤，會阻止 commit 並顯示錯誤訊息

3. **依賴同步檢查**
   - 如果 `pnpm-lock.yaml` 被修改，自動執行 `pnpm install --frozen-lockfile --lockfile-only`
   - 確保 lockfile 與 `package.json` 同步

### 如何通過 Pre-commit Hook

1. **修正 ESLint 錯誤**：
   ```bash
   pnpm run lint:fix  # 自動修復
   pnpm run lint      # 查看剩餘錯誤
   ```

2. **修正 TypeScript 錯誤**：
   ```bash
   pnpm run typecheck  # 查看類型錯誤
   ```

3. **同步依賴**：
   ```bash
   pnpm install  # 安裝並同步 lockfile
   ```

### 緊急情況繞過 Hooks

⚠️ **僅在緊急情況使用**，且需要在下一個 commit 修正問題：

```bash
git commit --no-verify -m "緊急修復：[描述問題]"
```

### Commit 前自動檢查清單

Pre-commit hooks 會自動執行以下檢查（無需手動執行）：

- ✅ 所有 staged 檔案通過 ESLint 檢查
- ✅ 整個專案通過 TypeScript 類型檢查
- ✅ `pnpm-lock.yaml` 與 `package.json` 同步

如果遇到任何錯誤，commit 會被阻止，並顯示錯誤訊息指引如何修正。