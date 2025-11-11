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

---

## 🔒 TypeScript 類型安全規範

### 核心原則

**絕對禁止**：
- ❌ 使用 `any` 類型（除非使用 `eslint-disable-next-line` 並註明原因）
- ❌ 忽略類型錯誤以「讓編譯通過」
- ❌ 使用 `@ts-ignore`（應使用 `@ts-expect-error` 並說明原因）

**強制要求**：
- ✅ 所有函式參數必須有明確類型
- ✅ 所有函式必須有回傳類型
- ✅ API response 必須做類型斷言
- ✅ Error 物件屬性存取必須使用類型斷言

### 類型定義模式

#### 1. API Response 類型斷言
```typescript
// ✅ 正確
const data = await response.json() as { token: string };
const errorData = await response.json().catch(() => ({})) as ApiError;

// ❌ 錯誤
const data = await response.json();  // unknown type
```

#### 2. Error 物件處理
```typescript
// ✅ 正確
try {
  // ...
} catch (error) {
  console.error((error as Error).message);
  const code = (error as { code?: string }).code;
}

// ❌ 錯誤
try {
  // ...
} catch (error) {
  console.error(error.message);  // Type error
}
```

#### 3. Database 類型占位符
```typescript
// ✅ 正確（當 Database 類型不可用時）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompanyRow = any; // Database type placeholder

// ❌ 錯誤
type CompanyRow = any;  // 缺少 eslint-disable 和說明
```

#### 4. RequestInit Body 類型
```typescript
// ✅ 正確（避免 Cloudflare Workers 類型衝突）
interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

// ❌ 錯誤
interface FetchOptions extends RequestInit {
  body?: CustomType  // 與 RequestInit['body'] 衝突
}
```

#### 5. 中間件類型導入
```typescript
// ✅ 必須明確導入類型
import type { PermissionResource, PermissionAction } from '@/types/rbac.types';

const hasAccess = await checkPermission(
  userId,
  resource as PermissionResource,
  action as PermissionAction
);
```

### 何時使用 @ts-expect-error

**允許使用的情況**（必須加註解說明）：
- ✅ Cloudflare Workers/D1/Neon 等基礎設施類型不相容
- ✅ TanStack Query 等第三方套件回調參數類型不完整
- ✅ 複雜泛型類型推導問題

**範例**：
```typescript
// ✅ 正確：說明原因
// @ts-expect-error - Cloudflare Workers RequestInit type compatibility
const requestConfig: RequestInit = { ... };

// @ts-expect-error - TanStack Query onMutate argument type compatibility
userContext = await config.onMutate(variables);

// ❌ 錯誤：沒有說明
// @ts-expect-error
const config = { ... };
```

**禁止使用的情況**：
- ❌ 業務邏輯層的類型錯誤
- ❌ 可透過正確類型定義解決的問題
- ❌ 單純為了通過編譯

### 類型檢查工作流程

**開發時**：
```bash
# 即時類型檢查（在編輯器中）
# VS Code 會自動顯示類型錯誤

# 手動執行完整檢查
pnpm run typecheck
```

**提交前**：
```bash
# Pre-commit hook 會自動執行
# 無需手動執行，有錯誤會自動阻止 commit
```

**修復類型錯誤時的優先順序**：
1. ✅ 優先：定義正確的類型
2. ✅ 次之：使用類型斷言（`as Type`）
3. ⚠️ 謹慎：使用 `@ts-expect-error`（必須註明原因）
4. ❌ 禁止：使用 `any` 或 `@ts-ignore`

### 常見類型錯誤快速參考

| 錯誤訊息 | 解決方案 |
|---------|---------|
| `Property 'X' does not exist on type 'unknown'` | 加上 `as Type` 類型斷言 |
| `Cannot find name 'TypeName'` | 檢查導入和實際類型名稱 |
| `Property 'error' is missing in type '{}'` | 提供完整的錯誤物件或 fallback |
| `Conversion of type 'X' to type 'Y' may be a mistake` | 使用 `as unknown as Y` 中間斷言 |
| `Expected 0 arguments, but got 1` | 檢查函式定義，移除多餘參數 |

**詳細說明**：參考 `DEPLOYMENT_CHECKLIST.md` 的「TypeScript 類型檢查最佳實踐」章節