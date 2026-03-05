# Phase 3: Form401 V2 整合（Service → API → UI）

> 日期：2026-03-06
> 狀態：待審查
> 前置：Phase 1 V2 計算函數已寫好, Phase 2 發票匯入完成

---

## 規劃摘要

將已完成的 V2 計算邏輯（`calculateTaxAmountsV2`, `classifyPurchaseInvoices`）整合到完整的 Form401 產出流程：

1. 擴充 `Form401Data` → `Form401DataV2`（含固資分離、退折讓、作廢）
2. 修改 `generateForm401` 使用 V2 計算邏輯 + `declared_period_id` 篩選
3. UI 顯示 V2 結構（固資分離表、退折讓區塊、完整稅額公式）

---

## 驗收標準

- [ ] Case 1: API 返回 V2 格式（含 goodsAndExpenses, fixedAssets, returnsAndAllowances）
- [ ] Case 2: 稅額計算使用 V2 公式（含留抵、退折讓、固資、比例不得扣抵）
- [ ] Case 3: UI 進項表分為「進貨及費用」和「固定資產」兩區
- [ ] Case 4: UI 顯示退出折讓區塊
- [ ] Case 5: UI 稅額公式完整顯示（銷項 - 可扣抵 - 留抵 + 退折讓）
- [ ] Case 6: 作廢發票在明細中標記但不計入金額
- [ ] Case 7: declared_period_id 篩選優先，fallback 到 invoice_date
- [ ] Case 8: 既有 V1 測試仍然通過（向後相容）

---

## 測試計劃

### 單元測試

```
tests/unit/services/accounting/tax-report-v2.test.ts
├── describe('generateForm401V2')    ← 新增
│   ├── it('用 declared_period_id 篩選發票')
│   ├── it('declared_period_id NULL 時 fallback')
│   ├── it('返回 V2 purchases 結構')
│   ├── it('返回退折讓區塊')
│   └── it('作廢發票列入但金額=0')
```

### 既有測試

```
tests/unit/services/accounting/tax-report.test.ts (24 tests) — 必須全部通過
tests/unit/services/accounting/tax-report-v2.test.ts (11 tests) — 必須全部通過
```

---

## TDD 實作步驟

### Step 1: 擴充 Form401Data 型別 + Service generateForm401V2
- 新增 Form401DataV2 interface（或擴充 Form401Data）
- 實作 generateForm401V2 使用 classifyPurchaseInvoices + calculateTaxAmountsV2
- 支援 declared_period_id 篩選

### Step 2: API 層整合
- 修改 tax report API 支援 V2 格式
- 當提供 declaration_id 時使用 V2 邏輯

### Step 3: UI 升級 TaxSummarySection
- 進項表分為「進貨及費用」和「固定資產」
- 退出折讓區塊
- 稅額計算完整公式
- 作廢發票標記

---

## 預期測試覆蓋

| 層級 | 新增測試 | 既有測試 |
|------|---------|---------|
| Service | 5 | 35 (24+11) |
| UI | 0 | 0 |
| **總計** | 5 | 35 |
