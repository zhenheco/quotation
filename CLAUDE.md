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