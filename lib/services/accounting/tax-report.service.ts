/**
 * 營業稅申報服務
 * 處理 401（營業稅申報書）與 403（零稅率銷售額申報書）申報資料計算
 */

import { SupabaseClient } from "@/lib/db/supabase-client";
import { AccInvoice, getInvoices } from "@/lib/dal/accounting";
import { getOrCreateTaxDeclaration } from "@/lib/dal/accounting/tax-declarations.dal";
import type { TaxCode } from "@/lib/dal/accounting/tax-codes.dal";
import { getTaxCodes } from "@/lib/dal/accounting/tax-codes.dal";
import { getCompanyById } from "@/lib/dal/companies";
import {
  generateMediaFile,
  invoiceDetailToMediaData,
  type MediaFileResult,
  type MediaInvoiceData,
  type MediaFileOptions,
} from "./media-file-generator";

// ============================================
// 類型定義
// ============================================

/**
 * 稅類別
 */
export type TaxCategory = "TAXABLE_5" | "ZERO_RATED" | "EXEMPT" | "NON_TAXABLE";

/**
 * 發票明細資料
 */
export interface InvoiceDetail {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  counterpartyName: string;
  counterpartyTaxId: string;
  untaxedAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxCategory: TaxCategory;
  /** 是否可扣抵（僅進項使用） */
  isDeductible?: boolean;
}

/**
 * 稅額計算結果
 */
export interface TaxCalculationResult {
  /** 銷項稅額 */
  outputTax: number;
  /** 進項稅額（僅可扣抵部分） */
  inputTax: number;
  /** 應納（退）稅額 = 銷項 - 進項 */
  netTax: number;
  /** 是否為退稅 */
  isRefund: boolean;
}

/**
 * 401 申報書資料
 */
export interface Form401Data {
  // 申報基本資訊
  period: {
    year: number;
    month: number; // 1-12，單數月份
    biMonth: number; // 1-6，代表 1-2月、3-4月...
  };
  companyInfo: {
    companyId: string;
    taxId: string;
    companyName: string;
  };

  // 銷項發票（OUTPUT）
  sales: {
    // 應稅銷售額（5%）
    taxable: {
      count: number;
      untaxedAmount: number;
      taxAmount: number;
      invoices: InvoiceDetail[];
    };
    // 零稅率銷售額
    zeroRated: {
      count: number;
      untaxedAmount: number;
      invoices: InvoiceDetail[];
    };
    // 免稅銷售額
    exempt: {
      count: number;
      untaxedAmount: number;
      invoices: InvoiceDetail[];
    };
  };

  // 進項發票（INPUT）
  purchases: {
    // 可扣抵進項
    deductible: {
      count: number;
      untaxedAmount: number;
      taxAmount: number;
      invoices: InvoiceDetail[];
    };
    // 不可扣抵進項
    nonDeductible: {
      count: number;
      untaxedAmount: number;
      taxAmount: number;
      invoices: InvoiceDetail[];
    };
  };

  // 稅額計算
  taxCalculation: {
    outputTax: number; // 銷項稅額
    inputTax: number; // 進項稅額
    netTax: number; // 應納（退）稅額 = 銷項 - 進項
    isRefund: boolean; // 是否為退稅
  };

  // 統計資料
  summary: {
    totalSalesCount: number;
    totalSalesAmount: number;
    totalPurchasesCount: number;
    totalPurchasesAmount: number;
    generatedAt: string;
  };
}

/**
 * 403 申報書資料（零稅率銷售額清單）
 */
export interface Form403Data {
  period: {
    year: number;
    month: number;
    biMonth: number;
  };
  companyInfo: {
    companyId: string;
    taxId: string;
    companyName: string;
  };

  // 零稅率銷售明細
  zeroRatedSales: {
    // 外銷貨物
    exports: {
      count: number;
      amount: number;
      invoices: InvoiceDetail[];
    };
    // 與外銷有關之勞務或在國內提供而在國外使用之勞務
    exportServices: {
      count: number;
      amount: number;
      invoices: InvoiceDetail[];
    };
    // 其他零稅率
    others: {
      count: number;
      amount: number;
      invoices: InvoiceDetail[];
    };
    total: {
      count: number;
      amount: number;
    };
  };

  generatedAt: string;
}

/**
 * 申報期間
 */
