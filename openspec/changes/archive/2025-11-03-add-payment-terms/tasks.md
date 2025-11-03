# 付款條款功能實作任務清單

## 階段一：資料層 (Database & Types)

### 1. 建立資料庫 Migration
- [ ] 建立 `payment_terms` 表的 SQL migration 檔案
- [ ] 定義表結構（欄位、類型、約束）
- [ ] 建立必要的索引
- [ ] 建立外鍵關聯到 `quotations` 表
- [ ] 測試 migration 可以成功執行和回滾

**驗證**：
```bash
# 執行 migration
npm run migrate:up

# 確認表已建立
psql -d database -c "\d payment_terms"

# 測試回滾
npm run migrate:down
```

### 2. 更新 TypeScript 類型定義
- [ ] 在 `types/database.types.ts` 新增 `payment_terms` 介面
- [ ] 定義 `PaymentTerm` Row/Insert/Update 類型
- [ ] 定義 `PaymentStatus` enum 類型
- [ ] 更新 `Quotation` 介面包含 `payment_terms` 關聯
- [ ] 執行 `npm run typecheck` 確保無錯誤

**檔案**：`types/database.types.ts`

## 階段二：後端 API (Backend APIs)

### 3. 建立付款條款 CRUD API
- [ ] `POST /api/quotations/[id]/payment-terms` - 建立付款條款
- [ ] `GET /api/quotations/[id]/payment-terms` - 取得所有付款條款
- [ ] `PUT /api/quotations/[id]/payment-terms/[termId]` - 更新付款條款
- [ ] `DELETE /api/quotations/[id]/payment-terms/[termId]` - 刪除付款條款
- [ ] `PATCH /api/quotations/[id]/payment-terms/[termId]/status` - 更新付款狀態

**驗證**：使用 Postman 或 curl 測試所有端點

### 4. 實作業務邏輯函數
- [ ] `calculateTermAmount()` - 根據百分比計算金額
- [ ] `recalculateAllTerms()` - 重算所有期數金額（當報價單總額變更時）
- [ ] `updatePaymentStatus()` - 自動判斷付款狀態（包含逾期檢查）
- [ ] `validatePercentages()` - 驗證百分比（可選警告）
- [ ] 新增單元測試覆蓋所有邏輯函數

**檔案**：`lib/services/payment-terms.ts`

### 5. 整合到報價單 API
- [ ] 修改 `GET /api/quotations/[id]` 包含付款條款資料
- [ ] 修改 `PUT /api/quotations/[id]` 當總額變更時觸發重算
- [ ] 修改 `POST /api/quotations` 支援同時建立付款條款
- [ ] 更新 API 文件說明新的回應格式

**檔案**：
- `app/api/quotations/[id]/route.ts`
- `app/api/quotations/route.ts`

## 階段三：前端組件 (Frontend Components)

### 6. 建立基礎 UI 組件
- [ ] `PaymentTermRow` - 單一付款期編輯行組件
- [ ] `PaymentTermsEditor` - 付款條款編輯器容器
- [ ] `PaymentTermsDisplay` - 只讀顯示組件
- [ ] `AddTermButton` - 新增期數按鈕組件
- [ ] 支援中英文雙語顯示

**檔案**：`components/payment-terms/`

### 7. 實作互動功能
- [ ] 百分比輸入時即時計算金額
- [ ] 拖曳排序期數功能（使用 react-beautiful-dnd 或類似）
- [ ] 新增/刪除期數
- [ ] 到期日選擇器
- [ ] 百分比總和驗證和警告提示
- [ ] 快速模板選擇（30%-70%, 30%-50%-20% 等）

### 8. 整合到報價單表單
- [ ] 在 `QuotationForm.tsx` 新增付款條款區塊
- [ ] 位置：總計之後、備註之前
- [ ] 表單提交時包含付款條款資料
- [ ] 編輯模式載入現有付款條款
- [ ] 實作儲存草稿功能

