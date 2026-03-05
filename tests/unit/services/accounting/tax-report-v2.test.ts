/**
 * 營業稅申報服務 V2 測試
 * 測試路徑: lib/services/accounting/tax-report.service.ts (新增 V2 函數)
 *
 * TDD Red Phase: 測試先行
 * 測試 calculateTaxAmountsV2, classifyPurchaseInvoices, Form401DataV2
 */

import { describe, it, expect } from "vitest";
import {
  calculateTaxAmountsV2,
  classifyPurchaseInvoices,
} from "@/lib/services/accounting/tax-report.service";
import type { AccInvoice } from "@/lib/dal/accounting/invoices.dal";
import type { TaxCode } from "@/lib/dal/accounting/tax-codes.dal";

function createMockInputInvoice(
  overrides: Partial<AccInvoice> = {},
): AccInvoice {
  return {
    id: `inv-${Math.random().toString(36).substring(7)}`,
    company_id: "test-company-id",
    number: `AB-${Math.random().toString().substring(2, 10)}`,
    type: "INPUT",
    date: "2026-01-15",
    untaxed_amount: 10000,
    tax_amount: 500,
    total_amount: 10500,
    counterparty_id: null,
    counterparty_tax_id: "12345678",
    counterparty_name: "Test Supplier",
    tax_code_id: null,
    description: null,
    account_id: null,
    account_code: null,
    is_account_automatic: false,
    account_confidence: null,
    ocr_raw_data: null,
    ocr_confidence: null,
    attachment_url: null,
    status: "POSTED",
    verified_at: null,
    verified_by: null,
    journal_entry_id: null,
    posted_at: null,
    posted_by: null,
    voided_at: null,
    voided_by: null,
    void_reason: null,
    payment_status: "UNPAID",
    payment_method: "UNCLASSIFIED",
    paid_amount: 0,
    paid_date: null,
    due_date: null,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
    deleted_at: null,
    // V2 fields (will be added by migration)
    is_fixed_asset: false,
    return_type: "NONE",
    declared_period_id: null,
    is_historical_import: false,
    original_invoice_date: null,
    original_invoice_number: null,
    ...overrides,
  } as AccInvoice;
}

