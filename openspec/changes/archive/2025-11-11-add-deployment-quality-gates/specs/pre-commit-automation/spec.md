# Pre-commit Automation

Pre-commit 自動化確保在程式碼進入版本控制前就通過品質檢查，提供最早的錯誤發現機制。

## ADDED Requirements

### Requirement: Git Hooks 自動觸發

**Priority**: High
**Status**: Proposed

The system MUST automatically execute quality checks before git commit and prevent problematic code from being committed.
系統必須在 git commit 前自動執行品質檢查，阻止有問題的程式碼被提交。

#### Scenario: Commit 前自動執行 lint

**Given** 開發者修改了 TypeScript 檔案並執行 `git add`
**When** 開發者執行 `git commit`
**Then** pre-commit hook MUST 自動執行 ESLint 檢查
**And** 只檢查 staged files（提升效能）
**And** 如果發現錯誤MUST 阻止 commit

#### Scenario: Commit 前自動執行 typecheck

**Given** 開發者修改了 TypeScript 檔案
**When** 執行 `git commit`
**Then** pre-commit hook MUST 執行型別檢查
**And** 如果發現型別錯誤MUST 阻止 commit
**And** 錯誤訊息MUST 指出具體的錯誤位置

#### Scenario: 自動修復可修復的問題

**Given** staged files 包含可自動修復的 ESLint 錯誤（如格式問題）
**When** 執行 `git commit`
**Then** pre-commit hook MUST 自動執行 `eslint --fix`
**And** 修復後的檔案MUST 自動加入 staging area
**And** commit MUST 繼續進行

---

### Requirement: Husky 整合

**Priority**: High
**Status**: Proposed

The system MUST use Husky to manage git hooks and ensure all developers use the same hooks configuration.
系統必須使用 Husky 管理 git hooks，確保所有開發者都使用相同的 hooks 配置。

#### Scenario: 首次設定專案

**Given** 新的開發者 clone 專案並執行 `pnpm install`
**When** pnpm install 完成
**Then** Husky MUST 自動初始化 git hooks
**And** .husky/pre-commit 檔案MUST 存在
**And** 該檔案MUST 是可執行的

#### Scenario: Hook 配置更新

**Given** 專案的 .husky/pre-commit 檔案被更新
**When** 開發者執行 `git pull` 取得更新
**Then** 新的 hook 配置MUST 立即生效
**And** 下次 commit 時MUST 使用新的檢查邏輯

---

### Requirement: lint-staged 配置

**Priority**: High
**Status**: Proposed

The system MUST use lint-staged to check only staged files, improving pre-commit check performance.
系統必須使用 lint-staged 只檢查 staged files，提升 pre-commit 檢查的效能。

#### Scenario: 只檢查 staged TypeScript 檔案

**Given** 專案包含 100 個 TypeScript 檔案
**And** 開發者只修改並 stage 了 3 個檔案
**When** 執行 `git commit`
**Then** lint-staged MUST 只檢查這 3 個檔案
**And** 不MUST 檢查其他 97 個檔案

#### Scenario: 多種檔案類型的檢查

**Given** 開發者 stage 了 TypeScript、JSON 和 Markdown 檔案
**When** 執行 `git commit`
**Then** lint-staged MUST 對不同檔案類型執行對應的檢查
**And** TypeScript 檔案執行 eslint 和 tsc
**And** JSON 檔案執行 prettier
**And** Markdown 檔案執行 markdownlint（如果配置）

---

### Requirement: pnpm-lock.yaml 同步檢查

**Priority**: Critical
**Status**: Proposed

The system MUST ensure pnpm-lock.yaml stays in sync with package.json to prevent CI/CD failures.
系統必須確保 pnpm-lock.yaml 與 package.json 保持同步，防止 CI/CD 失敗。

#### Scenario: package.json 被修改但 lockfile 未更新

**Given** 開發者手動修改 package.json 新增依賴
**And** 未執行 `pnpm install`
**When** 嘗試 commit package.json
**Then** pre-commit hook MUST 檢測到 lockfile 不同步
**And** MUST 自動執行 `pnpm install --frozen-lockfile --lockfile-only`
**And** 更新後的 lockfile MUST 自動加入 staging area

#### Scenario: 同時修改 package.json 和 lockfile

**Given** 開發者執行 `pnpm add <package>` 正確新增依賴
**And** package.json 和 pnpm-lock.yaml 都已更新
**When** 執行 `git commit`
**Then** pre-commit hook MUST 通過檢查
**And** 兩個檔案都MUST 被成功 commit

---

### Requirement: Hook 繞過機制

**Priority**: Low
**Status**: Proposed

The system MUST allow bypassing pre-commit hooks in emergency situations but SHALL log and warn about it.
系統必須允許在緊急情況下繞過 pre-commit hooks，但MUST 記錄和警告。

#### Scenario: 使用 --no-verify 繞過 hooks

**Given** 開發者在緊急情況下需要快速 commit
**When** 執行 `git commit --no-verify`
**Then** pre-commit hooks MUST 被繞過
**And** commit MUST 成功
**But** CI/CD 仍然會執行完整檢查

#### Scenario: 文件更新時 hook 的表現

**Given** 開發者只修改 .md 或 .txt 檔案
**When** 執行 `git commit`
**Then** TypeScript 和 ESLint 檢查MUST 被跳過
**And** commit MUST 快速完成
