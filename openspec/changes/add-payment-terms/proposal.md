# 新增報價單付款條款功能

## 變更 ID
`add-payment-terms`

## 概述
在報價單中新增付款條款區塊，允許用戶自訂分期付款計劃，包括期數、每期百分比、對應金額、到期日和付款狀態追蹤。

## 動機
目前報價單系統缺乏靈活的付款條款管理功能。許多商業合約需要分期付款（如：訂金 30%、交貨 50%、驗收 20%），但現有系統只能記錄簡單的訂金和尾款資訊。

### 商業需求
1. **靈活的分期設定**：支援任意期數的付款計劃
2. **自動計算金額**：根據百分比自動計算每期應付金額
3. **付款追蹤**：記錄每期的付款狀態和實際付款日期
4. **到期日管理**：為每期設定到期日，方便財務追蹤
5. **報表輸出**：付款條款需要顯示在 PDF 報價單中

## 使用者故事

### 建立付款條款
**身為** 業務人員
**我希望** 在建立報價單時能設定分期付款計劃
**以便** 為客戶提供靈活的付款選擇

**驗收標準**：
- 可以新增任意數量的付款期數
- 每期可設定百分比（例如 30%、50%、20%）
- 系統自動計算每期的金額
- 可設定每期的到期日
- 百分比總和不強制等於 100%

### 查看付款計劃
**身為** 財務人員
**我希望** 能清楚看到每期的付款資訊
**以便** 追蹤收款進度

**驗收標準**：
- 顯示所有期數的詳細資訊
- 顯示每期的付款狀態（未付款/部分付款/已付款/逾期）
- 可以查看實際付款日期

### 更新付款狀態
**身為** 財務人員
**我希望** 能標記某期款項為已付款
**以便** 保持準確的財務記錄

**驗收標準**：
- 可以更新每期的付款狀態
- 可以記錄實際付款日期
- 可以記錄實際付款金額（如果與預期不同）

## 範圍

### 包含在此變更中
1. 資料庫 Schema 變更
   - 新增 `payment_terms` 表
   - 與 `quotations` 表建立關聯

2. API 端點
   - 建立付款條款 CRUD 操作
   - 整合到報價單 API

3. 前端 UI
   - 報價單表單中的付款條款編輯器
   - 付款條款顯示區塊
   - 百分比和金額的即時計算

4. PDF 生成
   - 在 PDF 報價單中顯示付款條款

### 不包含在此變更中
1. 自動提醒功能（到期日提醒）
2. 付款記錄匯入/匯出
3. 與會計系統整合
4. 付款連結生成

## 技術實作概要

### 資料庫設計
```typescript
interface PaymentTerm {
  id: string
  quotation_id: string
  term_number: number          // 第幾期（1, 2, 3...）
  percentage: number           // 百分比（0-100）
  amount: number               // 計算出的金額
  due_date: string | null      // 到期日
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  paid_amount: number | null   // 實際已付金額
  paid_date: string | null     // 實際付款日期
  description: JSONB           // 期數描述 { zh: string, en: string }
  created_at: string
  updated_at: string
}
```

### UI 組件
1. **PaymentTermsEditor**：編輯付款條款的表單
2. **PaymentTermsDisplay**：只讀顯示付款條款
3. **PaymentTermRow**：單一付款期的編輯行

### 計算邏輯
```typescript
// 自動計算每期金額
term.amount = quotation.total * (term.percentage / 100)

// 驗證（可選）
const totalPercentage = terms.reduce((sum, term) => sum + term.percentage, 0)
if (totalPercentage !== 100) {
  showWarning('付款百分比總和不等於 100%')
}
```

## 依賴性
- 依賴現有的報價單系統
- 需要 `quotations` 表的 `total` 欄位
- 需要 PDF 生成器支援新的區塊

## 風險與考量

### 資料一致性
- 當報價單總金額變更時，需要重新計算所有期數的金額
- 解決方案：在報價單更新時觸發重算邏輯

### UI 複雜度
- 多期數的表單可能較複雜
- 解決方案：提供直觀的新增/刪除期數按鈕，預設顯示常見模板（如 30%-70%）

### 向後相容性
- 現有報價單沒有付款條款資料
- 解決方案：付款條款為可選功能，不影響現有報價單

## 測試策略
1. 單元測試：金額計算邏輯
2. 整合測試：API CRUD 操作
3. E2E 測試：完整的建立報價單流程
4. 手動測試：PDF 生成結果

## 文件需求
1. API 文件更新
2. 使用者手冊新增付款條款章節
3. 開發者文件說明資料結構

## 時程估算
- 資料庫 Schema：0.5 天
- API 開發：1 天
- 前端 UI：2 天
- PDF 整合：1 天
- 測試和調整：1 天
- **總計**：5.5 天

## 相關資源
- 現有報價單表單：`app/[locale]/quotations/QuotationForm.tsx`
- 資料庫類型：`types/database.types.ts`
- PDF 模板：`lib/pdf/QuotationPDFTemplate.tsx`
