# 修正部署類型錯誤 - 任務清單

## Phase 1: 產品 API 類型修正

- [x] 1.1 修正 `app/api/products/route.ts` 的類型錯誤
  - [x] 更新 `CreateProductRequestBody` 使數值欄位為 `number | string`
  - [x] 修正第 103 行 `parseFloat(body.base_price)` 改為接受 `string | number`
  - [x] 移除不安全的類型斷言 (第 92 行)

- [x] 1.2 修正 `app/api/products/[id]/route.ts` 的類型錯誤
  - [x] 更新 `UpdateProductRequestBody` 與 DAL `updateProduct` 參數對齊
  - [x] 修正第 104, 112, 120 行的 `parseFloat` 類型處理
  - [x] 確保第 128 行傳遞給 `updateProduct` 的參數類型正確
  - [x] 移除不安全的類型斷言 (第 100 行)

## Phase 2: 客戶 API 類型修正

- [x] 2.1 修正 `app/api/customers/[id]/route.ts` 的類型錯誤
  - [x] 更新 `app/api/types.ts` 中的 `UpdateCustomerRequest` 類型
  - [x] 確保 `UpdateCustomerRequest` 與 DAL `updateCustomer` 參數完全對齊
  - [x] 移除第 80 行的不安全類型斷言
  - [x] 第 83 行傳遞正確類型給 `updateCustomer`

## Phase 3: 公司設定 API 類型修正

- [x] 3.1 修正 `app/api/company-settings/route.ts` 的類型錯誤
  - [x] 統一 `CompanyFormData` 類型定義
  - [x] 移除第 30 行的不安全類型斷言
  - [x] 確保 `createCompany` 和 `updateCompany` 接收正確類型

## Phase 4: 環境變數類型定義

- [x] 4.1 建立 Cloudflare Workers 環境類型
  - [x] 擴充 `types/cloudflare.d.ts` 檔案
  - [x] 定義包含 `EXCHANGE_RATE_API_KEY` 的環境類型
  - [x] 擴充 `env` 物件類型定義

- [x] 4.2 修正 `app/api/exchange-rates/sync/route.ts`
  - [x] 使用新的環境類型定義
  - [x] 修正第 95 行的類型錯誤

## Phase 5: QuotationForm 組件類型修正

- [x] 5.1 修正 `app/[locale]/quotations/QuotationForm.tsx`
  - [x] 確認第 21 行 `PaymentTerm` 類型正確導入
  - [x] 驗證 `Database['public']['Tables']['payment_terms']['Row']` 類型引用
  - [x] 驗證 `PaymentTermsEditor` 組件接收正確的 props 類型

## Phase 6: 類型安全增強

- [x] 6.1 建立類型守衛函式
  - [x] 為 API 請求體建立驗證函式（透過明確類型檢查）
  - [x] 替換不安全的 `as` 斷言為類型守衛

- [x] 6.2 統一 API 類型定義
  - [x] 審查所有 `app/api/types.ts` 中的類型
  - [x] 確保與 DAL 函式參數一致

## Phase 7: 建置和部署驗證

- [x] 7.1 本地建置測試
  - [x] 執行 `pnpm run build`
  - [x] 確認建置成功（Next.js 編譯通過）
  - [x] 執行 `pnpm run lint`（本地通過）

- [ ] 7.2 部署測試
  - [ ] 推送到 GitHub 觸發 CI/CD
  - [ ] 驗證 Cloudflare Workers 部署成功
  - [ ] 測試所有 API 端點功能正常

## Phase 8: 文件更新

- [ ] 8.1 更新部署檢查清單
  - [ ] 在 `DEPLOYMENT_CHECKLIST.md` 新增類型檢查步驟
  - [ ] 記錄常見類型錯誤和解決方案

- [ ] 8.2 更新編碼規範
  - [ ] 在 `CLAUDE.md` 強化類型安全要求
  - [ ] 新增類型斷言使用指南

---

## 驗收標準

所有任務完成後，必須滿足：

1. ✅ 無 TypeScript 編譯錯誤
2. ✅ 無 ESLint 類型相關警告
3. ✅ Cloudflare Workers 部署成功
4. ✅ 所有 API 端點回應正常
5. ✅ 前端組件正常運作
6. ✅ 無使用不安全的 `as` 斷言 (除非有充分理由並註記)

## 預估時間

- Phase 1-3: 1.5 小時
- Phase 4-5: 1 小時
- Phase 6: 0.5 小時
- Phase 7: 1 小時
- Phase 8: 0.5 小時

**總計**: 4.5 小時
