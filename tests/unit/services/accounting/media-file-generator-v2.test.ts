/**
 * 媒體申報檔 V2 測試（退出折讓 + 作廢發票）
 * 測試路徑: lib/services/accounting/media-file-generator.ts
 *
 * TDD Red Phase: 測試先行
 */

import { describe, it, expect } from "vitest";
import {
  determineFormatCode,
  generateMediaLineV2,
  validateMediaFile,
  RECORD_LENGTH,
  DEDUCTION_CODES,
  type MediaInvoiceDataV2,
  type MediaFileOptions,
} from "@/lib/services/accounting/media-file-generator";

const defaultOptions: MediaFileOptions = {
  taxRegistrationNumber: "123456780",
  year: 2026,
  biMonth: 1,
};

function createMediaInvoice(
  overrides: Partial<MediaInvoiceDataV2> = {},
): MediaInvoiceDataV2 {
  return {
    type: "OUTPUT",
    invoiceNumber: "AB12345678",
    date: "2026-01-15",
    counterpartyTaxId: "87654321",
    untaxedAmount: 10000,
    taxAmount: 500,
    taxCategory: "TAXABLE_5",
    isDeductible: undefined,
    isFixedAsset: false,
    returnType: "NONE",
    isVoided: false,
    ...overrides,
  };
}

describe("media-file-generator V2 - 退出折讓 + 作廢", () => {
  // ============================================
  // determineFormatCode
  // ============================================
  describe("determineFormatCode", () => {
    it("銷項退回/折讓應使用格式代號 33（三聯式）", () => {
      const code = determineFormatCode("OUTPUT", "RETURN", "THREE_COPY");
      expect(code).toBe("33");
    });

    it("銷項退回/折讓應使用格式代號 34（二聯式）", () => {
      const code = determineFormatCode("OUTPUT", "RETURN", "TWO_COPY");
      expect(code).toBe("34");
    });

    it("進項退出/折讓應使用格式代號 23（三聯式）", () => {
      const code = determineFormatCode("INPUT", "RETURN", "THREE_COPY");
      expect(code).toBe("23");
    });

    it("進項退出/折讓應使用格式代號 24（二聯式）", () => {
      const code = determineFormatCode("INPUT", "RETURN", "TWO_COPY");
      expect(code).toBe("24");
    });

    it("正常銷項電子發票應使用 35", () => {
      const code = determineFormatCode("OUTPUT", "NONE", "E_INVOICE");
      expect(code).toBe("35");
    });

    it("正常進項電子發票應使用 25", () => {
      const code = determineFormatCode("INPUT", "NONE", "E_INVOICE");
      expect(code).toBe("25");
    });

    it("ALLOWANCE 也使用退折讓格式代號", () => {
      const code = determineFormatCode("OUTPUT", "ALLOWANCE", "E_INVOICE");
      expect(code).toBe("33"); // 電子發票折讓用三聯式退回格式
    });
  });

  // ============================================
  // generateMediaLineV2 - 退出折讓
  // ============================================
  describe("generateMediaLineV2 - 退出折讓", () => {
    it("銷項退回應產生格式代號 33 的 81-byte 記錄", () => {
      const invoice = createMediaInvoice({
        type: "OUTPUT",
        returnType: "RETURN",
        untaxedAmount: 5000,
        taxAmount: 250,
      });

      const line = generateMediaLineV2(invoice, defaultOptions, 1);

      expect(line.length).toBe(RECORD_LENGTH);
      expect(line.substring(0, 2)).toBe("33"); // 格式代號
    });

    it("進項退出應產生格式代號 23 的 81-byte 記錄", () => {
      const invoice = createMediaInvoice({
        type: "INPUT",
        returnType: "RETURN",
        untaxedAmount: 3000,
        taxAmount: 150,
        isDeductible: true,
      });

      const line = generateMediaLineV2(invoice, defaultOptions, 1);

      expect(line.length).toBe(RECORD_LENGTH);
      expect(line.substring(0, 2)).toBe("23"); // 格式代號
    });
  });

  // ============================================
  // generateMediaLineV2 - 作廢發票
  // ============================================
  describe("generateMediaLineV2 - 作廢發票", () => {
    it("作廢發票金額應為 0，保留字軌", () => {
      const invoice = createMediaInvoice({
        type: "OUTPUT",
        invoiceNumber: "CD98765432",
        untaxedAmount: 50000,
        taxAmount: 2500,
        isVoided: true,
      });

      const line = generateMediaLineV2(invoice, defaultOptions, 1);

      expect(line.length).toBe(RECORD_LENGTH);
      // 銷售額（50-61, 12碼）應為 000000000000
      expect(line.substring(49, 61)).toBe("000000000000");
      // 稅額（63-72, 10碼）應為 0000000000
      expect(line.substring(62, 72)).toBe("0000000000");
      // 字軌號碼（40-49, 10碼）應保留
      expect(line.substring(39, 49)).toBe("CD98765432");
    });
  });

  // ============================================
  // generateMediaLineV2 - 固定資產扣抵代號
  // ============================================
  describe("generateMediaLineV2 - 固定資產扣抵代號", () => {
    it("可扣抵固定資產進項扣抵代號應為 3", () => {
      const invoice = createMediaInvoice({
        type: "INPUT",
        isDeductible: true,
        isFixedAsset: true,
      });

      const line = generateMediaLineV2(invoice, defaultOptions, 1);

      // 扣抵代號在第 73 位（index 72）
      expect(line.substring(72, 73)).toBe(DEDUCTION_CODES.DEDUCTIBLE_ASSET); // '3'
    });

    it("不可扣抵固定資產進項扣抵代號應為 4", () => {
      const invoice = createMediaInvoice({
        type: "INPUT",
        isDeductible: false,
        isFixedAsset: true,
      });

      const line = generateMediaLineV2(invoice, defaultOptions, 1);

      expect(line.substring(72, 73)).toBe(DEDUCTION_CODES.NON_DEDUCTIBLE_ASSET); // '4'
    });
  });

  // ============================================
  // validateMediaFile - 混合驗證
  // ============================================
  describe("validateMediaFile - 混合場景", () => {
    it("混合進銷項+退折讓的媒體檔應驗證通過", () => {
      const invoices: MediaInvoiceDataV2[] = [
        createMediaInvoice({ type: "OUTPUT" }),
        createMediaInvoice({ type: "INPUT", isDeductible: true }),
        createMediaInvoice({ type: "OUTPUT", returnType: "RETURN" }),
        createMediaInvoice({
          type: "INPUT",
          returnType: "RETURN",
          isDeductible: true,
        }),
      ];

      let content = "";
      invoices.forEach((inv, i) => {
        content += generateMediaLineV2(inv, defaultOptions, i + 1);
      });

      const result = validateMediaFile(content);
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBe(4);
    });

    it("長度錯誤的媒體檔應驗證失敗", () => {
      const content = "short-content";
      const result = validateMediaFile(content);
      expect(result.valid).toBe(false);
    });
  });
});
