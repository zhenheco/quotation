# Tasks

## Phase 1: 緊急修復（Critical Priority）

### 1.1 新增必要腳本到 package.json
- [x] 新增 `"typecheck": "tsc --noEmit"` 腳本
- [x] 新增 `"lint:fix": "eslint . --fix"` 腳本
- [x] 驗證 `"lint": "eslint ."` 腳本存在
- [x] 測試所有腳本可正常執行

**驗證**：執行 `pnpm run typecheck` 和 `pnpm run lint:fix` 應該成功

---

### 1.2 修正 TypeScript any 類型錯誤（52 個）

#### 1.2.1 修正 lib/errors/api-error.ts（4 處）
- [ ] 為 error handler 參數定義明確型別
- [ ] 為 API response 定義 interface
- [ ] 移除所有 `any` 使用
- [ ] 執行 `pnpm run typecheck` 驗證

#### 1.2.2 修正 lib/services/*.ts（28 處）
- [ ] audit-log.ts: 定義 log entry 型別
- [ ] email.ts: 定義 email options 型別
- [ ] exchange-rate.ts: 定義 API response 型別
- [ ] notification.ts: 定義 notification payload 型別
- [ ] product.ts: 定義 product CRUD 參數型別
- [ ] quotation.ts: 定義 quotation 相關型別
- [ ] 其他 service 檔案的型別定義
- [ ] 執行 `pnpm run typecheck` 驗證每個檔案

#### 1.2.3 修正 components/charts/*.tsx（8 處）
- [ ] 為 chart data 定義 interface
- [ ] 為 chart options 定義型別
- [ ] 為 event handlers 定義型別
- [ ] 執行 `pnpm run typecheck` 驗證

#### 1.2.4 修正 lib/middleware/*.ts（7 處）
- [ ] 為 middleware context 定義型別
- [ ] 為 request/response 定義明確型別
- [ ] 移除所有 `any` 使用
- [ ] 執行 `pnpm run typecheck` 驗證

#### 1.2.5 修正其他檔案（5 處）
- [ ] 搜尋並修正剩餘的 `any` 使用
- [ ] 執行完整的 `pnpm run typecheck` 驗證
- [ ] 確認零 TypeScript 錯誤

**驗證**：執行 `pnpm run typecheck` 應該回報零錯誤

---

### 1.3 修正 ESLint 警告（51 個）

#### 1.3.1 修正未使用變數（40+ 處）
- [ ] 使用 `pnpm run lint` 找出所有未使用變數
- [ ] 移除真正未使用的變數
- [ ] 對必須保留的變數加上 `_` 前綴
- [ ] 執行 `pnpm run lint` 驗證修正

#### 1.3.2 修正 img 標籤問題（11 處）
- [ ] 搜尋所有 `<img>` 標籤使用
- [ ] 替換為 `next/image` 的 `Image` 組件
- [ ] 為每個 Image 組件加上 `width` 和 `height` 屬性
- [ ] 處理動態圖片的優化配置
- [ ] 執行 `pnpm run lint` 驗證修正

#### 1.3.3 修正 useEffect 依賴問題（2 處）
- [ ] 找出缺少依賴的 useEffect
- [ ] 評估是否需要加入依賴或使用 useCallback
- [ ] 修正依賴陣列
- [ ] 執行 `pnpm run lint` 驗證修正

**驗證**：執行 `pnpm run lint` 應該回報零警告零錯誤

---

### 1.4 整合 GitHub Actions Workflows
- [x] 決定保留哪個 workflow（保留：cloudflare-deploy.yml）
- [x] 確保保留的 workflow 包含所有必要步驟：
  - [x] pnpm install --frozen-lockfile
  - [x] pnpm run lint
  - [x] pnpm run typecheck
  - [x] pnpm run build
  - [x] Cloudflare Workers 部署
- [x] 刪除重複的 workflow 檔案 (deploy-cloudflare.yml)
- [ ] 更新 DEPLOYMENT_CHECKLIST.md 參考正確的 workflow

**驗證**：推送到測試分支，確認只有一個 workflow 執行且包含所有檢查

---

### 1.5 驗證緊急修復完成
- [ ] 執行 `pnpm run lint` - 零錯誤零警告
- [ ] 執行 `pnpm run typecheck` - 零錯誤
- [ ] 執行 `pnpm run build` - 成功完成
- [ ] 推送到測試分支驗證 CI/CD 通過
- [ ] 合併到 main 分支

**里程碑**：所有程式碼品質問題已修復，CI/CD 可以成功執行

---

## Phase 2: 防護機制（High Priority）

### 2.1 安裝並配置 Husky
- [x] 執行 `pnpm add -D husky`
- [x] 執行 `pnpm exec husky init`
- [x] 驗證 `.husky/` 目錄被建立
- [x] 確保 `.husky/pre-commit` 檔案存在
- [x] 將 `.husky/_/` 加入 .gitignore（如果需要）

**驗證**：`.husky/pre-commit` 應該是可執行的

---

### 2.2 安裝並配置 lint-staged
- [x] 執行 `pnpm add -D lint-staged`
- [x] 在 package.json 中新增 `lint-staged` 配置：
  ```json
  {
    "lint-staged": {
      "*.{ts,tsx}": [
        "eslint --fix",
        "bash -c 'tsc --noEmit'"
      ],
      "pnpm-lock.yaml": [
        "pnpm install --frozen-lockfile --lockfile-only"
      ]
    }
  }
  ```
- [x] 測試配置正確性

