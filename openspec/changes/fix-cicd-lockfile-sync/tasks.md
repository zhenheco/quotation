# 任務清單

## 階段 1：即時修復（必須立即執行）

### 1.1 更新 lockfile
- [ ] 在本地執行 `pnpm install` 重新生成 lockfile
- [ ] 驗證 lockfile 與 package.json 同步
- [ ] 提交更新後的 `pnpm-lock.yaml`

**驗證方式**：
```bash
# 確認 lockfile 與 package.json 一致
pnpm install --frozen-lockfile
```

### 1.2 推送並驗證 CI/CD
- [ ] Push 更新到遠端
- [ ] 監控 GitHub Actions 執行狀態
- [ ] 確認部署成功完成

**驗證方式**：
```bash
gh run watch
```

## 階段 2：改善 CI/CD 流程（可選，建議執行）

### 2.1 更新 GitHub Actions workflow
- [ ] 修改 `pnpm install` 為 `pnpm install --no-frozen-lockfile`
- [ ] 加入 lockfile 驗證步驟
- [ ] 提供清晰的錯誤訊息

**修改檔案**：`.github/workflows/deploy-cloudflare.yml:36`

### 2.2 加入 Pre-commit Hook（可選）
- [ ] 安裝 `husky` 或使用 git hooks
- [ ] 設定 pre-commit 檢查 lockfile 同步
- [ ] 更新開發文件

**驗證方式**：
```bash
# 測試 hook 是否正常運作
git commit --dry-run
```

## 階段 3：文件更新

### 3.1 更新 README 或開發指南
- [ ] 記錄 lockfile 同步的重要性
- [ ] 提供修復指引
- [ ] 加入最佳實踐建議

## 依賴關係

- 階段 1.1 必須在 1.2 之前完成
- 階段 2 和 3 可以並行執行
- 階段 1 完成後即可解決緊急問題

## 預期時間

- 階段 1：5-10 分鐘
- 階段 2：15-20 分鐘
- 階段 3：10 分鐘

**總計**：30-40 分鐘
