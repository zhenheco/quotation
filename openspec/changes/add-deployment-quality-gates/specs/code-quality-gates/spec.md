# Code Quality Gates

程式碼品質閘門定義了程式碼必須通過的檢查標準，確保所有程式碼符合專案的品質要求。

## ADDED Requirements

### Requirement: TypeScript 嚴格型別檢查

**Priority**: Critical
**Status**: Proposed

The system MUST enforce strict TypeScript type checking and prohibit the use of `any` type to ensure type safety.
系統必須強制執行 TypeScript 嚴格型別檢查，禁止使用 `any` 類型，確保型別安全。

#### Scenario: 開發者嘗試使用 any 類型

**Given** 開發者在 TypeScript 檔案中使用 `any` 類型
**When** 執行 `pnpm run typecheck`
**Then** 系統應該回報型別錯誤並阻止編譯
**And** 錯誤訊息應該指出 `any` 類型的使用位置和建議的修復方式

#### Scenario: 開發者正確定義型別

**Given** 開發者為所有變數、參數、回傳值定義明確型別
**When** 執行 `pnpm run typecheck`
**Then** 系統應該通過型別檢查
**And** 不應該有任何型別錯誤或警告

---

### Requirement: ESLint 規則強制執行

**Priority**: High
**Status**: Proposed

The system MUST treat all ESLint warnings as errors to ensure code conforms to project coding standards.
系統必須將所有 ESLint 警告視為錯誤，確保程式碼符合專案的編碼標準。

#### Scenario: 開發者使用未宣告的變數

**Given** 開發者宣告但未使用變數
**When** 執行 `pnpm run lint`
**Then** 系統應該回報錯誤並阻止 commit
**And** 錯誤訊息應該建議移除未使用的變數或加上底線前綴

#### Scenario: 開發者使用 img 標籤而非 next/image

**Given** 開發者在 React 組件中使用 HTML `<img>` 標籤
**When** 執行 `pnpm run lint`
**Then** 系統應該回報錯誤
**And** 錯誤訊息應該建議使用 `next/image` 組件

#### Scenario: useEffect 缺少依賴項

**Given** 開發者在 useEffect 中使用外部變數但未加入依賴陣列
**When** 執行 `pnpm run lint`
**Then** 系統應該回報錯誤
**And** 錯誤訊息應該列出缺少的依賴項

---

### Requirement: 必要腳本定義

**Priority**: High
**Status**: Proposed

The project's package.json MUST include all necessary quality check scripts.
專案的 package.json 必須包含所有必要的品質檢查腳本。

#### Scenario: 執行型別檢查腳本

**Given** package.json 包含 `typecheck` 腳本
**When** 開發者執行 `pnpm run typecheck`
**Then** 系統應該執行 `tsc --noEmit` 並回報所有型別錯誤

#### Scenario: 執行 lint 腳本

**Given** package.json 包含 `lint` 和 `lint:fix` 腳本
**When** 開發者執行 `pnpm run lint`
**Then** 系統應該執行 `next lint` 並回報所有程式碼品質問題
**When** 開發者執行 `pnpm run lint:fix`
**Then** 系統應該自動修復可修復的問題

---

### Requirement: Build 測試驗證

**Priority**: Critical
**Status**: Proposed

The system MUST execute complete build testing before deployment to ensure code can be successfully compiled.
系統必須在部署前執行完整的 build 測試，確保程式碼可以成功編譯。

#### Scenario: Build 成功完成

**Given** 所有程式碼通過 lint 和 typecheck
**When** 執行 `pnpm run build`
**Then** 系統應該成功產生 `.next` 目錄
**And** 應該產生 standalone 輸出（如果配置）
**And** 不應該有任何編譯錯誤

#### Scenario: Build 因型別錯誤失敗

**Given** 程式碼包含型別錯誤
**When** 執行 `pnpm run build`
**Then** 系統應該在 type checking 階段失敗
**And** 錯誤訊息應該明確指出錯誤位置和原因

---

### Requirement: 配置檔案嚴格模式

**Priority**: Medium
**Status**: Proposed

Project configuration files MUST enable strict mode and SHALL NOT hide quality issues.
專案配置檔案必須啟用嚴格模式，不應該掩蓋品質問題。

#### Scenario: Next.js 配置啟用嚴格檢查

**Given** next.config.ts 設定 `typescript.ignoreBuildErrors: false`
**And** next.config.ts 設定 `eslint.ignoreDuringBuilds: false`
**When** 執行 `pnpm run build`
**Then** 系統應該在發現錯誤時立即停止 build
**And** 不應該產生有問題的 build 輸出

#### Scenario: ESLint 配置使用 error 級別

**Given** .eslintrc.json 將關鍵規則設為 "error"
**When** 執行 `pnpm run lint`
**Then** 違反規則的程式碼應該被視為錯誤而非警告
**And** exit code 應該為非零值