**驗證**：修改一個 .ts 檔案並嘗試 commit，應該觸發檢查

---

### 2.3 建立 pre-commit hook
- [x] 編輯 `.husky/pre-commit` 檔案
- [x] 加入以下內容：
  ```bash
  #!/bin/sh
  pnpm exec lint-staged
  ```
- [x] 確保檔案有執行權限 (`chmod +x .husky/pre-commit`)
- [ ] 測試 pre-commit hook

**驗證**：
1. 修改一個 .ts 檔案加入 `any` 類型
2. 執行 `git add` 和 `git commit`
3. 應該被 hook 阻止並顯示錯誤

---

### 2.4 更新 ESLint 配置為 error 級別
- [x] 開啟 `eslint.config.mjs`
- [x] 將關鍵規則從 `warn` 改為 `error`：
  - [x] `@typescript-eslint/no-explicit-any: "error"`
  - [x] `@typescript-eslint/no-unused-vars: "error"`
  - [x] `react-hooks/exhaustive-deps: "error"`
  - [x] `@next/next/no-img-element: "error"`
- [x] 執行 `pnpm run lint` 驗證配置

**驗證**：故意違反規則應該回報錯誤而非警告

---

### 2.5 啟用 TypeScript 嚴格模式（可選）
- [ ] 開啟 `tsconfig.json`
- [ ] 評估啟用以下選項的影響：
  - [ ] `"strict": true`
  - [ ] `"noUnusedLocals": true`
  - [ ] `"noUnusedParameters": true`
  - [ ] `"noImplicitReturns": true`
- [ ] 如果啟用，修正產生的新錯誤
- [ ] 執行 `pnpm run typecheck` 驗證

**驗證**：TypeScript 檢查應該更嚴格但仍然通過

---

### 2.6 更新 next.config.ts 為嚴格模式
- [ ] 開啟 `next.config.ts`
- [ ] 將 `eslint.ignoreDuringBuilds` 設為 `false`
- [ ] 將 `typescript.ignoreBuildErrors` 設為 `false`
- [ ] 執行 `pnpm run build` 驗證配置

**驗證**：Build 過程應該在發現錯誤時立即停止

---

### 2.7 更新專案文件

#### 2.7.1 更新 CLAUDE.md
- [x] 在 TypeScript 和 Next.js 編碼規範區塊新增：
  - [x] Pre-commit hooks 說明
  - [x] Husky 和 lint-staged 使用方式
  - [x] 如何繞過 hooks（緊急情況）
  - [x] Commit 前自動檢查清單
- [x] 新增「自動化品質防護機制」章節
- [x] 更新範例和最佳實踐

#### 2.7.2 更新 DEPLOYMENT_CHECKLIST.md
- [ ] 新增自動化檢查說明
- [ ] 更新手動檢查清單
- [ ] 新增常見問題和解決方案
- [ ] 新增 GitHub Actions 日誌查看指引

#### 2.7.3 更新 README.md（如需要）
- [ ] 新增開發環境設定章節
- [ ] 說明如何安裝 git hooks
- [ ] 說明品質檢查流程

**驗證**：新的開發者應該能根據文件正確設定開發環境

---

### 2.8 建立 .lintstagedrc.js（備選）
- [ ] 如果 package.json 配置過於複雜，建立獨立配置檔
- [ ] 遷移 lint-staged 配置到 `.lintstagedrc.js`
- [ ] 測試配置正常運作
- [ ] 從 package.json 移除舊配置

**驗證**：Pre-commit hooks 應該繼續正常運作

---

### 2.9 驗證防護機制完成
- [ ] 測試 pre-commit hooks 正確阻止有問題的程式碼
- [ ] 測試自動修復功能正常運作
- [ ] 測試 pnpm-lock.yaml 同步檢查
- [ ] 驗證 CI/CD 仍然通過
- [ ] 請團隊成員測試新的工作流程

**里程碑**：自動化品質防護機制已建立並正常運作

---

## Phase 3: 持續監控與改進（Medium Priority）

### 3.1 監控 CI/CD 執行狀況
- [ ] 設定 GitHub Actions 失敗通知
- [ ] 建立 CI/CD 執行時間監控
- [ ] 記錄常見失敗模式
- [ ] 定期檢視和優化 workflow

### 3.2 收集團隊回饋
- [ ] 調查開發者對新流程的適應情況
- [ ] 收集 pain points 和改進建議
- [ ] 評估是否需要調整規則嚴格度
- [ ] 根據回饋優化流程

### 3.3 建立品質指標儀表板（可選）
- [ ] 追蹤程式碼品質趨勢
- [ ] 監控 CI/CD 成功率
- [ ] 記錄部署頻率和成功率
- [ ] 定期檢視指標並改進

---

## 完成標準

**Phase 1 完成標準**：
- ✅ 零 TypeScript 錯誤
- ✅ 零 ESLint 錯誤和警告
- ✅ CI/CD 成功執行並部署
- ✅ 所有必要腳本已定義
- ✅ 只有一個 GitHub Actions workflow

**Phase 2 完成標準**：
- ✅ Pre-commit hooks 正常運作
- ✅ lint-staged 只檢查 staged files
- ✅ pnpm-lock.yaml 自動同步
- ✅ ESLint 規則升級為 error
- ✅ 文件已更新並清晰

**整體完成標準**：
- ✅ 部署成功率 100%
- ✅ 新的開發者可根據文件正確設定環境
- ✅ 所有品質檢查在本地和 CI/CD 都正常執行
- ✅ 團隊成員理解並遵循新的工作流程
