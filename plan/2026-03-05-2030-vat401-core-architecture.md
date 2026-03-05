# Phase 1: 401 營業稅核心架構修補

> 日期：2026-03-05
> 狀態：待實作
> CC + Gemini 交叉審查：R1 (9.0, 4🔴) → R2 (8.5, 3🔴) → R3 (9.5, 0🔴) ✅ PASSED

---

## 規劃摘要

修補 401 營業稅申報的 6 個核心缺口，使系統能支撐實際報稅需求：
1. `declared_period_id`（申報期別）與 `invoice_date`（所屬期別）分離
2. `tax_declarations` 表 + 留抵稅額結轉
3. 進項「進貨及費用」vs「固定資產」分離
4. 退出/折讓處理（格式代號 23/24/33/34）
5. 作廢發票在媒體檔的處理
6. 401 計算邏輯改用 `declared_period_id`

---

## 驗收標準

### 稅額計算

- [ ] Case 1: 基本計算（銷項2.5萬-進項1.5萬=應納1萬）
- [ ] Case 2: 留抵結轉（上期留抵5000+本期進項3萬-銷項2萬=留抵1.5萬）
- [ ] Case 3: 固定資產分離顯示（扣抵代號 1 vs 3）
- [ ] Case 4: 退出折讓（銷項5萬-退回5000=4.5萬，媒體檔格式代號33）
- [ ] Case 5: 作廢發票（媒體檔保留字軌，金額=0）
- [ ] Case 6: 跨期扣抵（2025/11發票在2026年1-2月申報）
- [ ] Case 7: 營所稅查詢（用 invoice_date 篩選整年，忽略 declared_period_id）

### 媒體申報檔

- [ ] Case 8: 按格式代號彙總份數正確
- [ ] Case 9: 退出折讓格式代號 33/34/23/24 正確
- [ ] Case 10: 混合媒體檔（進項+銷項+退出+作廢）81-byte 驗證通過

### 資料完整性

- [ ] Case 11: 同一張發票不能被分配到多個 declared_period_id
- [ ] Case 12: 已 submitted 的 tax_declarations 不能再修改
- [ ] Case 13: 留抵稅額不能為負數
- [ ] Case 14: declared_period_id 為 NULL 時 fallback 到 invoice_date 篩選
- [ ] Case 15: 已 submitted 期別的發票不能被修改/刪除（鎖定機制）
- [ ] Case 16: 留抵連續性校驗（本期 opening == 上期 closing）
- [ ] Case 17: 單筆不可扣抵（交際費）+ 比例不可扣抵（兼營）分開計算

---

## 測試計劃

### 單元測試（Service 層，覆蓋率 > 90%）

```
tests/unit/services/accounting/tax-report-v2.test.ts
├── describe('calculateTaxAmountsV2')
│   ├── it('基本計算：銷項-進項=應納稅額')
│   ├── it('留抵結轉：上期留抵正確扣除')
│   ├── it('留抵產生：進項>銷項時產生新留抵')
│   ├── it('固定資產分離：進貨費用 vs 固定資產')
│   ├── it('退出折讓：銷項退回正確扣減')
│   ├── it('退出折讓：進項退出正確扣減')
│   ├── it('單筆不得扣抵：排除交際費等不可扣抵進項')
│   ├── it('比例不得扣抵：兼營營業人比例計算')
│   ├── it('混合不得扣抵：單筆+比例同時存在')
│   └── it('混合場景：留抵+退出+固資+不得扣抵')
├── describe('generateForm401V2')
│   ├── it('用 declared_period_id 篩選發票')
│   ├── it('declared_period_id 為 NULL 時 fallback')
│   ├── it('跨期發票正確歸入指定期別')
│   └── it('作廢發票不計入金額')
└── describe('getAnnualRevenueForIncomeTax')
    ├── it('用 invoice_date 篩選整年銷項')
    ├── it('扣除銷貨退回折讓')
    └── it('不受 declared_period_id 影響')
```

