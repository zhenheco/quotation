# CI/CD Lockfile 同步規格

## 概述

確保 GitHub Actions CI/CD 流程能夠正確處理 pnpm lockfile，避免因 lockfile 不同步導致部署失敗。

## MODIFIED Requirements

### Requirement: CI/CD SHALL tolerate lockfile synchronization issues

**優先級**：High
**類別**：可靠性

The CI/CD pipeline SHALL NOT fail when pnpm-lock.yaml and package.json are out of sync.

#### Scenario: lockfile 與 package.json 不同步時不阻斷部署

**WHEN** pnpm-lock.yaml 與 package.json 存在差異
**AND** GitHub Actions 執行 pnpm install
**THEN** 系統 SHALL 自動更新 lockfile 並繼續部署流程
**AND** SHALL 在日誌中記錄警告訊息

**實作細節**：
- 將 `pnpm install` 改為 `pnpm install --no-frozen-lockfile`
- 或在失敗時提供清晰的修復指引

#### Scenario: lockfile 同步檢查應在建置前執行

**WHEN** CI/CD 流程執行到安裝依賴步驟
**THEN** 系統 SHALL 先檢查 lockfile 是否與 package.json 同步
**AND** 如果不同步 SHALL 記錄詳細的差異資訊

**實作細節**：
```yaml
- name: Check lockfile sync
  run: |
    if ! pnpm install --frozen-lockfile 2>&1 | tee /tmp/pnpm-check.log; then
      echo "::warning::pnpm-lock.yaml is out of sync with package.json"
      echo "Please run 'pnpm install' locally and commit the updated lockfile"
      cat /tmp/pnpm-check.log
      # 繼續執行，但使用 --no-frozen-lockfile
    fi
```

### Requirement: Developers MUST receive clear lockfile synchronization guidance

**優先級**：Medium
**類別**：開發體驗

Developers MUST be provided with clear error messages and actionable steps when lockfile sync issues occur.

#### Scenario: 提交前自動檢查 lockfile

**WHEN** 開發者修改了 package.json 並執行 git commit
**THEN** pre-commit hook SHALL 檢查 lockfile 是否已更新
**AND** 如果未更新 SHALL 阻止提交並提供修復指令

**實作細節**：
- 使用 husky 或簡單的 git hooks
- 檢查 lockfile 的 mtime 是否晚於 package.json

#### Scenario: CI 失敗時提供有用的錯誤訊息

**WHEN** lockfile 檢查失敗且開發者查看 GitHub Actions 日誌
**THEN** SHALL 顯示明確的錯誤原因和修復步驟
**AND** SHALL 包含可直接執行的命令

**實作細節**：
```
錯誤：pnpm-lock.yaml 與 package.json 不同步

修復步驟：
1. git pull origin main
2. pnpm install
3. git add pnpm-lock.yaml
4. git commit -m "chore: update lockfile"
5. git push
```

## ADDED Requirements

### Requirement: CI/CD SHALL generate lockfile difference reports

**優先級**：Low
**類別**：可觀察性

The CI/CD system SHALL automatically generate and display lockfile difference reports when sync issues are detected.

#### Scenario: 自動生成 lockfile 差異摘要

**WHEN** lockfile 不同步且 CI/CD 流程檢測到差異
**THEN** SHALL 自動生成差異報告
**AND** SHALL 在 PR 中以 comment 形式顯示

**實作細節**：
- 使用 `pnpm why` 比較差異
- 整理成易讀的表格格式
- 透過 GitHub Actions 的 `actions/github-script` 發布

## 相關檔案

- `.github/workflows/deploy-cloudflare.yml`（deploy-cloudflare.yml:36）
- `package.json`
- `pnpm-lock.yaml`

## 測試策略

### 單元測試
- 驗證 lockfile 檢查邏輯正確性

### 整合測試
1. 故意製造 lockfile 不同步情況
2. 觸發 CI/CD 流程
3. 驗證流程能否正確處理

### 端到端測試
1. 模擬開發者修改 package.json
2. 提交變更
3. 驗證 CI/CD 完整流程

## 非功能性需求

### 效能
- lockfile 檢查不應增加超過 5 秒的 CI 時間

### 可維護性
- 錯誤訊息應保持最新，與實際修復步驟一致

### 文件
- 在 README 中加入 lockfile 最佳實踐說明