**檔案**：`app/[locale]/quotations/QuotationForm.tsx`

### 9. 整合到報價單編輯表單
- [ ] 在 `QuotationEditForm.tsx` 新增付款條款編輯
- [ ] 支援更新現有付款條款
- [ ] 當報價單總額變更時提示用戶重算
- [ ] 保存變更歷史

**檔案**：`app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx`

### 10. 整合到報價單詳情頁
- [ ] 在 `QuotationDetail.tsx` 顯示付款條款
- [ ] 顯示付款狀態標籤（使用顏色區分）
- [ ] 顯示實際付款資訊
- [ ] 財務人員可以更新付款狀態
- [ ] 記錄實際付款日期和金額

**檔案**：`app/[locale]/quotations/[id]/QuotationDetail.tsx`

## 階段四：PDF 生成 (PDF Generation)

### 11. 更新 PDF 模板
- [ ] 在 `QuotationPDFTemplate.tsx` 新增付款條款區塊
- [ ] 設計表格樣式（期數、百分比、金額、到期日）
- [ ] 支援中英文雙語
- [ ] 確保列印友善的格式

**檔案**：`lib/pdf/QuotationPDFTemplate.tsx`

### 12. PDF 生成邏輯
- [ ] 修改 `generator.ts` 包含付款條款資料
- [ ] 處理長付款條款清單的分頁
- [ ] 測試多種付款期數情境

**檔案**：`lib/pdf/generator.ts`

## 階段五：測試 (Testing)

### 13. 單元測試
- [ ] 測試金額計算函數
- [ ] 測試付款狀態判斷邏輯
- [ ] 測試百分比驗證
- [ ] 測試重算邏輯

**檔案**：`__tests__/lib/services/payment-terms.test.ts`

### 14. 整合測試
- [ ] 測試 API CRUD 操作
- [ ] 測試報價單與付款條款的關聯
- [ ] 測試權限控制
- [ ] 測試錯誤處理

**檔案**：`__tests__/api/payment-terms.test.ts`

### 15. E2E 測試
- [ ] 測試完整的建立報價單流程（包含付款條款）
- [ ] 測試編輯付款條款
- [ ] 測試更新付款狀態
- [ ] 測試 PDF 生成

**檔案**：`e2e/quotations/payment-terms.spec.ts`

## 階段六：文件與部署 (Documentation & Deployment)

### 16. 更新文件
- [ ] API 文件新增付款條款端點
- [ ] 使用者手冊新增付款條款章節
- [ ] 開發者文件說明資料結構和邏輯
- [ ] README 更新功能清單

### 17. 資料遷移（針對現有報價單）
- [ ] 建立遷移腳本（可選）
- [ ] 測試遷移腳本
- [ ] 準備回滾計劃

### 18. 部署前檢查
- [ ] 執行所有測試並確保通過
- [ ] 執行 linter 並修復所有警告
- [ ] 執行 typecheck 確保無類型錯誤
- [ ] 檢查 bundle size 變化
- [ ] Code review

### 19. 部署
- [ ] 部署到測試環境
- [ ] 執行 smoke test
- [ ] 部署到生產環境
- [ ] 監控錯誤和效能

## 依賴關係

```
階段一 (資料層)
  ↓
階段二 (後端 API)
  ↓
階段三 (前端組件) ←→ 階段四 (PDF 生成)
  ↓
階段五 (測試)
  ↓
階段六 (文件與部署)
```

## 可並行執行的任務
- 前端組件開發 (階段三) 可與 PDF 生成 (階段四) 並行
- 測試編寫 (階段五) 可在各階段開發時同步進行

## 預估時間
- 階段一：4 小時
- 階段二：8 小時
- 階段三：16 小時
- 階段四：8 小時
- 階段五：12 小時
- 階段六：4 小時
- **總計**：52 小時 (~6.5 工作天)
