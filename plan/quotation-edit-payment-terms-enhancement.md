# 報價單編輯功能增強：付款條款編輯器

**日期**：2025-11-16
**狀態**：規劃中
**優先級**：高

---

## 規劃摘要

為報價單編輯功能添加付款條款編輯器，實現與新增報價單相同的功能（除發出日期保持唯讀外，所有欄位包括期數和金額都可編輯）。

---

## 技術選型

- **PaymentTermsEditor 組件**：已存在且在新增表單使用，直接重用
- **資料更新策略**：「刪除舊的 + 新增新的」（與現有 items 更新邏輯一致）
- **API 路由**：擴充現有 PUT /api/quotations/[id]
- **資料持久化**：Cloudflare D1（專案現有資料庫）

**選擇理由**：
1. 重用現有組件減少開發時間和維護成本
2. 保持程式碼一致性（items 和 payment_terms 使用相同更新模式）
3. 無需額外技術棧或依賴

---

## 實作階段

### 第一階段：基礎功能實作

#### 任務 1：編輯表單 UI 更新
- **檔案**：`app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx`
- **內容**：
  - 導入 `PaymentTermsEditor` 組件
  - 添加 `paymentTerms` 狀態管理（`useState<Partial<PaymentTerm>[]>`）
  - 在表單中插入付款條款區塊（放在行項目和備註之間）
  - 添加 `paymentMethod` 和 `paymentNotes` 欄位

#### 任務 2：載入現有付款條款
- **檔案**：`app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx`
- **內容**：
  - 在組件初始化時呼叫 `GET /api/quotations/[id]/payment-terms`
  - 轉換 API 回應為 `PaymentTermsEditor` 所需格式
  - 處理空資料情況（新報價單或未設定付款條款）

#### 任務 3：API 路由擴充
- **檔案**：`app/api/quotations/[id]/route.ts`
- **內容**：
  - 在 `UpdateQuotationBody` 介面加入 `payment_terms` 欄位
  - 在 PUT 處理器中添加付款條款更新邏輯：
    ```typescript
    if (payment_terms && Array.isArray(payment_terms)) {
      // 刪除舊的付款條款
      const oldTerms = await getPaymentTerms(db, id)
      for (const oldTerm of oldTerms) {
        await deletePaymentTerm(db, oldTerm.id)
      }

      // 插入新的付款條款
      for (const term of payment_terms) {
        await createPaymentTerm(db, {
          quotation_id: id,
          term_number: term.term_number,
          percentage: term.percentage,
          amount: term.amount,
          due_date: term.due_date || null,
          payment_status: 'unpaid'
        })
      }
    }
    ```

#### 任務 4：DAL 函式實作
- **檔案**：`lib/dal/payment-terms.ts`（如不存在則建立）
- **內容**：
  - `getPaymentTerms(db, quotationId)` - 查詢付款條款
  - `deletePaymentTerm(db, termId)` - 刪除單一付款條款
  - `createPaymentTerm(db, data)` - 建立付款條款

#### 任務 5：類型定義更新
- **檔案**：`types/extended.types.ts`
- **內容**：
  - 確認 `PaymentTerm` 介面完整性
  - 如需要，擴充 API 回應類型

---

### 第二階段：安全性和追蹤增強（可選）

#### 任務 6：已付款期數保護
- **檔案**：`components/payment-terms/PaymentTermRow.tsx`
- **內容**：
  - 顯示付款狀態徽章（unpaid/paid/partial/overdue）
  - 已付款的期數變更時顯示警告提示
  - 考慮將已付款期數設為唯讀（或僅允許修改到期日）

#### 任務 7：Audit Log 記錄
- **檔案**：`app/api/quotations/[id]/route.ts`
- **內容**：
  - 在更新報價單前記錄 old_values
  - 在更新後記錄 new_values
  - 包含付款條款的變更追蹤

#### 任務 8：版本歷史整合
- **檔案**：`app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx`
- **內容**：
  - 擴充 `getChanges()` 函式，追蹤 `payment_terms` 變更
  - 在版本歷史中顯示付款條款的修改記錄

---

## 潛在風險與解決方案

### 風險 1：刪除已付款的期數導致資料不一致
- **嚴重性**：高
- **解決方案**：
  - 第一階段：允許編輯，但在 UI 顯示警告訊息
  - 第二階段：已付款期數標記為唯讀或需要額外確認
  - 長期：實作 audit_logs 追蹤所有變更

### 風險 2：付款條款總百分比不等於 100%
- **嚴重性**：中
- **解決方案**：
  - `PaymentTermsEditor` 已內建 `validatePercentages` 檢查
  - 顯示警告但允許儲存（彈性處理特殊情況）

### 風險 3：API 更新失敗導致資料部分更新
- **嚴重性**：中
- **解決方案**：
  - 理想：使用資料庫 Transaction（D1 支援）
  - 實務：先更新報價單，再處理付款條款，失敗時回滾
  - 考慮使用 `db.batch()` 批次執行

