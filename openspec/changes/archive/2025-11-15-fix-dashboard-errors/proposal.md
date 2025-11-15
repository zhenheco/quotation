# Proposal: Fix Dashboard Errors

## Change ID
`fix-dashboard-errors`

## Why
儀表板頁面出現多個執行時錯誤，包括 403 API 權限錯誤和 JavaScript TypeError，影響使用者體驗。需要修復權限映射和加強資料格式化的防護性。

## What Changes
- 新增 `exchange_rates:read` 權限映射
- 修改 `DashboardClient.tsx` 的格式化邏輯，加入 null/undefined 檢查
- 建立瀏覽器擴充套件衝突文件

## Impact
- 受影響的檔案：`lib/cache/services.ts`, `app/[locale]/dashboard/DashboardClient.tsx`
- 受影響的 API：`/api/exchange-rates`
- 前端：儀表板頁面顯示改善

---

## Summary
修復儀表板頁面出現的多個錯誤，包括 API 權限問題、資料格式化錯誤，以及提供瀏覽器擴充套件衝突的解決方案。

## Problem Statement

### 當前問題
儀表板頁面出現以下錯誤：

1. **API 權限錯誤 (403 Forbidden)**
   - `/api/exchange-rates?base=TWD` 回傳 403 錯誤
   - 原因：`exchange_rates:read` 權限未在 `permissionMapping` 中定義

2. **JavaScript 類型錯誤**
   - `TypeError: Cannot read properties of undefined (reading 'toLocaleString')`
   - 位置：`DashboardClient.tsx:148` 和格式化函式中
   - 原因：`amount` 或 `next_collection_amount` 可能為 `undefined` 或 `null`

3. **瀏覽器擴充套件衝突 (不可控)**
   - `autoinsert.js:1 Uncaught SyntaxError: Identifier 'isDragging' has already been declared`
   - `ERR_BLOCKED_BY_CONTENT_BLOCKER`
   - 原因：第三方瀏覽器擴充套件注入的腳本

### 影響範圍
- 儀表板無法正常顯示匯率資訊
- 部分統計數據格式化失敗，導致頁面渲染錯誤
- 使用者體驗受影響

## Proposed Solution

### 1. 修復 Exchange Rates API 權限
在 `lib/cache/services.ts` 的 `permissionMapping` 中新增 `exchange_rates:read` 權限映射。

### 2. 修復資料格式化錯誤
在所有使用 `toLocaleString()` 的地方加入防護性檢查，確保數值存在且有效。

### 3. 提供瀏覽器擴充套件衝突說明
在文件中說明瀏覽器擴充套件可能造成的影響，並提供除錯建議。

## Capabilities

### 1. Exchange Rates Permission Mapping
**Spec**: `openspec/changes/fix-dashboard-errors/specs/exchange-rates-permission/spec.md`
- 新增 `exchange_rates:read` 權限映射
- 確保 API 可以正常存取匯率資料

### 2. Data Formatting Safety
**Spec**: `openspec/changes/fix-dashboard-errors/specs/data-formatting-safety/spec.md`
- 修復 `DashboardClient.tsx` 中的 `toLocaleString()` 錯誤
- 在 `formatCurrency` 函式中加入 null/undefined 檢查
- 確保所有金額顯示都有預設值

### 3. Browser Extension Conflict Documentation
**Spec**: `openspec/changes/fix-dashboard-errors/specs/browser-extension-docs/spec.md`
- 文件化瀏覽器擴充套件可能造成的問題
- 提供除錯步驟和建議

## Dependencies
- 無外部依賴
- 需要存取 `lib/cache/services.ts`
- 需要修改 `app/[locale]/dashboard/DashboardClient.tsx`

## Risks and Mitigation

### 風險
1. **權限映射錯誤**：可能影響其他 API 的權限檢查
   - 緩解：僅針對 `exchange_rates:read` 新增映射，不影響現有權限

2. **資料格式化邏輯變更**：可能影響其他使用相同函式的頁面
   - 緩解：使用防護性程式設計，保持向後相容

### 測試計劃
- 驗證 `/api/exchange-rates` API 回傳 200 狀態碼
- 驗證儀表板頁面無 JavaScript 錯誤
- 驗證所有統計數據正確顯示

## Timeline
- 預計 1-2 小時完成
- 立即可開始實作

## Open Questions
- 是否需要在資料庫層面確保 `next_collection_amount` 永遠有值？
- 是否需要為所有 API 建立統一的權限命名規範？

## References
- `app/api/exchange-rates/route.ts:34` - 權限檢查位置
- `lib/cache/services.ts:119` - checkPermission 函式
- `app/[locale]/dashboard/DashboardClient.tsx:148, 172` - toLocaleString 錯誤位置