export interface TaxPeriod {
  year: number;
  month: number; // 奇數月份 (1, 3, 5, 7, 9, 11)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

// ============================================
// 工具函數
// ============================================

/**
 * 計算申報期間
 * 營業稅為雙月申報，以奇數月份為申報期間
 */
export function calculateTaxPeriod(year: number, biMonth: number): TaxPeriod {
  // biMonth: 1 = 1-2月, 2 = 3-4月, 3 = 5-6月, 4 = 7-8月, 5 = 9-10月, 6 = 11-12月
  const startMonth = (biMonth - 1) * 2 + 1;
  const endMonth = startMonth + 1;

  const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;

  // 計算月底日期
  const lastDayOfMonth = new Date(year, endMonth, 0).getDate();
  const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

  return {
    year,
    month: endMonth, // 以結束月份為申報月份
    startDate,
    endDate,
  };
}

/**
 * 根據稅碼判斷稅類別
 *
 * @param taxCode - 稅碼物件，可為 null 或 undefined
 * @returns 稅類別
 */
export function determineTaxCategoryFromTaxCode(
  taxCode: TaxCode | null | undefined,
): TaxCategory {
  if (!taxCode) {
    return "NON_TAXABLE";
  }

  // 根據稅碼的 tax_type 欄位判斷
  switch (taxCode.tax_type) {
    case "TAXABLE":
      return "TAXABLE_5";
    case "ZERO_RATED":
      return "ZERO_RATED";
    case "EXEMPT":
      return "EXEMPT";
    case "NON_TAXABLE":
    default:
      return "NON_TAXABLE";
  }
}

/**
 * 判斷進項發票是否可扣抵
 *
 * 根據台灣稅法，以下進項不可扣抵：
 * - 交際費（招待費）
 * - 自用乘人小汽車費用
 * - 非供本業及附屬業務使用之費用
 *
 * @param taxCode - 稅碼物件，可為 null 或 undefined
 * @returns 是否可扣抵
 */
export function isInputInvoiceDeductible(
  taxCode: TaxCode | null | undefined,
): boolean {
  // 沒有稅碼時，預設為可扣抵（保守處理，避免遺漏）
  if (!taxCode) {
    return true;
  }

  // 直接使用稅碼的 is_deductible 欄位判斷
  return taxCode.is_deductible;
}

/**
 * 計算稅額
 *
 * @param salesInvoices - 銷項發票明細列表
 * @param purchaseInvoices - 進項發票明細列表
 * @returns 稅額計算結果
 */
export function calculateTaxAmounts(
  salesInvoices: InvoiceDetail[],
  purchaseInvoices: InvoiceDetail[],
): TaxCalculationResult {
  // 計算銷項稅額：只計算應稅銷項的稅額
  const outputTax = salesInvoices
    .filter((inv) => inv.taxCategory === "TAXABLE_5")
    .reduce((sum, inv) => sum + inv.taxAmount, 0);

  // 計算進項稅額：只計算可扣抵進項的稅額
  const inputTax = purchaseInvoices
    .filter((inv) => inv.isDeductible !== false) // 預設為可扣抵
    .reduce((sum, inv) => sum + inv.taxAmount, 0);

  // 計算淨稅額
  const netTax = outputTax - inputTax;

  return {
    outputTax,
    inputTax,
    netTax,
    isRefund: netTax < 0,
  };
}

/**
 * 根據發票判斷稅類別（舊版本，保留向後相容）
 *
 * @deprecated 建議使用 determineTaxCategoryFromTaxCode 搭配稅碼物件
 */
function determineTaxCategory(invoice: AccInvoice): TaxCategory {
  const taxAmount = parseFloat(String(invoice.tax_amount)) || 0;
  const untaxedAmount = parseFloat(String(invoice.untaxed_amount)) || 0;

  if (taxAmount === 0 && untaxedAmount > 0) {
    // 需要根據 tax_code_id 或其他欄位判斷是零稅率還是免稅
    // 這裡簡化處理：假設有設定 tax_code_id 的為零稅率，否則為免稅
    if (invoice.tax_code_id) {
      return "ZERO_RATED";
    }
    return "EXEMPT";
  }

  if (taxAmount > 0) {
    return "TAXABLE_5";
  }

  return "NON_TAXABLE";
}

/**
 * 將發票轉換為明細資料
 */
function invoiceToDetail(invoice: AccInvoice): InvoiceDetail {
  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    date: invoice.date,
    counterpartyName: invoice.counterparty_name || "",
    counterpartyTaxId: invoice.counterparty_tax_id || "",
    untaxedAmount: parseFloat(String(invoice.untaxed_amount)) || 0,
    taxAmount: parseFloat(String(invoice.tax_amount)) || 0,
    totalAmount: parseFloat(String(invoice.total_amount)) || 0,
    taxCategory: determineTaxCategory(invoice),
  };
}

// ============================================
// 主要服務函數
// ============================================

/**
 * 產生 401 申報書資料
 */