### 單元測試（媒體檔，覆蓋率 > 85%）

```
tests/unit/services/accounting/media-file-generator-v2.test.ts
├── describe('generateMediaLine')
│   ├── it('退出折讓：使用格式代號 33')
│   ├── it('進項退出：使用格式代號 23')
│   ├── it('作廢發票：金額0+保留字軌')
│   ├── it('固定資產：扣抵代號 3')
│   └── it('不得扣抵固資：扣抵代號 4')
├── describe('generateMediaFile')
│   ├── it('混合發票類型產生正確媒體檔')
│   ├── it('彙總份數計算正確')
│   └── it('總筆數與金額加總正確')
└── describe('validateMediaFile')
    ├── it('正確媒體檔驗證通過')
    └── it('長度錯誤的媒體檔驗證失敗')
```

### 單元測試（DAL 層，覆蓋率 > 80%）

```
tests/unit/dal/accounting/tax-declarations.test.ts
├── describe('createTaxDeclaration')
├── describe('getTaxDeclaration')
├── describe('getLatestClosedDeclaration')  // 取上期留抵
├── describe('updateTaxDeclaration')
├── describe('submitTaxDeclaration')        // 狀態鎖定 + 關聯發票鎖定
├── describe('reopenTaxDeclaration')
├── describe('validateDeclarationContinuity')  // 留抵連續性校驗
└── describe('invoiceLocking')                  // submitted 期別發票不可改/刪
```

### 整合測試（API 層，覆蓋率 > 75%）

```
tests/integration/api/accounting/tax-declarations.test.ts
├── describe('POST /api/accounting/tax-declarations')
├── describe('GET /api/accounting/tax-declarations/:id')
├── describe('PUT /api/accounting/tax-declarations/:id/submit')
└── describe('GET /api/accounting/reports/tax with declared_period_id')
```

---

## TDD 實作步驟

### Step 1: DB Migration（紅燈 → 綠燈 → 重構）

**1a. 新增 `acc_invoices` 欄位**

```sql
-- migrations/0XX_add_invoice_declaration_fields.sql

-- 申報期別（指向 tax_declarations）
ALTER TABLE acc_invoices
  ADD COLUMN declared_period_id uuid REFERENCES tax_declarations(id);

-- 歷史匯入標記
ALTER TABLE acc_invoices
  ADD COLUMN is_historical_import boolean DEFAULT false;

-- 固定資產標記
ALTER TABLE acc_invoices
  ADD COLUMN is_fixed_asset boolean DEFAULT false;

-- 退出/折讓類型
ALTER TABLE acc_invoices
  ADD COLUMN return_type text DEFAULT 'NONE'
  CHECK (return_type IN ('NONE', 'RETURN', 'ALLOWANCE'));

-- 折讓/退回原發票日期及號碼（跨月折讓時需要，媒體檔必填）
ALTER TABLE acc_invoices
  ADD COLUMN original_invoice_date date;

ALTER TABLE acc_invoices
  ADD COLUMN original_invoice_number text;  -- 10碼，如 AB12345678

-- 索引
CREATE INDEX idx_acc_invoices_declared_period
  ON acc_invoices(declared_period_id) WHERE declared_period_id IS NOT NULL;

CREATE INDEX idx_acc_invoices_return_type
  ON acc_invoices(return_type) WHERE return_type != 'NONE';
```

**1b. 建立 `tax_declarations` 表**

