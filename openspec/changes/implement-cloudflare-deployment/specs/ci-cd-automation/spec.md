# CI/CD Automation

自動化部署流程，實現從 GitHub push 到 Cloudflare Workers 的無縫部署。

---

## ADDED Requirements

### Requirement: GitHub Actions 工作流程自動化部署

系統 MUST 提供 GitHub Actions CI/CD 工作流程，自動執行建置、測試和部署。

#### Scenario: 推送到 main 分支觸發生產部署

**Given** 開發者將程式碼推送到 main 分支
**When** GitHub Actions 工作流程被觸發
**Then** 系統應該：
- 執行 `pnpm install --frozen-lockfile` 安裝依賴
- 執行 `pnpm run lint` 檢查程式碼風格
- 執行 `tsc --noEmit` 檢查 TypeScript 類型
- 執行 `pnpm run build` 建置專案
- 使用 `cloudflare/wrangler-action@v3` 部署到 Cloudflare Workers 生產環境
- 在 GitHub Actions 日誌中顯示部署狀態

#### Scenario: PR 觸發預覽環境部署

**Given** 開發者建立 Pull Request
**When** GitHub Actions 工作流程被觸發
**Then** 系統應該：
- 執行相同的建置和測試流程
- 部署到 Cloudflare Workers 預覽環境（使用 PR 的 branch 名稱）
- 在 PR 中顯示預覽環境 URL

#### Scenario: 建置或測試失敗時阻止部署

**Given** 程式碼存在 lint 錯誤或 TypeScript 類型錯誤
**When** GitHub Actions 執行到 lint 或 type check 步驟
**Then** 系統應該：
- 停止工作流程
- 標記為失敗狀態
- 不執行部署步驟
- 在 GitHub Actions 日誌中顯示錯誤訊息

---

### Requirement: 環境變數安全管理

系統 MUST 安全地管理不同環境的敏感資料。

#### Scenario: 使用 GitHub Secrets 儲存 Cloudflare 認證

**Given** 需要部署到 Cloudflare
**When** 配置 GitHub Actions 工作流程
**Then** 系統應該：
- 從 GitHub Secrets 讀取 `CLOUDFLARE_API_TOKEN`
- 從 GitHub Secrets 讀取 `CLOUDFLARE_ACCOUNT_ID`
- 不在日誌中顯示敏感資料
- 確保 Secrets 只能在授權的工作流程中使用

#### Scenario: 使用 Cloudflare Secrets 儲存生產環境變數

**Given** 應用需要資料庫和 API 認證
**When** 使用 `wrangler secret put` 指令
**Then** 系統應該：
- 加密儲存所有環境變數（`SUPABASE_POOLER_URL`、`RESEND_API_KEY` 等）
- 在 Worker runtime 中可透過 `process.env` 讀取
- 不在 `wrangler.jsonc` 中明文儲存敏感資料

#### Scenario: 本地開發使用 .dev.vars

**Given** 開發者需要在本地測試
**When** 建立 `.dev.vars` 檔案
**Then** 系統應該：
- 自動載入 `.dev.vars` 中的環境變數
- 確保 `.dev.vars` 已加入 `.gitignore`
- 不將本地環境變數提交到 Git

---

### Requirement: 部署狀態監控

系統 MUST 提供部署結果的即時回饋。

#### Scenario: 部署成功後顯示 URL

**Given** 部署流程成功完成
**When** GitHub Actions 工作流程完成
**Then** 系統應該：
- 在 GitHub Actions 日誌中顯示部署 URL
- 標記工作流程為成功狀態
- 在 Cloudflare Dashboard 中顯示新的部署版本

#### Scenario: 部署失敗時提供錯誤訊息

**Given** 部署過程中發生錯誤
**When** `wrangler deploy` 失敗
**Then** 系統應該：
- 在 GitHub Actions 日誌中顯示詳細錯誤訊息
- 標記工作流程為失敗狀態
- 不影響現有的生產環境部署
- 允許開發者查看錯誤並修復

---

## Implementation Notes

### GitHub Actions 工作流程檔案

- 檔案位置：`.github/workflows/cloudflare-deploy.yml`
- Node.js 版本：20
- pnpm 版本：8
- Wrangler Action 版本：v3

### 環境變數清單

**GitHub Secrets**：
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**Cloudflare Secrets**：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_POOLER_URL`
- `EXCHANGE_RATE_API_KEY`
- `CRON_SECRET`
- `CSRF_SECRET`
- `COMPANY_NAME`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`

### 驗證方式

- 建立測試 PR 並確認預覽環境建立成功
- 推送到 main 分支並確認生產環境更新
- 檢查 GitHub Actions 日誌確認所有步驟執行成功
