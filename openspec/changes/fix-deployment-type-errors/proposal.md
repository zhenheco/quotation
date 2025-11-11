# 修正部署類型錯誤

## 概述

修正 Cloudflare Workers 部署時發生的 TypeScript 類型錯誤，確保所有 API 路由和組件的類型定義正確且一致。

## 動機

目前專案在部署到 Cloudflare Workers 時遇到多個 TypeScript 類型錯誤，導致建置失敗。這些錯誤主要集中在：

1. **產品 API 類型不匹配**：`parseFloat()` 回傳 `number`，但被當作 `string` 傳遞
2. **請求體類型轉換不安全**：使用 `as` 斷言從 `Record<string, unknown>` 轉換
3. **DAL 函式參數類型不匹配**：API 請求類型與 DAL 期望類型不一致
4. **環境變數類型缺失**：`EXCHANGE_RATE_API_KEY` 未在環境類型中定義
5. **組件類型定義不完整**：`QuotationForm` 中缺少 `Row` 類型定義

## 目標

1. 修正所有 API 路由的類型錯誤
2. 統一請求體和 DAL 之間的類型定義
3. 完善環境變數類型定義
4. 確保所有組件類型完整且正確
5. 通過 `pnpm run build` 和 TypeScript 檢查

## 影響範圍

### 修改的檔案

- `app/api/products/route.ts`
- `app/api/products/[id]/route.ts`
- `app/api/customers/[id]/route.ts`
- `app/api/company-settings/route.ts`
- `app/api/exchange-rates/sync/route.ts`
- `app/[locale]/quotations/QuotationForm.tsx`
- `app/api/types.ts`
- `types/cloudflare.d.ts` (新增)

### 不影響的功能

- 現有 API 行為保持不變
- 資料庫 schema 不變
- 使用者介面不變

## 替代方案

1. **忽略類型錯誤**：使用 `@ts-ignore` 或停用嚴格模式
   - ❌ 會降低程式碼品質和型別安全性

2. **重構所有 DAL 函式**：改變 DAL 函式的參數類型以匹配 API
   - ❌ 影響範圍過大，風險高

3. **統一類型定義** (選擇此方案)
   - ✅ 保持型別安全
   - ✅ 最小化程式碼變更
   - ✅ 提升長期維護性

## 實作計畫

### Phase 1: 修正產品 API 類型錯誤
- 統一 `CreateProductRequestBody` 和 `UpdateProductRequestBody` 與 DAL 期望類型
- 修正 `parseFloat()` 類型處理

### Phase 2: 修正客戶 API 類型錯誤
- 建立 `UpdateCustomerRequest` 類型與 DAL `updateCustomer` 參數對齊

### Phase 3: 修正公司設定 API 類型錯誤
- 統一 `CompanyFormData` 類型定義

### Phase 4: 修正環境變數類型
- 建立 Cloudflare Workers 環境類型定義

### Phase 5: 修正 QuotationForm 組件類型
- 補充缺失的 `PaymentTerm` 類型引用

## 成功指標

- [ ] `pnpm run build` 無錯誤
- [ ] `pnpm run typecheck` 無錯誤
- [ ] Cloudflare Workers 部署成功
- [ ] 所有 API 路由正常運作
- [ ] 無型別斷言警告

## 風險評估

### 低風險
- 類型定義修正不影響執行時行為
- 所有變更向後相容

### 緩解措施
- 每個 API 路由修正後立即測試
- 部署前執行完整的建置檢查

## 時程

- 準備時間：1 小時 (分析所有類型錯誤)
- 實作時間：2 小時 (修正所有檔案)
- 測試時間：1 小時 (建置和部署測試)
- 總計：4 小時

## 相依性

- 無外部相依性
- 不需要資料庫遷移
- 不需要環境變數變更 (僅添加類型定義)

## 文件更新

- 更新 `DEPLOYMENT_CHECKLIST.md` 記錄類型檢查要求
- 在 `CLAUDE.md` 中強化類型安全規範

---

**提案狀態**: Draft
**建立日期**: 2025-11-11
**預計完成**: 2025-11-11