```sql
-- migrations/0XX_create_tax_declarations.sql

CREATE TABLE tax_declarations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id),

  -- 期別
  period_year int NOT NULL,           -- 西元年
  period_bi_month int NOT NULL        -- 1-6（雙月期）
    CHECK (period_bi_month BETWEEN 1 AND 6),

  -- 狀態
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'closed')),

  -- 留抵稅額
  opening_offset_amount int NOT NULL DEFAULT 0  -- 上期結轉留抵
    CHECK (opening_offset_amount >= 0),

  -- 本期稅額
  current_output_tax int NOT NULL DEFAULT 0,    -- 銷項稅額
  current_input_tax int NOT NULL DEFAULT 0,     -- 進項稅額（可扣抵）
  fixed_asset_input_tax int NOT NULL DEFAULT 0, -- 固定資產進項稅額
  return_allowance_tax int NOT NULL DEFAULT 0,  -- 退出折讓調整
  non_deductible_tax int NOT NULL DEFAULT 0,    -- 不得扣抵稅額

  -- 計算結果
  net_payable_amount int NOT NULL DEFAULT 0,    -- 應納稅額（正=繳稅）
  closing_offset_amount int NOT NULL DEFAULT 0  -- 本期結存留抵
    CHECK (closing_offset_amount >= 0),

  -- 統計
  sales_invoice_count int NOT NULL DEFAULT 0,
  purchase_invoice_count int NOT NULL DEFAULT 0,

  -- 時間戳
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- 唯一約束
  UNIQUE(company_id, period_year, period_bi_month)
);

-- RLS
ALTER TABLE tax_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tax_declarations_company_isolation ON tax_declarations
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- 索引
CREATE INDEX idx_tax_declarations_company_period
  ON tax_declarations(company_id, period_year, period_bi_month);
```

**1c. 資料遷移：現有發票自動填入**

```sql
-- 為現有 POSTED 發票自動建立對應的 tax_declarations
-- 並設定 declared_period_id（向後相容，不影響現有邏輯）
-- 此 migration 僅建立結構，不強制填入（允許 NULL fallback）
```

---

### Step 2: DAL 層

**2a. 新建 `tax-declarations.dal.ts`**

| 函數 | 說明 |
|------|------|
| `createTaxDeclaration(db, input)` | 建立新期別 |
| `getTaxDeclaration(db, id)` | 取得單一期別 |
| `getTaxDeclarationByPeriod(db, companyId, year, biMonth)` | 按期別查詢 |
| `getOrCreateTaxDeclaration(db, companyId, year, biMonth)` | 取得或自動建立 |
| `getLatestClosedDeclaration(db, companyId, beforeYear, beforeBiMonth)` | 取上期留抵 |
| `updateTaxDeclaration(db, id, data)` | 更新（僅 draft 狀態） |
| `submitTaxDeclaration(db, id)` | 送出（鎖定本期+關聯發票） |
| `reopenTaxDeclaration(db, id)` | 重新開啟 |
| `listTaxDeclarations(db, companyId, options)` | 列表查詢 |
| `validateDeclarationContinuity(db, companyId, year, biMonth)` | 校驗留抵連續性 |

**2b. 修改 `invoices.dal.ts`**

| 新增/修改 | 說明 |
|----------|------|
| `getInvoicesByDeclarationId(db, declarationId)` | 按申報期別查詢 |
| `assignInvoiceToDeclaration(db, invoiceId, declarationId)` | 分配發票到期別（檢查目標期別狀態） |
| `getUnassignedInvoices(db, companyId)` | 查詢未分配期別的發票 |
| 修改 `getInvoices` | 支援 `declared_period_id` 篩選 |
| 修改 `updateInvoice` | **鎖定檢查**：若 declared_period_id 的 status = submitted/closed 則拒絕修改 |
| 修改 `deleteInvoice` | **鎖定檢查**：同上 |

---

### Step 3: Service 層（核心計算邏輯）

**3a. 修改 `tax-report.service.ts`**

