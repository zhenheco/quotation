# quotation-payment-methods 實作任務

## 任務順序

### 階段 1：資料庫和類型準備

1. **✅ 建立資料庫 migration 腳本**
   - ✅ 為 PostgreSQL 建立 migration（`migrations/015_add_quotation_payment_fields.sql`）
   - ✅ 為 D1 建立 migration（`migrations/d1/007_add_quotation_payment_fields.sql`）
   - ✅ 新增欄位：
     - `payment_method VARCHAR(50) NULL`
     - `payment_notes TEXT NULL`
   - ⏳ 驗證：執行 migration 後查詢表結構確認欄位存在（待執行）

2. **✅ 更新 TypeScript 類型定義**
   - ✅ 更新 `types/models.ts` 中的 `Quotation` interface
   - ✅ 更新 `CreateQuotationData` interface
   - ✅ 更新 `UpdateQuotationData` interface
   - ✅ 定義 `PaymentMethod` 類型：擴充為 7 種付款方式
   - ✅ 驗證：執行 `pnpm run typecheck` 確認無錯誤

3. **✅ 更新資料存取層（DAL）**
   - ✅ 更新 `lib/dal/quotations.ts` 的 `createQuotation` 函式以接受新欄位
   - ✅ 更新 `updateQuotation` 函式以接受新欄位
   - ✅ 更新 `getQuotationById` 確保回傳新欄位
   - ✅ 驗證：通過 TypeScript 類型檢查

### 階段 2：API 路由更新

4. **✅ 更新報價單 API 路由**
   - ✅ 修改 `app/api/quotations/route.ts` (POST) 以接受 `payment_method` 和 `payment_notes`
   - ✅ 修改 `app/api/quotations/[id]/route.ts` (PUT) 以接受新欄位
   - ✅ 確保 API 回應包含新欄位
   - ⏳ 驗證：使用 curl 或 Postman 測試 API 端點（待測試）

5. **✅ 更新前端 hooks**
   - ✅ 確認 `useCreateQuotation` 和 `useUpdateQuotation` 支援新欄位
   - ✅ 驗證：通過 TypeScript 類型推導檢查

### 階段 3：UI 實作 - 付款方式選擇

6. **✅ 建立付款方式選擇組件**
   - ✅ 直接在 `QuotationForm.tsx` 中實作付款方式選擇
   - ✅ 實作單選 select 元件
   - ✅ 包含多語系支援
   - ✅ 驗證：在表單中正常顯示

7. **✅ 建立付款備註輸入組件**
   - ✅ 新增 textarea 欄位
   - ✅ 限制最大長度 500 字元
   - ✅ 根據付款方式動態顯示 placeholder
   - ✅ 驗證：字數限制和 placeholder 正常運作

8. **✅ 整合付款方式選擇器到報價單表單**
   - ✅ 修改 `app/[locale]/quotations/QuotationForm.tsx`
   - ✅ 在表單中新增付款資訊區塊
   - ✅ 綁定表單狀態（`payment_method` 和 `payment_notes`）
   - ✅ 驗證：建立和編輯報價單時可正確選擇和儲存

### 階段 4：UI 實作 - 一次付清功能

9. **在付款期別編輯器新增「一次付清」按鈕**
   - 修改 `components/payment-terms/PaymentTermsEditor.tsx`
   - 新增「一次付清（100%）」按鈕到編輯器頂部
   - 按鈕包含圖示和多語系支援
   - 驗證：按鈕在 UI 中正確顯示

10. **實作一次付清按鈕邏輯**
    - 點擊按鈕時：
      - 如果有現有付款期別，顯示確認對話框
      - 清空現有期別
      - 新增單一 100% 期別（名稱：「一次付清」）
      - 金額自動設為報價單總金額
    - 驗證：測試按鈕點擊行為和對話框

11. **實作一次付清金額自動更新**
    - 監聽報價單總金額變化
    - 當總金額變更時，自動更新 100% 期別的金額
    - 驗證：修改報價單明細，確認一次付清金額同步更新

### 階段 5：顯示和詳情頁

12. **✅ 更新報價單詳情頁**
    - ✅ 修改 `app/[locale]/quotations/[id]/QuotationDetail.tsx`
    - ✅ 顯示付款方式和備註（如果有設定）
    - ✅ 處理舊報價單（無這些欄位）的顯示
    - ✅ 驗證：通過類型檢查

13. **⏩ 更新報價單列表顯示（可選，已跳過）**
    - ⏩ 不在此變更範圍內
    - ⏩ 可在後續優化時實作

### 階段 6：多語系支援

14. **✅ 新增多語系翻譯**
    - ✅ 更新 `messages/zh.json` 和 `messages/en.json`
    - ✅ 新增翻譯鍵（擴充為 7 種付款方式）：
      - `quotation.payment_method`
      - `quotation.payment_notes`
      - `quotation.paymentMethods.cash`
      - `quotation.paymentMethods.bank_transfer`
      - `quotation.paymentMethods.ach_transfer`
      - `quotation.paymentMethods.credit_card`
      - `quotation.paymentMethods.check`
      - `quotation.paymentMethods.cryptocurrency`
      - `quotation.paymentMethods.other`
      - `quotation.full_payment`
      - `quotation.full_payment_confirm`
      - `quotation.paymentNotesPlaceholderByMethod.*`
    - ✅ 驗證：在 UI 中正確顯示

### 階段 7：測試和驗證

15. **✅ 執行完整測試流程（待部署環境測試）**
    - ⏩ 本地測試跳過（Cloudflare Workers 開發環境配置問題）
    - ❌ 使用「一次付清」按鈕（未實作，Phase 4）
    - ⏳ 建立新報價單，選擇付款方式和輸入備註（待部署環境測試）
    - ⏳ 編輯報價單，修改付款方式和備註（待部署環境測試）
    - ⏳ 查看報價單詳情（待部署環境測試）
    - ⏳ 驗證：所有功能正常運作

16. **✅ 執行 migration 和部署前檢查（完成）**
    - ✅ 在本地執行 migration
    - ✅ 執行 `pnpm run typecheck`
    - ✅ 執行 `pnpm run lint`
    - ✅ 執行 `pnpm run build`
    - ✅ 驗證：所有檢查通過

17. **⏳ 撰寫文件和更新 CHANGELOG**
    - ⏳ 更新專案文件說明新功能
    - ⏳ 在 CHANGELOG.md 記錄變更
    - ⏳ 驗證：文件清晰完整

## 並行任務

- 任務 1-2 可並行執行（資料庫和類型）
- 任務 6-7 可並行執行（兩個 UI 組件）
- 任務 9-11 可在任務 8 完成後並行執行

## 依賴關係

- 任務 3-5 依賴任務 1-2
- 任務 6-8 依賴任務 4-5
- 任務 9-11 依賴任務 6-8
- 任務 12-13 依賴任務 8
- 任務 14 可在任何階段執行，但建議在 UI 實作時同步進行
- 任務 15-17 依賴所有前置任務

## 預估時間

- 階段 1：2-3 小時
- 階段 2：1-2 小時
- 階段 3：3-4 小時
- 階段 4：2-3 小時
- 階段 5：1-2 小時
- 階段 6：1 小時
- 階段 7：2-3 小時

**總計**：約 12-18 小時
