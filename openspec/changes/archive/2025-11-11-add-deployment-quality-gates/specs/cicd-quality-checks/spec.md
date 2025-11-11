# CI/CD Quality Checks

CI/CD 品質檢查作為第二道防線，在程式碼合併和部署前執行完整的自動化檢查。

## ADDED Requirements

### Requirement: GitHub Actions 品質檢查工作流程

**Priority**: Critical
**Status**: Proposed

The system MUST execute complete quality checks in GitHub Actions to ensure code in all branches meets standards.
系統必須在 GitHub Actions 中執行完整的品質檢查，確保所有分支的程式碼符合標準。

#### Scenario: Push 到任何分支時執行檢查

**Given** 開發者推送程式碼到任何分支
**When** GitHub Actions workflow 被觸發
**Then** 系統 MUST 執行以下檢查（依序）：
1. 依賴安裝（使用 --frozen-lockfile）
2. ESLint 檢查
3. TypeScript 型別檢查
4. Build 測試
**And** 任何一步失敗 MUST 中止後續步驟
**And** 失敗的步驟 MUST 提供清晰的錯誤訊息

#### Scenario: Pull Request 時執行檢查

**Given** 開發者建立或更新 Pull Request
**When** GitHub Actions workflow 執行
**Then** PR 頁面 MUST 顯示所有檢查的狀態
**And** MUST 所有檢查通過才能合併
**And** 失敗的檢查 MUST 在 PR 中顯示具體錯誤

---

### Requirement: 依賴安裝驗證

**Priority**: Critical
**Status**: Proposed

The system MUST use frozen lockfile to install dependencies, ensuring CI/CD environment matches local environment.
系統必須使用 frozen lockfile 安裝依賴，確保 CI/CD 環境與本地環境一致。

#### Scenario: Lockfile 與 package.json 同步

**Given** pnpm-lock.yaml 與 package.json 保持同步
**When** GitHub Actions 執行 `pnpm install --frozen-lockfile`
**Then** 依賴 MUST 成功安裝
**And** 安裝的版本 MUST 與 lockfile 中指定的版本完全一致

#### Scenario: Lockfile 過期導致失敗

**Given** package.json 被修改但 lockfile 未更新
**When** GitHub Actions 執行 `pnpm install --frozen-lockfile`
**Then** 安裝MUST 失敗
**And** 錯誤訊息MUST 明確指出 lockfile 過期
**And** 錯誤訊息MUST 提供修復指引（執行 pnpm install）

---

### Requirement: 多環境 Node.js 測試

**Priority**: Medium
**Status**: Proposed

The system MUST execute tests on multiple Node.js versions to ensure compatibility.
系統必須在多個 Node.js 版本上執行測試，確保相容性。

#### Scenario: 在 Node.js 18 和 20 上測試

**Given** GitHub Actions matrix 配置包含 Node.js 18 和 20
**When** 任何分支被推送
**Then** 品質檢查MUST 在兩個 Node.js 版本上並行執行
**And** MUST 兩個版本都通過才視為成功

---

### Requirement: 快取優化

**Priority**: Medium
**Status**: Proposed

The system MUST use GitHub Actions caching mechanism to accelerate CI/CD execution speed.
系統必須使用 GitHub Actions 快取機制，加速 CI/CD 執行速度。

#### Scenario: 快取 pnpm store

**Given** GitHub Actions workflow 配置了 pnpm 快取
**When** 第二次或後續執行 workflow
**Then** pnpm store MUST 從快取載入
**And** 依賴安裝時間MUST 顯著減少
**And** 只有新增的依賴 MUST 下載

#### Scenario: 快取失效重建

**Given** package.json 或 pnpm-lock.yaml 被修改
**When** GitHub Actions workflow 執行
**Then** 快取MUST 失效
**And** 系統MUST 重新建立快取
**And** 後續執行MUST 使用新的快取

---

### Requirement: 部署前最後檢查

**Priority**: Critical
**Status**: Proposed

The system MUST execute complete build and testing before deploying to Cloudflare Workers.
系統必須在部署到 Cloudflare Workers 前執行完整的 build 和測試。

#### Scenario: 部署前 build 驗證

**Given** 所有品質檢查都通過
**When** 部署步驟開始前
**Then** 系統MUST 執行 `pnpm run build`
**And** MUST 驗證 `.next` 和 `.open-next` 目錄存在
**And** MUST 驗證 standalone 輸出結構正確

#### Scenario: Build 失敗阻止部署

**Given** Build 過程中發生錯誤
**When** 部署步驟嘗試執行
**Then** 部署MUST 被阻止
**And** workflow MUST 標記為失敗
**And** 不MUST 有任何檔案被上傳到 Cloudflare

---

### Requirement: Workflow 整合與去重

**Priority**: High
**Status**: Proposed

The system MUST consolidate duplicate GitHub Actions workflows to avoid confusion and resource waste.
系統必須整合重複的 GitHub Actions workflows，避免混亂和資源浪費。

#### Scenario: 單一 Cloudflare 部署 workflow

**Given** 專案只保留一個 Cloudflare 部署 workflow
**When** 程式碼被推送到 main 分支
**Then** 只有一個 workflow MUST 被觸發
**And** 該 workflow MUST 包含完整的檢查和部署步驟

#### Scenario: 廢棄舊 workflow

**Given** 舊的 deploy-cloudflare.yml 被移除
**When** 查看 .github/workflows/ 目錄
**Then** 只MUST 存在 cloudflare-deploy.yml
**And** 該檔案MUST 包含所有必要的步驟

---

### Requirement: 失敗通知和日誌

**Priority**: Medium
**Status**: Proposed

The system MUST provide clear error messages and debugging information when CI/CD fails.
系統必須在 CI/CD 失敗時提供清晰的錯誤訊息和除錯資訊。

#### Scenario: Lint 失敗時的錯誤訊息

**Given** ESLint 檢查失敗
**When** 開發者查看 GitHub Actions 日誌
**Then** MUST 看到所有失敗的規則和位置
**And** 每個錯誤MUST 包含檔案路徑和行號
**And** MUST 提供修復建議

#### Scenario: TypeScript 錯誤時的錯誤訊息

**Given** 型別檢查失敗
**When** 開發者查看日誌
**Then** MUST 看到完整的 TypeScript 錯誤輸出
**And** MUST 包含錯誤的檔案、行號和型別不匹配的詳細資訊
