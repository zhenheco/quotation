# Phase 4: 扣抵性測試補齊 + 兼營比例設定

> 日期：2026-03-06
> 狀態：待審查
> 前置：Phase 3.5 已修正 classifyPurchaseInvoices 接受 taxCodeMap

---

## 規劃摘要

1. 補齊 classifyPurchaseInvoices 的稅碼扣抵性測試（驗證 taxCodeMap 路徑）
2. 新增兼營營業人比例不得扣抵設定（company_settings → generateForm401V2 → UI）

---

## 驗收標準

- [ ] Case 1: classifyPurchaseInvoices 搭配不可扣抵稅碼 → 正確歸入 nonDeductible 分組
- [ ] Case 2: classifyPurchaseInvoices 搭配可扣抵稅碼 → 正確歸入 deductible 分組
- [ ] Case 3: classifyPurchaseInvoices 無稅碼（null） → 預設 deductible（向後相容）
- [ ] Case 4: company_settings 有 non_deductible_ratio 欄位
- [ ] Case 5: generateForm401V2 讀取公司的 non_deductible_ratio 傳入 calculateTaxAmountsV2
- [ ] Case 6: UI 顯示比例設定輸入欄位（僅 draft 模式可編輯）
- [ ] Case 7: 既有 35 測試仍然通過

---

## 測試計劃

### 新增單元測試

```
tests/unit/services/accounting/tax-report-v2.test.ts
├── describe('classifyPurchaseInvoices — taxCodeMap')  ← 新增
│   ├── it('不可扣抵稅碼 → nonDeductible 分組')
│   ├── it('可扣抵稅碼 → deductible 分組')
│   ├── it('混合稅碼 → 正確分流')
│   └── it('無稅碼 null → 預設 deductible')
```

### 既有測試

```
tests/unit/services/accounting/tax-report.test.ts (24 tests) — 必須全部通過
tests/unit/services/accounting/tax-report-v2.test.ts (11 tests) — 必須全部通過
```

---

## TDD 實作步驟

### Step 1: 補齊 classifyPurchaseInvoices taxCodeMap 測試

🔴 寫失敗測試：
- 建立含不可扣抵稅碼的 taxCodeMap
- 驗證進項歸入 nonDeductible 分組

🟢 確認測試通過（邏輯已在 Phase 3.5 實作）

🔵 重構：清理測試結構

### Step 2: company_settings 加 non_deductible_ratio

🔴 寫測試：讀取 company 設定的 non_deductible_ratio
🟢 建立 migration + DAL 查詢
🔵 重構

### Step 3: generateForm401V2 整合比例設定

🔴 寫測試：generateForm401V2 使用公司比例
🟢 修改 generateForm401V2 讀取設定
🔵 重構

### Step 4: UI 比例設定欄位

- TaxReportDashboard 加 non_deductible_ratio 輸入
- 僅在 declaration 為 draft 時可編輯
- 修改時儲存到 company_settings

---

## 預期測試覆蓋

| 層級 | 新增測試 | 既有測試 |
|------|---------|---------|
| Service | 4 | 35 |
| UI | 0 | 0 |
| **總計** | 4 | 35 |