```typescript
// 新增 Form401DataV2 type（擴充現有 Form401Data）
export interface Form401DataV2 extends Omit<Form401Data, 'purchases' | 'taxCalculation'> {
  purchases: {
    // 進貨及費用（可扣抵）
    goodsAndExpenses: {
      deductible: { count: number; untaxedAmount: number; taxAmount: number; invoices: InvoiceDetail[] }
      nonDeductible: { count: number; untaxedAmount: number; taxAmount: number; invoices: InvoiceDetail[] }
    }
    // 固定資產
    fixedAssets: {
      deductible: { count: number; untaxedAmount: number; taxAmount: number; invoices: InvoiceDetail[] }
      nonDeductible: { count: number; untaxedAmount: number; taxAmount: number; invoices: InvoiceDetail[] }
    }
    // 免稅進項（401 表第 36 欄）
    exempt: { count: number; untaxedAmount: number; invoices: InvoiceDetail[] }
    // 零稅率進項（401 表第 38 欄）
    zeroRate: { count: number; untaxedAmount: number; invoices: InvoiceDetail[] }
  }

  // 退出折讓
  returnsAndAllowances: {
    salesReturns: { count: number; amount: number; tax: number; invoices: InvoiceDetail[] }
    purchaseReturns: { count: number; amount: number; tax: number; invoices: InvoiceDetail[] }
  }

  // 作廢發票
  voidedInvoices: { count: number; invoices: InvoiceDetail[] }

  // 稅額計算（擴充）
  taxCalculation: {
    outputTax: number
    inputTax: number              // 進貨費用可扣抵
    fixedAssetInputTax: number    // 固定資產可扣抵
    returnAllowanceTax: number    // 退出折讓調整
    nonDeductibleTax: number      // 不得扣抵
    openingOffset: number         // 上期留抵
    netTax: number                // 應納（退）稅額
    closingOffset: number         // 本期結存留抵
    isRefund: boolean
  }

  // 申報期別資訊
  declaration: {
    id: string
    status: 'draft' | 'submitted' | 'closed'
  }
}
```

**3b. 核心計算公式實作**

```typescript
export function calculateTaxAmountsV2(params: {
  outputTax: number           // 銷項稅額
  inputTax: number            // 進貨費用進項稅額（已排除單筆不可扣抵）
  fixedAssetInputTax: number  // 固定資產進項稅額（已排除單筆不可扣抵）
  returnAllowanceTax: number  // 退出折讓稅額
  openingOffset: number       // 上期留抵
  itemNonDeductibleTax: number // 單筆不可扣抵稅額（交際費、酬勞等）
  nonDeductibleRatio?: number  // 兼營營業人比例不可扣抵（0-1）
}): TaxCalculationResultV2 {
  // 1. inputTax / fixedAssetInputTax 已經只包含「可扣抵」進項（DAL 層排除 deduction_code 2/4）
  // 2. 對可扣抵進項套用兼營營業人比例不可扣抵
  const totalDeductibleInputTax = params.inputTax + params.fixedAssetInputTax
  const ratioNonDeductibleTax = params.nonDeductibleRatio
    ? Math.round(totalDeductibleInputTax * params.nonDeductibleRatio)
    : 0

  // 公式：應納稅額 = 銷項 - (可扣抵進項 - 比例不得扣抵) - 上期留抵 + 退出折讓調整
  // 注意：itemNonDeductibleTax 僅用於報表顯示，不參與 netTax 計算（因已在 DAL 排除）
  const netDeductibleInput = totalDeductibleInputTax - ratioNonDeductibleTax
  const netTax = params.outputTax
    - netDeductibleInput
    - params.openingOffset
    + params.returnAllowanceTax

  return {
    outputTax: params.outputTax,
    inputTax: params.inputTax,
    fixedAssetInputTax: params.fixedAssetInputTax,
    returnAllowanceTax: params.returnAllowanceTax,
    itemNonDeductibleTax: params.itemNonDeductibleTax,  // 僅報表顯示
    ratioNonDeductibleTax,                              // 兼營比例
    netDeductibleInput,                                 // 實際可扣抵
    openingOffset: params.openingOffset,
    netTax: Math.abs(netTax),
    closingOffset: netTax < 0 ? Math.abs(netTax) : 0,
    isRefund: netTax < 0,
  }
}
```

