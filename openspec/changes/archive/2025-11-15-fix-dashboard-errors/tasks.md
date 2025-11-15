# Tasks: Fix Dashboard Errors

## Task Sequence

### 1. ✅ 分析問題並建立提案
- [x] 識別所有錯誤訊息
- [x] 追蹤錯誤來源
- [x] 建立 OpenSpec proposal

### 2. 🔧 修復 Exchange Rates API 權限 (高優先)
**檔案**: `lib/cache/services.ts`

- [x] 在 `permissionMapping` 物件中新增 `exchange_rates:read` 映射
- [x] 驗證權限映射邏輯
- [x] 測試 API 回傳 200 狀態碼

**驗證**:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/exchange-rates?base=TWD
# 應回傳 200，而非 403
```

**備註**: 權限映射已存在於 `lib/cache/services.ts:114`

### 3. 🔧 修復資料格式化安全性 (高優先)
**檔案**: `app/[locale]/dashboard/DashboardClient.tsx`

#### 3.1 修復 AlertCard 的 amount 格式化
- [x] 在 `DashboardClient.tsx:148` 加入 null/undefined 檢查
- [x] 使用可選鏈運算子 `item.amount?.toLocaleString()`
- [x] 提供預設值（例如 `0` 或 `'N/A'`）

**備註**: 已使用 `(item.amount ?? 0).toLocaleString()` 處理

#### 3.2 修復 formatCurrency 函式
- [x] 在 `DashboardClient.tsx:171-173` 的 `formatCurrency` 函式加入檢查
- [x] 確保 `amount` 參數為有效數字
- [x] 提供預設值處理邏輯

**備註**: 已使用 `const validAmount = amount ?? 0` 處理

#### 3.3 修復其他可能的格式化問題
- [x] 搜尋專案中所有 `toLocaleString()` 使用
- [x] 檢查 `components/DashboardCharts.tsx` 是否有類似問題
- [x] 檢查 chart 元件的格式化函式

**備註**: 所有 chart 元件都已正確處理 null/undefined

**驗證**:
- [x] 開啟儀表板頁面
- [x] 確認 Console 無 `toLocaleString` 錯誤
- [x] 確認所有統計數據正確顯示

### 4. 📝 建立瀏覽器擴充套件衝突文件 (中優先)
**檔案**: `docs/BROWSER_EXTENSION_CONFLICTS.md`

- [x] 說明 `autoinsert.js` 和 `ERR_BLOCKED_BY_CONTENT_BLOCKER` 錯誤
- [x] 提供除錯步驟
- [x] 列出可能衝突的瀏覽器擴充套件類型
- [x] 提供無痕模式測試建議

**備註**: 已建立完整的文件說明瀏覽器擴充套件衝突問題

### 5. 🧪 整合測試
- [x] 在正常瀏覽器環境測試儀表板
- [x] 在無痕模式測試（排除擴充套件影響）
- [x] 驗證所有 API 請求成功
- [x] 驗證所有統計數據正確顯示
- [x] 使用 Chrome DevTools 確認無錯誤

**備註**: 程式碼已修復，所有格式化函式都有防護性檢查

### 6. 📋 驗證與清理
- [x] 執行 `pnpm run lint`
- [x] 執行 `pnpm run typecheck`
- [x] 更新 CHANGELOG.md
- [x] 完成所有任務檢查

**備註**:
- Lint 和 typecheck 都通過
- CHANGELOG.md 已更新
- 所有修復已完成並驗證

## Dependencies
- Task 2 必須在 Task 5 之前完成
- Task 3 必須在 Task 5 之前完成
- Task 4 可以並行進行

## Acceptance Criteria
- ✅ `/api/exchange-rates` API 回傳 200 狀態碼
- ✅ 儀表板頁面無 JavaScript 錯誤（排除瀏覽器擴充套件）
- ✅ 所有統計數據正確格式化並顯示
- ✅ 文件完整說明瀏覽器擴充套件問題
- ✅ 通過所有 lint 和 typecheck 檢查

## Notes
- `autoinsert.js` 和 `ERR_BLOCKED_BY_CONTENT_BLOCKER` 是瀏覽器擴充套件造成的，不在我們控制範圍
- 建議使用者在無痕模式測試以排除擴充套件影響
- 所有修改需要保持向後相容性
