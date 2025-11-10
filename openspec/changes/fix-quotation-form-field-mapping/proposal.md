# 修復報價單表單欄位映射錯誤

## 問題描述

報價單建立功能無法正常運作，根本原因是前端表單發送的欄位名稱與後端 API 和資料庫 schema 不匹配：

1. **報價單總額欄位**：前端發送 `total`，但後端期望 `total_amount`
2. **項目小計欄位**：前端發送 `amount`，但後端期望 `subtotal`
3. **TypeScript 型別定義**：型別定義與實際欄位名稱不一致，導致型別系統無法捕捉此錯誤

這導致：
- 使用者無法成功建立報價單
- API 接收到 `undefined` 值，產生 `NaN` 並導致資料庫插入失敗
- 型別系統未能在編譯時發現此問題

## 影響範圍

**受影響的功能**：
- 報價單建立（`/[locale]/quotations/new`）- **嚴重**
- 報價單編輯（`/[locale]/quotations/[id]/edit`）- 已正確實作，不受影響

**受影響的檔案**：
- `app/[locale]/quotations/QuotationForm.tsx` - 前端表單
- `hooks/useQuotations.ts` - TypeScript 型別定義
- `app/api/quotations/route.ts` - 後端 API（參考用，無需修改）

## 解決方案

1. **修正前端欄位名稱**：將 `QuotationForm.tsx` 中的欄位名稱改為與後端一致
2. **修正 TypeScript 型別**：更新 `useQuotations.ts` 中的介面定義，確保型別安全
3. **驗證修復**：透過功能測試和型別檢查確保修復有效

## 優先級

**P0 - 嚴重**

理由：
- 阻礙核心業務功能（報價單建立）
- 影響所有使用者
- 修復簡單且風險低
- 預估修復時間：30-40 分鐘

## 目標

1. 使用者能成功建立報價單
2. 資料正確儲存到資料庫的 `total_amount` 和 `subtotal` 欄位
3. TypeScript 型別系統正確反映 API 契約
4. 所有相關測試通過（lint, typecheck, 功能測試）

## 成功標準

- [ ] `QuotationForm.tsx` 使用正確的欄位名稱
- [ ] TypeScript 型別定義與 API 一致
- [ ] `npm run typecheck` 無錯誤
- [ ] `npm run lint` 無錯誤
- [ ] 手動測試建立報價單成功
- [ ] 資料庫中正確儲存 `total_amount` 和 `subtotal`

## 相關規格

- `database-integration` - 資料庫結構定義
- `quotation-creation` - 報價單建立流程（需建立）

## 參考資料

- 診斷報告：`QUOTATION_FORM_BUG_DIAGNOSIS.md`
- 編輯表單參考：`app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx`（已正確實作）