describe("tax-report.service V2 - 營業稅計算 V2", () => {
  // ============================================
  // calculateTaxAmountsV2
  // ============================================
  describe("calculateTaxAmountsV2", () => {
    it("Case 1: 基本計算（銷項2.5萬-進項1.5萬=應納1萬）", () => {
      const result = calculateTaxAmountsV2({
        outputTax: 25000,
        inputTax: 15000,
        fixedAssetInputTax: 0,
        returnAllowanceTax: 0,
        openingOffset: 0,
        itemNonDeductibleTax: 0,
        nonDeductibleRatio: 0,
      });

      expect(result.netTax).toBe(10000);
      expect(result.isRefund).toBe(false);
      expect(result.closingOffset).toBe(0);
    });

    it("Case 2: 留抵結轉（上期留抵5000+本期進項3萬-銷項2萬=留抵1.5萬）", () => {
      const result = calculateTaxAmountsV2({
        outputTax: 20000,
        inputTax: 30000,
        fixedAssetInputTax: 0,
        returnAllowanceTax: 0,
        openingOffset: 5000,
        itemNonDeductibleTax: 0,
        nonDeductibleRatio: 0,
      });

      // netTax = 20000 - 30000 - 5000 = -15000
      expect(result.isRefund).toBe(true);
      expect(result.netTax).toBe(15000); // abs
      expect(result.closingOffset).toBe(15000);
    });

    it("Case 3: 固定資產分離（進貨費用5000 + 固定資產10000）", () => {
      const result = calculateTaxAmountsV2({
        outputTax: 50000,
        inputTax: 5000,
        fixedAssetInputTax: 10000,
        returnAllowanceTax: 0,
        openingOffset: 0,
        itemNonDeductibleTax: 0,
        nonDeductibleRatio: 0,
      });

      // netTax = 50000 - (5000 + 10000) = 35000
      expect(result.netTax).toBe(35000);
      expect(result.inputTax).toBe(5000);
      expect(result.fixedAssetInputTax).toBe(10000);
    });

    it("Case 4: 退出折讓（銷項退回減少銷項稅）", () => {
      // returnAllowanceTax = 進項退出稅額 - 銷項退回稅額
      // 銷項退回 5000 稅 250 → returnAllowanceTax = 0 - 250 = -250
      // 但公式是 + returnAllowanceTax，所以退回銷項 = 加回（客戶退貨減少銷項）
      // 正確語義：returnAllowanceTax > 0 表示「進項退出大於銷項退回」，增加應繳稅額
      const result = calculateTaxAmountsV2({
        outputTax: 25000, // 已扣除銷項退回後的淨銷項稅
        inputTax: 15000,
        fixedAssetInputTax: 0,
        returnAllowanceTax: 500, // 進項退出500（要加回，因為減少了可扣抵）
        openingOffset: 0,
        itemNonDeductibleTax: 0,
        nonDeductibleRatio: 0,
      });

      // netTax = 25000 - 15000 + 500 = 10500
      expect(result.netTax).toBe(10500);
    });

    it("Case 7: 單筆不得扣抵（交際費 itemNonDeductibleTax 僅報表顯示）", () => {
      // inputTax 已排除不可扣抵，所以 itemNonDeductibleTax 不影響 netTax
      const result = calculateTaxAmountsV2({
        outputTax: 25000,
        inputTax: 10000, // 已排除不可扣抵的 5000
        fixedAssetInputTax: 0,
        returnAllowanceTax: 0,
        openingOffset: 0,
        itemNonDeductibleTax: 5000, // 報表顯示用
        nonDeductibleRatio: 0,
      });

      // netTax = 25000 - 10000 = 15000 (itemNonDeductibleTax 不參與計算)
      expect(result.netTax).toBe(15000);
      expect(result.itemNonDeductibleTax).toBe(5000); // 報表顯示
    });

    it("比例不得扣抵（兼營營業人 20%）", () => {
      const result = calculateTaxAmountsV2({
        outputTax: 25000,
        inputTax: 10000,
        fixedAssetInputTax: 5000,
        returnAllowanceTax: 0,
        openingOffset: 0,
        itemNonDeductibleTax: 0,
        nonDeductibleRatio: 0.2, // 20%
      });

      // totalDeductibleInput = 10000 + 5000 = 15000
      // ratioNonDeductible = round(15000 * 0.2) = 3000
      // netDeductibleInput = 15000 - 3000 = 12000
      // netTax = 25000 - 12000 = 13000
      expect(result.ratioNonDeductibleTax).toBe(3000);
      expect(result.netTax).toBe(13000);
    });

    it("混合場景：留抵+退出+固資+比例不得扣抵", () => {
      const result = calculateTaxAmountsV2({
        outputTax: 50000,
        inputTax: 20000,
        fixedAssetInputTax: 10000,
        returnAllowanceTax: 1000, // 進項退出
        openingOffset: 5000, // 上期留抵
        itemNonDeductibleTax: 3000, // 報表顯示
        nonDeductibleRatio: 0.1, // 10%
      });

      // totalDeductible = 20000 + 10000 = 30000
      // ratioNonDeductible = round(30000 * 0.1) = 3000
      // netDeductible = 30000 - 3000 = 27000
      // netTax = 50000 - 27000 - 5000 + 1000 = 19000
      expect(result.ratioNonDeductibleTax).toBe(3000);
      expect(result.netTax).toBe(19000);
      expect(result.isRefund).toBe(false);
      expect(result.closingOffset).toBe(0);
    });

    it("留抵不能為負數", () => {
      const result = calculateTaxAmountsV2({
        outputTax: 10000,
        inputTax: 5000,
        fixedAssetInputTax: 0,
        returnAllowanceTax: 0,
        openingOffset: 0,
        itemNonDeductibleTax: 0,
        nonDeductibleRatio: 0,
      });

      expect(result.closingOffset).toBe(0); // 不是負數
      expect(result.closingOffset).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // classifyPurchaseInvoices
  // ============================================
  describe("classifyPurchaseInvoices", () => {
    it("Case 3: 應分離進貨費用 vs 固定資產", () => {
      const invoices = [
        createMockInputInvoice({
          tax_amount: 500,
          is_fixed_asset: false,
        } as Partial<AccInvoice>),
        createMockInputInvoice({
          tax_amount: 1000,
          is_fixed_asset: true,
        } as Partial<AccInvoice>),
      ];

      const result = classifyPurchaseInvoices(invoices as AccInvoice[]);

      expect(result.goodsAndExpenses.deductible.taxAmount).toBe(500);
      expect(result.fixedAssets.deductible.taxAmount).toBe(1000);
    });

    it("應正確分類免稅和零稅率進項", () => {
      const invoices = [
        createMockInputInvoice({
          tax_amount: 0,
          untaxed_amount: 10000,
          tax_code_id: "exempt",
        } as Partial<AccInvoice>),
      ];

      // This tests the classification logic for exempt/zero-rate
      const result = classifyPurchaseInvoices(invoices as AccInvoice[]);
      expect(result).toBeDefined();
    });

    it("作廢發票不計入金額", () => {
      const invoices = [
        createMockInputInvoice({ tax_amount: 500, status: "VOIDED" }),
      ];

      const result = classifyPurchaseInvoices(invoices as AccInvoice[]);

      const totalTax =
        result.goodsAndExpenses.deductible.taxAmount +
        result.goodsAndExpenses.nonDeductible.taxAmount +
        result.fixedAssets.deductible.taxAmount +
        result.fixedAssets.nonDeductible.taxAmount;

      expect(totalTax).toBe(0);
    });
  });

  // ============================================
  // classifyPurchaseInvoices — taxCodeMap 扣抵性
  // ============================================
  describe("classifyPurchaseInvoices — taxCodeMap", () => {
    function createTaxCode(overrides: Partial<TaxCode> = {}): TaxCode {
      return {
        id: `tc-${Math.random().toString(36).substring(7)}`,
        code: "TX5",
        name: "營業稅 5%",
        description: null,
        tax_rate: 5,
        tax_type: "INPUT",
        is_deductible: true,
        is_common: true,
        is_system: true,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        ...overrides,
      };
    }

    it("不可扣抵稅碼 → nonDeductible 分組", () => {
      const nonDeductibleTc = createTaxCode({
        id: "tc-entertainment",
        code: "ENTERTAIN",
        name: "交際費（不可扣抵）",
        is_deductible: false,
      });
      const taxCodeMap = new Map([[nonDeductibleTc.id, nonDeductibleTc]]);

      const invoices = [
        createMockInputInvoice({
          tax_code_id: nonDeductibleTc.id,
          tax_amount: 500,
          untaxed_amount: 10000,
        }),
      ];

      const result = classifyPurchaseInvoices(invoices, taxCodeMap);

      expect(result.goodsAndExpenses.nonDeductible.taxAmount).toBe(500);
      expect(result.goodsAndExpenses.nonDeductible.count).toBe(1);
      expect(result.goodsAndExpenses.deductible.taxAmount).toBe(0);
    });

    it("可扣抵稅碼 → deductible 分組", () => {
      const deductibleTc = createTaxCode({
        id: "tc-input5",
        code: "TX5",
        is_deductible: true,
      });
      const taxCodeMap = new Map([[deductibleTc.id, deductibleTc]]);

      const invoices = [
        createMockInputInvoice({
          tax_code_id: deductibleTc.id,
          tax_amount: 1000,
          untaxed_amount: 20000,
        }),
      ];

      const result = classifyPurchaseInvoices(invoices, taxCodeMap);

      expect(result.goodsAndExpenses.deductible.taxAmount).toBe(1000);
      expect(result.goodsAndExpenses.deductible.count).toBe(1);
      expect(result.goodsAndExpenses.nonDeductible.taxAmount).toBe(0);
    });

    it("混合稅碼 → 正確分流（含固資）", () => {
      const deductibleTc = createTaxCode({
        id: "tc-deductible",
        is_deductible: true,
      });
      const nonDeductibleTc = createTaxCode({
        id: "tc-non-deductible",
        is_deductible: false,
      });
      const taxCodeMap = new Map([
        [deductibleTc.id, deductibleTc],
        [nonDeductibleTc.id, nonDeductibleTc],
      ]);

      const invoices = [
        // 進貨費用 - 可扣抵
        createMockInputInvoice({
          tax_code_id: deductibleTc.id,
          tax_amount: 500,
          is_fixed_asset: false,
        }),
        // 進貨費用 - 不可扣抵（交際費）
        createMockInputInvoice({
          tax_code_id: nonDeductibleTc.id,
          tax_amount: 300,
          is_fixed_asset: false,
        }),
        // 固定資產 - 可扣抵
        createMockInputInvoice({
          tax_code_id: deductibleTc.id,
          tax_amount: 2000,
          is_fixed_asset: true,
        }),
        // 固定資產 - 不可扣抵
        createMockInputInvoice({
          tax_code_id: nonDeductibleTc.id,
          tax_amount: 800,
          is_fixed_asset: true,
        }),
      ];

      const result = classifyPurchaseInvoices(invoices, taxCodeMap);

      expect(result.goodsAndExpenses.deductible.taxAmount).toBe(500);
      expect(result.goodsAndExpenses.nonDeductible.taxAmount).toBe(300);
      expect(result.fixedAssets.deductible.taxAmount).toBe(2000);
      expect(result.fixedAssets.nonDeductible.taxAmount).toBe(800);
    });

    it("無稅碼 null → 預設 deductible（向後相容）", () => {
      const invoices = [
        createMockInputInvoice({
          tax_code_id: null,
          tax_amount: 500,
        }),
      ];

      // 不傳 taxCodeMap（使用預設空 Map）
      const result = classifyPurchaseInvoices(invoices);

      expect(result.goodsAndExpenses.deductible.taxAmount).toBe(500);
      expect(result.goodsAndExpenses.nonDeductible.taxAmount).toBe(0);
    });
  });
});