export async function generateForm401(
  db: SupabaseClient,
  companyId: string,
  companyTaxId: string,
  companyName: string,
  year: number,
  biMonth: number,
): Promise<Form401Data> {
  const period = calculateTaxPeriod(year, biMonth);

  // 取得期間內所有已過帳的發票
  const [outputInvoices, inputInvoices] = await Promise.all([
    getInvoices(db, {
      companyId,
      type: "OUTPUT",
      status: "POSTED",
      startDate: period.startDate,
      endDate: period.endDate,
      limit: 10000,
      offset: 0,
    }),
    getInvoices(db, {
      companyId,
      type: "INPUT",
      status: "POSTED",
      startDate: period.startDate,
      endDate: period.endDate,
      limit: 10000,
      offset: 0,
    }),
  ]);

  // 分類銷項發票
  const salesTaxable: InvoiceDetail[] = [];
  const salesZeroRated: InvoiceDetail[] = [];
  const salesExempt: InvoiceDetail[] = [];

  for (const inv of outputInvoices) {
    const detail = invoiceToDetail(inv);
    switch (detail.taxCategory) {
      case "TAXABLE_5":
        salesTaxable.push(detail);
        break;
      case "ZERO_RATED":
        salesZeroRated.push(detail);
        break;
      case "EXEMPT":
        salesExempt.push(detail);
        break;
    }
  }

  // 分類進項發票（簡化：假設所有進項都可扣抵）
  const purchasesDeductible: InvoiceDetail[] = [];
  const purchasesNonDeductible: InvoiceDetail[] = [];

  for (const inv of inputInvoices) {
    const detail = invoiceToDetail(inv);
    // 實務上需要根據進項來源判斷是否可扣抵
    // 這裡簡化處理：有稅額的進項都可扣抵
    if (detail.taxAmount > 0) {
      purchasesDeductible.push(detail);
    } else {
      purchasesNonDeductible.push(detail);
    }
  }

  // 計算統計數據
  const taxableUntaxed = salesTaxable.reduce(
    (sum, d) => sum + d.untaxedAmount,
    0,
  );
  const taxableTax = salesTaxable.reduce((sum, d) => sum + d.taxAmount, 0);
  const zeroRatedAmount = salesZeroRated.reduce(
    (sum, d) => sum + d.untaxedAmount,
    0,
  );
  const exemptAmount = salesExempt.reduce((sum, d) => sum + d.untaxedAmount, 0);

  const deductibleUntaxed = purchasesDeductible.reduce(
    (sum, d) => sum + d.untaxedAmount,
    0,
  );
  const deductibleTax = purchasesDeductible.reduce(
    (sum, d) => sum + d.taxAmount,
    0,
  );
  const nonDeductibleUntaxed = purchasesNonDeductible.reduce(
    (sum, d) => sum + d.untaxedAmount,
    0,
  );
  const nonDeductibleTax = purchasesNonDeductible.reduce(
    (sum, d) => sum + d.taxAmount,
    0,
  );

  // 稅額計算
  const outputTax = taxableTax;
  const inputTax = deductibleTax;
  const netTax = outputTax - inputTax;

  return {
    period: {
      year,
      month: period.month,
      biMonth,
    },
    companyInfo: {
      companyId,
      taxId: companyTaxId,
      companyName,
    },
    sales: {
      taxable: {
        count: salesTaxable.length,
        untaxedAmount: taxableUntaxed,
        taxAmount: taxableTax,
        invoices: salesTaxable,
      },
      zeroRated: {
        count: salesZeroRated.length,
        untaxedAmount: zeroRatedAmount,
        invoices: salesZeroRated,
      },
      exempt: {
        count: salesExempt.length,
        untaxedAmount: exemptAmount,
        invoices: salesExempt,
      },
    },
    purchases: {
      deductible: {
        count: purchasesDeductible.length,
        untaxedAmount: deductibleUntaxed,
        taxAmount: deductibleTax,
        invoices: purchasesDeductible,
      },
      nonDeductible: {
        count: purchasesNonDeductible.length,
        untaxedAmount: nonDeductibleUntaxed,
        taxAmount: nonDeductibleTax,
        invoices: purchasesNonDeductible,
      },
    },
    taxCalculation: {
      outputTax,
      inputTax,
      netTax: Math.abs(netTax),
      isRefund: netTax < 0,
    },
    summary: {
      totalSalesCount: outputInvoices.length,
      totalSalesAmount: taxableUntaxed + zeroRatedAmount + exemptAmount,
      totalPurchasesCount: inputInvoices.length,
      totalPurchasesAmount: deductibleUntaxed + nonDeductibleUntaxed,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * 產生 403 申報書資料（零稅率銷售額清單）
 */
export async function generateForm403(
  db: SupabaseClient,
  companyId: string,
  companyTaxId: string,
  companyName: string,
  year: number,
  biMonth: number,
): Promise<Form403Data> {
  const period = calculateTaxPeriod(year, biMonth);

  // 取得期間內所有已過帳的銷項發票
  const outputInvoices = await getInvoices(db, {
    companyId,
    type: "OUTPUT",
    status: "POSTED",
    startDate: period.startDate,
    endDate: period.endDate,
    limit: 10000,
    offset: 0,
  });

  // 篩選零稅率發票
  const zeroRatedInvoices = outputInvoices.filter((inv) => {
    const taxAmount = parseFloat(String(inv.tax_amount)) || 0;
    const untaxedAmount = parseFloat(String(inv.untaxed_amount)) || 0;
    // 零稅率：有銷售額但無稅額，且有設定 tax_code_id
    return taxAmount === 0 && untaxedAmount > 0 && inv.tax_code_id;
  });

  // 分類零稅率發票（簡化處理：全部歸類為外銷貨物）
  // 實務上需要根據發票附註或其他欄位判斷
  const exports = zeroRatedInvoices.map(invoiceToDetail);

  const totalAmount = exports.reduce((sum, d) => sum + d.untaxedAmount, 0);

  return {
    period: {
      year,
      month: period.month,
      biMonth,
    },
    companyInfo: {
      companyId,
      taxId: companyTaxId,
      companyName,
    },
    zeroRatedSales: {
      exports: {
        count: exports.length,
        amount: totalAmount,
        invoices: exports,
      },
      exportServices: {
        count: 0,
        amount: 0,
        invoices: [],
      },
      others: {
        count: 0,
        amount: 0,
        invoices: [],
      },
      total: {
        count: exports.length,
        amount: totalAmount,
      },
    },
    generatedAt: new Date().toISOString(),
  };
}

// ============================================
// XML 匯出（電子申報格式）
// ============================================

/**
 * 產生 401 申報書 XML
 * 格式符合財政部電子申報規範
 */
export function generateForm401Xml(data: Form401Data): string {
  const { period, companyInfo, sales, purchases, taxCalculation } = data;

  // 格式化金額（無小數點）
  const formatAmount = (n: number): string => Math.round(n).toString();

  // XML 格式
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<VAT401>
  <Header>
    <Year>${period.year}</Year>
    <Period>${String(period.biMonth).padStart(2, "0")}</Period>
    <TaxId>${companyInfo.taxId}</TaxId>
    <CompanyName>${escapeXml(companyInfo.companyName)}</CompanyName>
    <GeneratedAt>${data.summary.generatedAt}</GeneratedAt>
  </Header>
  <Sales>
    <Taxable>
      <Count>${sales.taxable.count}</Count>
      <UntaxedAmount>${formatAmount(sales.taxable.untaxedAmount)}</UntaxedAmount>
      <TaxAmount>${formatAmount(sales.taxable.taxAmount)}</TaxAmount>
    </Taxable>
    <ZeroRated>
      <Count>${sales.zeroRated.count}</Count>
      <Amount>${formatAmount(sales.zeroRated.untaxedAmount)}</Amount>
    </ZeroRated>
    <Exempt>
      <Count>${sales.exempt.count}</Count>
      <Amount>${formatAmount(sales.exempt.untaxedAmount)}</Amount>
    </Exempt>
  </Sales>
  <Purchases>
    <Deductible>
      <Count>${purchases.deductible.count}</Count>
      <UntaxedAmount>${formatAmount(purchases.deductible.untaxedAmount)}</UntaxedAmount>
      <TaxAmount>${formatAmount(purchases.deductible.taxAmount)}</TaxAmount>
    </Deductible>
    <NonDeductible>
      <Count>${purchases.nonDeductible.count}</Count>
      <UntaxedAmount>${formatAmount(purchases.nonDeductible.untaxedAmount)}</UntaxedAmount>
      <TaxAmount>${formatAmount(purchases.nonDeductible.taxAmount)}</TaxAmount>
    </NonDeductible>
  </Purchases>
  <TaxCalculation>
    <OutputTax>${formatAmount(taxCalculation.outputTax)}</OutputTax>
    <InputTax>${formatAmount(taxCalculation.inputTax)}</InputTax>
    <NetTax>${formatAmount(taxCalculation.netTax)}</NetTax>
    <IsRefund>${taxCalculation.isRefund ? "Y" : "N"}</IsRefund>
  </TaxCalculation>
</VAT401>`;

  return xml;
}

/**
 * 產生 403 申報書 XML
 */
export function generateForm403Xml(data: Form403Data): string {
  const { period, companyInfo, zeroRatedSales } = data;

  const formatAmount = (n: number): string => Math.round(n).toString();

  // 發票明細
  const invoiceItems = zeroRatedSales.exports.invoices
    .map(
      (inv) => `    <Invoice>
      <Number>${escapeXml(inv.invoiceNumber)}</Number>
      <Date>${inv.date}</Date>
      <BuyerTaxId>${escapeXml(inv.counterpartyTaxId)}</BuyerTaxId>
      <BuyerName>${escapeXml(inv.counterpartyName)}</BuyerName>
      <Amount>${formatAmount(inv.untaxedAmount)}</Amount>
    </Invoice>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<VAT403>
  <Header>
    <Year>${period.year}</Year>
    <Period>${String(period.biMonth).padStart(2, "0")}</Period>
    <TaxId>${companyInfo.taxId}</TaxId>
    <CompanyName>${escapeXml(companyInfo.companyName)}</CompanyName>
    <GeneratedAt>${data.generatedAt}</GeneratedAt>
  </Header>
  <ZeroRatedSales>
    <Exports>
      <Count>${zeroRatedSales.exports.count}</Count>
      <TotalAmount>${formatAmount(zeroRatedSales.exports.amount)}</TotalAmount>
    </Exports>
    <ExportServices>
      <Count>${zeroRatedSales.exportServices.count}</Count>
      <TotalAmount>${formatAmount(zeroRatedSales.exportServices.amount)}</TotalAmount>
    </ExportServices>
    <Others>
      <Count>${zeroRatedSales.others.count}</Count>
      <TotalAmount>${formatAmount(zeroRatedSales.others.amount)}</TotalAmount>
    </Others>
    <Total>
      <Count>${zeroRatedSales.total.count}</Count>
      <TotalAmount>${formatAmount(zeroRatedSales.total.amount)}</TotalAmount>
    </Total>
  </ZeroRatedSales>
  <InvoiceDetails>
${invoiceItems}
  </InvoiceDetails>
</VAT403>`;

  return xml;
}

/**
 * 從可能是物件或字串的公司名稱中提取字串
 * 處理多語言物件 {en: 'xxx', zh: 'xxx'} 或嵌套結構
 */
function ensureString(value: unknown, locale: string = "zh"): string {
  // 已經是字串，直接返回
  if (typeof value === "string") return value;

  // 是物件，嘗試提取
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;

    // 優先嘗試當前語系
    if (locale in obj && typeof obj[locale] === "string") {
      return obj[locale] as string;
    }

    // 回退到中文
    if ("zh" in obj && typeof obj.zh === "string") {
      return obj.zh as string;
    }

    // 回退到英文
    if ("en" in obj && typeof obj.en === "string") {
      return obj.en as string;
    }

    // 嘗試 name 屬性
    if ("name" in obj && typeof obj.name === "string") {
      return obj.name as string;
    }
  }

  return "";
}

/**
 * XML 特殊字元跳脫
 */
function escapeXml(str: unknown): string {
  // 確保輸入是字串
  const safeStr = ensureString(str);
  return safeStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ============================================
// 發票明細表
// ============================================

/**
 * 取得發票明細表資料（用於核對申報資料）
 */
export async function getInvoiceDetailList(
  db: SupabaseClient,
  companyId: string,
  type: "OUTPUT" | "INPUT",
  startDate: string,
  endDate: string,
): Promise<{
  invoices: InvoiceDetail[];
  summary: {
    count: number;
    untaxedAmount: number;
    taxAmount: number;
    totalAmount: number;
  };
}> {
  const invoices = await getInvoices(db, {
    companyId,
    type,
    status: "POSTED",
    startDate,
    endDate,
    limit: 10000,
    offset: 0,
  });

  const details = invoices.map(invoiceToDetail);

  const summary = details.reduce(
    (acc, inv) => ({
      count: acc.count + 1,
      untaxedAmount: acc.untaxedAmount + inv.untaxedAmount,
      taxAmount: acc.taxAmount + inv.taxAmount,
      totalAmount: acc.totalAmount + inv.totalAmount,
    }),
    { count: 0, untaxedAmount: 0, taxAmount: 0, totalAmount: 0 },
  );

  return { invoices: details, summary };
}

// ============================================
// 401 媒體申報檔
// ============================================

/**
 * 從 Form401Data 產生 401 媒體申報檔
 *
 * @param form401Data - Form401 申報書資料
 * @param taxRegistrationNumber - 稅籍編號（統編8碼+分支碼1碼）
 * @returns 媒體檔產生結果
 */
export function generateMediaFile401(
  form401Data: Form401Data,
  taxRegistrationNumber?: string,
): MediaFileResult {
  // 如果沒有提供稅籍編號，使用公司統編 + 0（總公司）
  const taxRegNum =
    taxRegistrationNumber || form401Data.companyInfo.taxId + "0";

  // 轉換發票資料為媒體檔格式
  const mediaInvoices: MediaInvoiceData[] = [];

  // 銷項發票（應稅）
  for (const inv of form401Data.sales.taxable.invoices) {
    mediaInvoices.push(invoiceDetailToMediaData(inv, "OUTPUT"));
  }

  // 銷項發票（零稅率）
  for (const inv of form401Data.sales.zeroRated.invoices) {
    mediaInvoices.push(invoiceDetailToMediaData(inv, "OUTPUT"));
  }

  // 銷項發票（免稅）
  for (const inv of form401Data.sales.exempt.invoices) {
    mediaInvoices.push(invoiceDetailToMediaData(inv, "OUTPUT"));
  }

  // 進項發票（可扣抵）
  for (const inv of form401Data.purchases.deductible.invoices) {
    const mediaData = invoiceDetailToMediaData(inv, "INPUT");
    mediaData.isDeductible = true;
    mediaInvoices.push(mediaData);
  }

  // 進項發票（不可扣抵）
  for (const inv of form401Data.purchases.nonDeductible.invoices) {
    const mediaData = invoiceDetailToMediaData(inv, "INPUT");
    mediaData.isDeductible = false;
    mediaInvoices.push(mediaData);
  }

  // 媒體檔產生選項
  const options: MediaFileOptions = {
    taxRegistrationNumber: taxRegNum,
    year: form401Data.period.year,
    biMonth: form401Data.period.biMonth,
  };

  // 產生媒體檔
  return generateMediaFile(mediaInvoices, options);
}

// ============================================
// V2: 擴充計算邏輯（留抵、固資分離、退折讓、不得扣抵）
// ============================================

export interface TaxCalculationParamsV2 {
  outputTax: number;
  inputTax: number;
  fixedAssetInputTax: number;
  returnAllowanceTax: number;
  openingOffset: number;
  itemNonDeductibleTax: number;
  nonDeductibleRatio: number;
}

export interface TaxCalculationResultV2 {
  outputTax: number;
  inputTax: number;
  fixedAssetInputTax: number;
  returnAllowanceTax: number;
  itemNonDeductibleTax: number;
  ratioNonDeductibleTax: number;
  netDeductibleInput: number;
  openingOffset: number;
  netTax: number;
  closingOffset: number;
  isRefund: boolean;
}

export interface ClassifiedInvoiceGroup {
  count: number;
  untaxedAmount: number;
  taxAmount: number;
}

export interface ClassifiedPurchases {
  goodsAndExpenses: {
    deductible: ClassifiedInvoiceGroup;
    nonDeductible: ClassifiedInvoiceGroup;
  };
  fixedAssets: {
    deductible: ClassifiedInvoiceGroup;
    nonDeductible: ClassifiedInvoiceGroup;
  };
  exempt: ClassifiedInvoiceGroup;
  zeroRate: ClassifiedInvoiceGroup;
}

/**
 * V2 稅額計算（含留抵、退折讓、不得扣抵比例）
 *
 * 公式：應納稅額 = 銷項 - (可扣抵進項 - 比例不得扣抵) - 上期留抵 + 退出折讓調整
 * - inputTax / fixedAssetInputTax 已排除「單筆不可扣抵」（DAL 層過濾）
 * - itemNonDeductibleTax 僅報表顯示用，不參與 netTax 計算
 * - nonDeductibleRatio 是兼營營業人的比例不得扣抵（0-1）
 */
export function calculateTaxAmountsV2(
  params: TaxCalculationParamsV2,
): TaxCalculationResultV2 {
  const totalDeductibleInputTax = params.inputTax + params.fixedAssetInputTax;
  const ratioNonDeductibleTax = params.nonDeductibleRatio
    ? Math.round(totalDeductibleInputTax * params.nonDeductibleRatio)
    : 0;
  const netDeductibleInput = totalDeductibleInputTax - ratioNonDeductibleTax;

  const rawNetTax =
    params.outputTax -
    netDeductibleInput -
    params.openingOffset +
    params.returnAllowanceTax;

  return {
    outputTax: params.outputTax,
    inputTax: params.inputTax,
    fixedAssetInputTax: params.fixedAssetInputTax,
    returnAllowanceTax: params.returnAllowanceTax,
    itemNonDeductibleTax: params.itemNonDeductibleTax,
    ratioNonDeductibleTax,
    netDeductibleInput,
    openingOffset: params.openingOffset,
    netTax: Math.abs(rawNetTax),
    closingOffset: rawNetTax < 0 ? Math.abs(rawNetTax) : 0,
    isRefund: rawNetTax < 0,
  };
}

/**
 * 進項發票分類（進貨費用 vs 固定資產 vs 免稅 vs 零稅率）
 * VOIDED 發票不計入金額
 *
 * @param invoices - 進項發票列表
 * @param taxCodeMap - 稅碼 ID → TaxCode 對照表，用於判斷扣抵性
 */
export function classifyPurchaseInvoices(
  invoices: AccInvoice[],
  taxCodeMap: Map<string, TaxCode> = new Map(),
): ClassifiedPurchases {
  const result: ClassifiedPurchases = {
    goodsAndExpenses: {
      deductible: { count: 0, untaxedAmount: 0, taxAmount: 0 },
      nonDeductible: { count: 0, untaxedAmount: 0, taxAmount: 0 },
    },
    fixedAssets: {
      deductible: { count: 0, untaxedAmount: 0, taxAmount: 0 },
      nonDeductible: { count: 0, untaxedAmount: 0, taxAmount: 0 },
    },
    exempt: { count: 0, untaxedAmount: 0, taxAmount: 0 },
    zeroRate: { count: 0, untaxedAmount: 0, taxAmount: 0 },
  };

  for (const inv of invoices) {
    // 作廢發票不計入
    if (inv.status === "VOIDED") continue;

    const untaxed = parseFloat(String(inv.untaxed_amount)) || 0;
    const tax = parseFloat(String(inv.tax_amount)) || 0;
    const isFixedAsset = inv.is_fixed_asset === true;

    // 免稅進項（稅額為 0 且有稅碼標記）
    if (tax === 0 && untaxed > 0) {
      result.exempt.count += 1;
      result.exempt.untaxedAmount += untaxed;
      continue;
    }

    // 有稅額的進項：用稅碼判斷扣抵性
    const taxCode = inv.tax_code_id ? taxCodeMap.get(inv.tax_code_id) : null;
    const isDeductible = isInputInvoiceDeductible(taxCode);
    const category = isFixedAsset
      ? result.fixedAssets
      : result.goodsAndExpenses;
    const group = isDeductible ? category.deductible : category.nonDeductible;

    group.count += 1;
    group.untaxedAmount += untaxed;
    group.taxAmount += tax;
  }

  return result;
}

// ============================================
// V2: Form401DataV2 + generateForm401V2
// ============================================

export interface Form401DataV2 extends Omit<
  Form401Data,
  "purchases" | "taxCalculation"
> {
  purchases: ClassifiedPurchases;

  purchaseInvoices: InvoiceDetail[];

  returnsAndAllowances: {
    salesReturns: { count: number; amount: number; tax: number };
    purchaseReturns: { count: number; amount: number; tax: number };
  };

  voidedInvoices: { count: number };

  taxCalculation: TaxCalculationResultV2;

  declaration: {
    id: string;
    status: string;
  } | null;
}

/**
 * V2 產生 401 申報書資料
 * - 使用 declared_period_id 篩選（有時 fallback 到 date range）
 * - 使用 classifyPurchaseInvoices 分類進項
 * - 使用 calculateTaxAmountsV2 計算稅額
 */
export async function generateForm401V2(
  db: SupabaseClient,
  companyId: string,
  companyTaxId: string,
  companyName: string,
  year: number,
  biMonth: number,
): Promise<Form401DataV2> {
  const period = calculateTaxPeriod(year, biMonth);

  // 取得公司設定（兼營比例）
  const company = await getCompanyById(db, companyId);
  const nonDeductibleRatio = company?.mixed_deduction_ratio ?? 0;

  // 取得或建立申報期別
  const declaration = await getOrCreateTaxDeclaration(
    db,
    companyId,
    year,
    biMonth,
  );

  // 以 declared_period_id 篩選（若有分配），否則 fallback 到日期範圍
  const useDeclarationFilter = true;

  const queryBase = {
    companyId,
    status: "POSTED" as const,
    limit: 10000,
    offset: 0,
  };

  const [outputInvoices, inputInvoices] = await Promise.all([
    getInvoices(db, {
      ...queryBase,
      type: "OUTPUT" as const,
      ...(useDeclarationFilter
        ? { declaredPeriodId: declaration.id }
        : { startDate: period.startDate, endDate: period.endDate }),
    }),
    getInvoices(db, {
      ...queryBase,
      type: "INPUT" as const,
      ...(useDeclarationFilter
        ? { declaredPeriodId: declaration.id }
        : { startDate: period.startDate, endDate: period.endDate }),
    }),
  ]);

  // 也取得未分配期別但日期在範圍內的發票（draft 模式自動關聯）
  if (declaration.status === "draft") {
    const [unassignedOutput, unassignedInput] = await Promise.all([
      getInvoices(db, {
        ...queryBase,
        type: "OUTPUT" as const,
        startDate: period.startDate,
        endDate: period.endDate,
      }),
      getInvoices(db, {
        ...queryBase,
        type: "INPUT" as const,
        startDate: period.startDate,
        endDate: period.endDate,
      }),
    ]);

    // 合併未分配的發票（避免重複）
    const existingOutputIds = new Set(outputInvoices.map((i) => i.id));
    const existingInputIds = new Set(inputInvoices.map((i) => i.id));

    for (const inv of unassignedOutput) {
      if (!existingOutputIds.has(inv.id) && !inv.declared_period_id) {
        outputInvoices.push(inv);
      }
    }
    for (const inv of unassignedInput) {
      if (!existingInputIds.has(inv.id) && !inv.declared_period_id) {
        inputInvoices.push(inv);
      }
    }
  }

  // 分類銷項
  const salesTaxable: InvoiceDetail[] = [];
  const salesZeroRated: InvoiceDetail[] = [];
  const salesExempt: InvoiceDetail[] = [];
  let salesReturnCount = 0;
  let salesReturnAmount = 0;
  let salesReturnTax = 0;

  for (const inv of outputInvoices) {
    if (inv.status === "VOIDED") continue;
    const detail = invoiceToDetail(inv);
    const returnType = (inv as AccInvoice & { return_type?: string })
      .return_type;

    if (returnType === "RETURN" || returnType === "ALLOWANCE") {
      salesReturnCount += 1;
      salesReturnAmount += detail.untaxedAmount;
      salesReturnTax += detail.taxAmount;
      continue;
    }

    switch (detail.taxCategory) {
      case "TAXABLE_5":
        salesTaxable.push(detail);
        break;
      case "ZERO_RATED":
        salesZeroRated.push(detail);
        break;
      case "EXEMPT":
        salesExempt.push(detail);
        break;
    }
  }

  // 建立稅碼對照表（用於判斷進項扣抵性）
  const taxCodeIds = [
    ...new Set(
      inputInvoices
        .filter((inv) => inv.tax_code_id)
        .map((inv) => inv.tax_code_id as string),
    ),
  ];
  const taxCodeMap = new Map<string, TaxCode>();
  if (taxCodeIds.length > 0) {
    const allTaxCodes = await getTaxCodes(db, {});
    for (const tc of allTaxCodes) {
      if (taxCodeIds.includes(tc.id)) {
        taxCodeMap.set(tc.id, tc);
      }
    }
  }

  // 分類進項（使用 V2 分類器 + 稅碼扣抵判斷）
  const classifiedPurchases = classifyPurchaseInvoices(
    inputInvoices,
    taxCodeMap,
  );

  // 統計進項退出
  let purchaseReturnCount = 0;
  let purchaseReturnAmount = 0;
  let purchaseReturnTax = 0;

  for (const inv of inputInvoices) {
    if (inv.status === "VOIDED") continue;
    const returnType = (inv as AccInvoice & { return_type?: string })
      .return_type;
    if (returnType === "RETURN" || returnType === "ALLOWANCE") {
      purchaseReturnCount += 1;
      purchaseReturnAmount += parseFloat(String(inv.untaxed_amount)) || 0;
      purchaseReturnTax += parseFloat(String(inv.tax_amount)) || 0;
    }
  }

  // 統計作廢發票
  const voidedCount =
    outputInvoices.filter((i) => i.status === "VOIDED").length +
    inputInvoices.filter((i) => i.status === "VOIDED").length;

  // 稅額計算
  const taxableUntaxed = salesTaxable.reduce((s, d) => s + d.untaxedAmount, 0);
  const taxableTax = salesTaxable.reduce((s, d) => s + d.taxAmount, 0);
  const zeroRatedAmount = salesZeroRated.reduce(
    (s, d) => s + d.untaxedAmount,
    0,
  );
  const exemptAmount = salesExempt.reduce((s, d) => s + d.untaxedAmount, 0);

  // 退出折讓淨調整：進項退出稅 - 銷項退回稅（進項退出減少可扣抵 → 增加應繳）
  const returnAllowanceTax = purchaseReturnTax - salesReturnTax;

  const taxResult = calculateTaxAmountsV2({
    outputTax: taxableTax,
    inputTax: classifiedPurchases.goodsAndExpenses.deductible.taxAmount,
    fixedAssetInputTax: classifiedPurchases.fixedAssets.deductible.taxAmount,
    returnAllowanceTax,
    openingOffset: declaration.opening_offset_amount,
    itemNonDeductibleTax:
      classifiedPurchases.goodsAndExpenses.nonDeductible.taxAmount +
      classifiedPurchases.fixedAssets.nonDeductible.taxAmount,
    nonDeductibleRatio,
  });

  return {
    period: {
      year,
      month: period.month,
      biMonth,
    },
    companyInfo: {
      companyId,
      taxId: companyTaxId,
      companyName,
    },
    sales: {
      taxable: {
        count: salesTaxable.length,
        untaxedAmount: taxableUntaxed,
        taxAmount: taxableTax,
        invoices: salesTaxable,
      },
      zeroRated: {
        count: salesZeroRated.length,
        untaxedAmount: zeroRatedAmount,
        invoices: salesZeroRated,
      },
      exempt: {
        count: salesExempt.length,
        untaxedAmount: exemptAmount,
        invoices: salesExempt,
      },
    },
    purchases: classifiedPurchases,
    purchaseInvoices: inputInvoices
      .filter((inv) => inv.status !== "VOIDED")
      .map((inv) => {
        const detail = invoiceToDetail(inv);
        const taxCode = inv.tax_code_id
          ? taxCodeMap.get(inv.tax_code_id)
          : null;
        return { ...detail, isDeductible: isInputInvoiceDeductible(taxCode) };
      }),
    returnsAndAllowances: {
      salesReturns: {
        count: salesReturnCount,
        amount: salesReturnAmount,
        tax: salesReturnTax,
      },
      purchaseReturns: {
        count: purchaseReturnCount,
        amount: purchaseReturnAmount,
        tax: purchaseReturnTax,
      },
    },
    voidedInvoices: { count: voidedCount },
    taxCalculation: taxResult,
    declaration: {
      id: declaration.id,
      status: declaration.status,
    },
    summary: {
      totalSalesCount: outputInvoices.filter((i) => i.status !== "VOIDED")
        .length,
      totalSalesAmount: taxableUntaxed + zeroRatedAmount + exemptAmount,
      totalPurchasesCount: inputInvoices.filter((i) => i.status !== "VOIDED")
        .length,
      totalPurchasesAmount:
        classifiedPurchases.goodsAndExpenses.deductible.untaxedAmount +
        classifiedPurchases.goodsAndExpenses.nonDeductible.untaxedAmount +
        classifiedPurchases.fixedAssets.deductible.untaxedAmount +
        classifiedPurchases.fixedAssets.nonDeductible.untaxedAmount +
        classifiedPurchases.exempt.untaxedAmount +
        classifiedPurchases.zeroRate.untaxedAmount,
      generatedAt: new Date().toISOString(),
    },
  };
}