---

### Step 4: 媒體檔擴充

**修改 `media-file-generator.ts`**

| 新增功能 | 說明 |
|---------|------|
| 退出折讓格式代號 | 銷項退回=33, 進項退出=23, 二聯式退回=34/24 |
| 作廢發票處理 | 金額=0, 稅額=0, 保留字軌號碼 |
| 格式代號自動判斷 | 根據 `return_type` + `type` 決定格式代號 |
| 彙總機制 | 按格式代號統計份數和金額 |

```typescript
// 新增格式代號判斷邏輯
export function determineFormatCode(
  type: 'INPUT' | 'OUTPUT',
  returnType: 'NONE' | 'RETURN' | 'ALLOWANCE',
  invoiceFormat: 'THREE_COPY' | 'TWO_COPY' | 'E_INVOICE'
): string {
  if (type === 'OUTPUT') {
    if (returnType === 'RETURN' || returnType === 'ALLOWANCE') {
      return invoiceFormat === 'TWO_COPY'
        ? FORMAT_CODES.OUTPUT.TWO_COPY_RETURN    // 34
        : FORMAT_CODES.OUTPUT.THREE_COPY_RETURN  // 33
    }
    return FORMAT_CODES.OUTPUT.E_INVOICE  // 35
  } else {
    if (returnType === 'RETURN' || returnType === 'ALLOWANCE') {
      return invoiceFormat === 'TWO_COPY'
        ? FORMAT_CODES.INPUT.TWO_COPY_RETURN     // 24
        : FORMAT_CODES.INPUT.THREE_COPY_RETURN   // 23
    }
    return FORMAT_CODES.INPUT.E_INVOICE   // 25
  }
}
```

---

### Step 5: API 層

**5a. 新增 `app/api/accounting/tax-declarations/route.ts`**

```
GET    /api/accounting/tax-declarations          → 列表
POST   /api/accounting/tax-declarations          → 建立/取得期別
GET    /api/accounting/tax-declarations/:id      → 取得單一
PUT    /api/accounting/tax-declarations/:id      → 更新（計算+儲存）
POST   /api/accounting/tax-declarations/:id/submit  → 送出
POST   /api/accounting/tax-declarations/:id/reopen  → 重新開啟
```

**5b. 修改 `app/api/accounting/reports/tax/route.ts`**

- GET 新增 `declaration_id` 參數
- 如果有 `declaration_id`，改用 `declared_period_id` 篩選
- 如果沒有，fallback 到現有 `startDate/endDate` 邏輯（向後相容）

---

### Step 6: UI 調整

**修改 `TaxReportDashboard.tsx`**

| 修改項 | 說明 |
|--------|------|
| 進項結構表 | 分為「進貨及費用」和「固定資產」兩組 |
| 新增留抵輸入 | 首次使用時手動輸入上期留抵金額 |
| 退出折讓區塊 | 顯示銷項退回和進項退出明細 |
| 稅額計算擴充 | 顯示完整公式（含留抵、退折讓、不得扣抵） |
| 申報狀態 | 顯示 draft/submitted/closed 狀態按鈕 |
| 跨期發票指派 | 列出未分配期別的發票，允許拖放指派 |

---

## 預期測試覆蓋

| 層級 | 目標 | 檔案數 |
|------|------|--------|
| Service（計算邏輯） | > 90% | 2 個測試檔 |
| Media file generator | > 85% | 1 個測試檔 |
| DAL | > 80% | 2 個測試檔 |
| API integration | > 75% | 2 個測試檔 |
| **總計** | **~85%** | **7 個測試檔** |

---

## 技術選型

