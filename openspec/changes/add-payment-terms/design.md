# 付款條款功能設計文件

## 架構決策

### 資料模型設計

#### 選擇：獨立表 vs 嵌入 JSONB
**決定**：使用獨立的 `payment_terms` 表

**理由**：
1. **查詢效能**：需要對付款狀態和到期日進行查詢和排序
2. **資料完整性**：可以使用外鍵約束確保資料一致性
3. **擴展性**：未來可能需要新增更複雜的付款功能
4. **索引支援**：可以對特定欄位建立索引提升查詢效率

**trade-off**：
- ✅ 優點：查詢彈性、資料完整性、索引效能
- ❌ 缺點：需要 JOIN 操作、Schema 變更較複雜

### 金額計算策略

#### 選擇：前端計算 vs 後端計算 vs 資料庫觸發器
**決定**：前端即時計算 + 後端驗證和儲存

**實作流程**：
1. 前端：用戶輸入百分比時立即計算金額並顯示
2. 後端：接收請求時重新計算並儲存到資料庫
3. 資料庫：儲存計算後的金額，不使用觸發器

**理由**：
1. **用戶體驗**：前端即時計算提供即時反饋
2. **資料一致性**：後端重新計算確保資料正確
3. **維護性**：避免資料庫觸發器的複雜性

```typescript
// 前端計算
const calculateAmount = (percentage: number, total: number): number => {
  return Math.round(total * (percentage / 100) * 100) / 100
}

// 後端驗證和儲存
const savePaymentTerm = async (term: PaymentTermInput) => {
  const quotation = await getQuotation(term.quotation_id)
  const calculatedAmount = calculateAmount(term.percentage, quotation.total)

  return await db.payment_terms.create({
    ...term,
    amount: calculatedAmount  // 使用後端計算的金額
  })
}
```

### 報價單總額變更處理

#### 問題：當報價單總額變更時，付款條款金額如何更新？

**選擇**：自動重算 vs 手動更新 vs 保持不變
**決定**：自動重算，並提供警告通知

**實作**：
```typescript
// 當報價單總額變更時
const updateQuotationTotal = async (quotationId: string, newTotal: number) => {
  // 1. 更新報價單
  await db.quotations.update(quotationId, { total: newTotal })

  // 2. 重新計算所有付款條款
  const terms = await db.payment_terms.findByQuotation(quotationId)

  for (const term of terms) {
    const newAmount = calculateAmount(term.percentage, newTotal)
    await db.payment_terms.update(term.id, { amount: newAmount })
  }

  // 3. 記錄變更歷史
  await db.quotation_changes.create({
    quotation_id: quotationId,
    change_type: 'payment_terms_recalculated',
    old_total: oldTotal,
    new_total: newTotal
  })
}
```

**理由**：
- 保持金額與百分比的一致性
- 避免資料不同步
- 提供變更追蹤

### UI/UX 設計

#### 編輯模式
**組件結構**：
```
PaymentTermsEditor
├─ AddTermButton (新增期數)
├─ PaymentTermRow (可拖曳排序)
│  ├─ TermNumber (第 N 期)
│  ├─ PercentageInput (百分比輸入)
│  ├─ AmountDisplay (自動計算的金額)
│  ├─ DueDatePicker (到期日選擇器)
│  ├─ DescriptionInput (期數說明)
│  └─ DeleteButton (刪除按鈕)
└─ Summary (總百分比、總金額、警告訊息)
```

#### 顯示模式
```
PaymentTermsDisplay
├─ TermCard
│  ├─ TermInfo (期數、百分比、金額)
│  ├─ DueDate (到期日)
│  ├─ Status (付款狀態標籤)
│  └─ PaidInfo (實際付款資訊)
└─ TotalSummary (總計資訊)
```

#### 互動設計
1. **拖曳排序**：允許用戶調整期數順序（更新 `term_number`）
2. **快速模板**：提供常見的付款比例模板
   - 30%-70%（訂金-尾款）
   - 30%-50%-20%（訂金-交貨-驗收）
   - 50%-50%（頭款-尾款）
3. **百分比警告**：
   - 如果總和不等於 100%，顯示黃色警告
   - 如果總和超過 100%，顯示紅色錯誤

### 付款狀態管理

#### 狀態轉換規則
```
unpaid (未付款)
  ↓ 部分付款
partial (部分付款)
  ↓ 付清
paid (已付款)

overdue (逾期)：自動判斷（到期日 < 今天且狀態為 unpaid/partial）
```

#### 狀態更新邏輯
```typescript
const updatePaymentStatus = (term: PaymentTerm): PaymentStatus => {
  const today = new Date()
  const dueDate = new Date(term.due_date)

  if (term.paid_amount >= term.amount) {
    return 'paid'
  }

  if (term.paid_amount > 0) {
    return dueDate < today ? 'overdue' : 'partial'
  }

  return dueDate < today ? 'overdue' : 'unpaid'
}
```

### PDF 生成設計

#### 付款條款在 PDF 中的呈現
```
┌─────────────────────────────────────┐
│ 小計                    TWD 100,000 │
│ 稅金 (5%)                TWD 5,000  │
│ 總計                    TWD 105,000 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 付款條款                             │
├─────┬──────┬─────────┬──────────────┤
│ 期數 │ 比例 │ 金額    │ 到期日       │
├─────┼──────┼─────────┼──────────────┤
│ 第1期│ 30% │ 31,500  │ 2025-12-01   │
│ 第2期│ 50% │ 52,500  │ 2026-03-01   │
│ 第3期│ 20% │ 21,000  │ 2026-06-01   │
└─────┴──────┴─────────┴──────────────┘
```

### 資料庫索引策略

**必要索引**：
```sql
-- 主鍵
CREATE INDEX idx_payment_terms_quotation ON payment_terms(quotation_id);

-- 付款狀態查詢
CREATE INDEX idx_payment_terms_status ON payment_terms(payment_status);

-- 到期日查詢（用於提醒功能）
CREATE INDEX idx_payment_terms_due_date ON payment_terms(due_date);

-- 複合索引（常見查詢模式）
CREATE INDEX idx_payment_terms_quotation_term
ON payment_terms(quotation_id, term_number);
```

### 錯誤處理

#### 常見錯誤情境
1. **百分比超過 100%**：前端警告，後端不阻擋
2. **負數百分比**：前端驗證，後端拒絕
3. **刪除已付款的期數**：顯示確認對話框
4. **修改已付款期數的金額**：警告可能影響財務記錄

### 效能考量

#### 預期資料量
- 每個報價單平均 2-5 個付款期數
- 系統中約 1000-5000 個報價單
- 總付款條款記錄：5000-25000 筆

#### 最佳化策略
1. 使用資料庫索引加速查詢
2. 前端快取報價單和付款條款資料
3. 批次更新多個期數時使用事務

### 安全性考量

1. **權限控制**：只有報價單建立者和財務人員可以編輯付款條款
2. **資料驗證**：後端嚴格驗證百分比、金額等數值
3. **審計追蹤**：記錄所有付款狀態變更

## 未來擴展性

### 可能的功能擴展
1. **自動提醒**：到期日前 N 天發送提醒
2. **付款連結**：為每期生成線上付款連結
3. **匯入/匯出**：批次匯入付款記錄
4. **會計整合**：與會計系統同步付款資料
5. **幣別轉換**：支援不同幣別的分期付款

### 設計彈性
- 資料結構支援新增更多欄位（如付款方式、付款帳戶）
- UI 組件模組化，易於客製化
- API 設計RESTful，易於整合
