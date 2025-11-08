# 修復 CI/CD lockfile 同步問題

## Why

GitHub Actions CI/CD 流程持續失敗，阻斷所有分支的自動部署，嚴重影響開發效率和部署流程。

## 問題描述

GitHub Actions CI/CD 流程失敗，原因是 `pnpm-lock.yaml` 與 `package.json` 不同步，導致 `pnpm install --frozen-lockfile` 失敗。

**錯誤訊息**：
```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json
```

**影響範圍**：
- 所有分支的 GitHub push 都無法自動部署到 Cloudflare Workers
- CI/CD 流程中斷，需要手動修復

## 根本原因分析

1. **dependencies 和 devDependencies 順序不一致**
   - lockfile 中的 specifiers 順序與 package.json 不同
   - pnpm 在 CI 環境預設使用 `--frozen-lockfile` 嚴格檢查

2. **可能的觸發情境**：
   - 本地執行 `pnpm install` 時自動調整了 package.json 的依賴順序
   - 但忘記提交更新後的 lockfile
   - 或是 lockfile 與 package.json 在不同的 commit 中更新

## 解決方案

### 即時修復（Priority: High）
1. 在本地執行 `pnpm install` 更新 lockfile
2. 提交更新後的 `pnpm-lock.yaml`
3. Push 到遠端，驗證 CI/CD 通過

### 預防性措施（Priority: Medium）
1. 在 GitHub Actions workflow 中加入 lockfile 檢查步驟
2. 提供清晰的錯誤訊息指引開發者修復
3. 考慮在本地 git hooks 中加入 pre-commit 檢查

## 相關檔案
- `.github/workflows/deploy-cloudflare.yml`（deploy-cloudflare.yml:36）
- `package.json`
- `pnpm-lock.yaml`

## 成功標準
- ✅ GitHub Actions 成功執行並部署到 Cloudflare Workers
- ✅ 未來 push 時不會再出現 lockfile 同步錯誤
- ✅ 開發者有清晰的指引知道如何避免此問題