| 項目 | 選擇 | 理由 |
|------|------|------|
| DB Migration | 手寫 SQL | 專案慣例，Supabase 直接執行 |
| DAL Pattern | 現有 Supabase client | 維持 `getSupabaseClient()` 模式 |
| Service Pattern | 純函數 + DB 注入 | 可測試性最高 |
| API Auth | 現有 `withAuth` middleware | 已驗證可靠 |
| State Management | TanStack Query | 專案已在用 |
| Type 擴充 | 擴展現有 interface | 向後相容 |

---

## 潛在風險

| 風險 | 影響 | 解決方案 |
|------|------|---------|
| 現有報表邏輯被破壞 | HIGH | declared_period_id NULL fallback + 完整 regression test |
| 留抵稅額初始值未知 | MEDIUM | UI 提供手動輸入，首期必填 |
| 同一發票重複分配 | HIGH | DB unique constraint + DAL 層檢查 |
| 退出折讓金額正負號混亂 | MEDIUM | DB 存正數 + return_type 欄位控制 + service 計算時取反 |
| Migration 在大量資料時慢 | LOW | 新增欄位 nullable + 背景填入 |
| 舊版前端 cache | LOW | API 版本號 + queryKey 更新 |

---

## 安全性考量

| 項目 | 措施 |
|------|------|
| tax_declarations RLS | company_id 隔離，只能看自己公司 |
| 發票跨公司指派 | DAL 層檢查 invoice.company_id = declaration.company_id |
| 已送出不可改 | status = 'submitted' 時 UPDATE 拒絕 |
| 留抵不可負 | CHECK constraint + service 層驗證 |
| CSRF | 使用現有 buildCsrfHeaders |

---

## 效能考量

| 項目 | 措施 |
|------|------|
| 查詢效能 | declared_period_id 加 index |
| 大量發票 | 媒體檔產生用 streaming，不一次載入 |
| 留抵查詢 | (company_id, period_year, period_bi_month) unique index |
| API 快取 | TanStack Query staleTime 5 分鐘 |

---

## 受影響檔案清單

### 新增檔案
1. `migrations/0XX_add_invoice_declaration_fields.sql`
2. `migrations/0XX_create_tax_declarations.sql`
3. `lib/dal/accounting/tax-declarations.dal.ts`
4. `app/api/accounting/tax-declarations/route.ts`
5. `app/api/accounting/tax-declarations/[id]/route.ts`
6. `app/api/accounting/tax-declarations/[id]/submit/route.ts`
7. `app/api/accounting/tax-declarations/[id]/reopen/route.ts`
8. `tests/unit/dal/accounting/tax-declarations.test.ts`
9. `tests/unit/services/accounting/tax-report-v2.test.ts`
10. `tests/unit/services/accounting/media-file-generator-v2.test.ts`
11. `tests/integration/api/accounting/tax-declarations.test.ts`

### 修改檔案
12. `lib/dal/accounting/invoices.dal.ts` — 新增 declared_period_id 查詢
13. `lib/services/accounting/tax-report.service.ts` — 計算邏輯大改
14. `lib/services/accounting/media-file-generator.ts` — 退出折讓+作廢
15. `hooks/accounting/use-tax-reports.ts` — 支援 declaration_id
16. `app/api/accounting/reports/tax/route.ts` — 支援 declaration_id
17. `app/accounting/reports/TaxReportDashboard.tsx` — UI 擴充
18. `types/models.ts` — 新增 TaxDeclaration type
19. `lib/dal/accounting/index.ts` — 新增 export
20. `lib/services/accounting/index.ts` — 新增 export

---

## 參考資料

- [401報表完整介紹 | 財報雲](https://blog.statementcloud.tw/what-is-business-tax-return-401/)
- [簡單看懂401申報書 | 詠雋稅務](https://tanukicpb.com/archives/60942)
- [營業稅法第19條 — 不得扣抵進項稅額](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340024&flno=19)
- [財政部電子申報格式規範](https://www.etax.nat.gov.tw/)
- CC + Gemini 交叉審查記錄（2026-03-05 兩輪）