### 風險 4：前端類型錯誤（PaymentTerm 介面）
- **嚴重性**：低
- **解決方案**：
  - 嚴格遵守專案 TypeScript 規範
  - 執行 `pnpm run typecheck` 確保無類型錯誤
  - 使用明確類型斷言（`as PaymentTerm`）

---

## 測試策略

### 單元測試
- 付款條款 DAL 函式（CRUD 操作）
- `validatePercentages` 函式各種輸入組合
- API 路由處理邏輯（使用 mock database）

### 整合測試
- 完整的編輯流程：載入 → 修改 → 儲存
- 錯誤處理：網路錯誤、驗證失敗、權限不足
- 邊界情況：空付款條款、單一期數、多期數

### E2E 測試（使用 Chrome DevTools）
1. **基礎流程測試**：
   - 載入編輯頁面，確認付款條款正確顯示
   - 修改期數和百分比
   - 儲存並重新載入，確認資料持久化

2. **錯誤檢查**：
   - Console 無錯誤訊息
   - Network 請求成功（200 OK）
   - 無未處理的 Promise rejection

3. **資料驗證**：
   - 檢查資料庫中 payment_terms 表記錄
   - 驗證金額計算正確性
   - 確認關聯的 quotation_id 正確

---

## 效能考量

### 資料庫查詢優化
- **現狀**：每次編輯都刪除所有舊期數再插入新期數
- **影響**：對於期數多的報價單可能有效能問題
- **優化方案**（未來考慮）：
  - 差異比對：僅更新/刪除/新增有變更的期數
  - 批次操作：使用 `db.batch()` 減少往返次數

### 前端渲染優化
- PaymentTermsEditor 已使用 React state 管理，重新渲染效能良好
- 如期數超過 10 個，考慮虛擬化列表（react-window）

### API 回應時間
- 目前設計：單次 API 呼叫完成所有更新
- 預估時間：<500ms（正常情況）
- 監控指標：使用 Cloudflare Workers Analytics

---

## 安全性考量

### 權限檢查
- ✅ 已實作：`checkPermission(kv, db, user.id, 'quotations:write')`
- ✅ 資料所有權驗證：僅允許編輯自己的報價單

### 輸入驗證
- **前端**：PaymentTermsEditor 已驗證百分比範圍（0-100）
- **後端**：需在 API 路由添加額外驗證
  - 百分比總和檢查
  - 金額正數檢查
  - 期數順序檢查

### SQL Injection 防護
- ✅ 使用參數化查詢（Drizzle ORM）
- ✅ 不使用字串拼接

### XSS 防護
- ✅ React 自動轉義輸出
- ⚠️ 注意：`description` 欄位為 JSONB，確保顯示時正確轉義

---

## 參考資料

### 業界最佳實踐
- [Invoice Payment Terms Best Practices 2024](https://www.freshbooks.com/hub/payments/invoice-payment-terms)
- [ERP Quotation Management with Versioning](https://tekvaly.com/case_study/erp-quotation-system/)

### 技術文檔
- Cloudflare D1 Database: Transactions and Batch Operations
- React useState Best Practices for Complex Objects
- TypeScript: Strict Type Checking for Financial Data

### 專案內部參考
- `app/[locale]/quotations/new/page.tsx` - 新增報價單實作
- `components/payment-terms/PaymentTermsEditor.tsx` - 付款條款組件
- `app/api/quotations/[id]/route.ts` - 現有更新邏輯
- `scripts/migrations/001_create_payment_terms.sql` - 資料庫 schema

---

## 實作檢查清單

部署前必須確認：

### 程式碼品質
- [ ] 無 TypeScript 類型錯誤（`pnpm run typecheck`）
- [ ] 無 ESLint 錯誤（`pnpm run lint`）
- [ ] 所有函式有明確類型標註
- [ ] 無使用 `any` 類型

### 功能驗證
- [ ] 編輯表單顯示現有付款條款
- [ ] 可新增/刪除/修改期數
- [ ] 百分比總和驗證正常運作
- [ ] 金額自動計算正確
- [ ] 儲存後資料正確持久化
- [ ] 發出日期（issue_date）保持唯讀

### 資料庫驗證
- [ ] payment_terms 表正確更新
- [ ] 舊期數已刪除
- [ ] 新期數已插入
- [ ] quotation_id 關聯正確

### 前端測試（Chrome DevTools）
- [ ] Console 無錯誤訊息
- [ ] Network 請求狀態正常（200 OK）
- [ ] 無未處理的 Promise rejection
- [ ] 表單驗證正常運作

### 安全性檢查
- [ ] 權限檢查正常運作
- [ ] 僅能編輯自己的報價單
- [ ] 輸入驗證防止惡意資料
- [ ] 無 SQL Injection 風險

---

## 變更歷史

### 2025-11-16
- 初始規劃完成
- 分析現有程式碼架構
- 定義實作階段和風險緩解策略
