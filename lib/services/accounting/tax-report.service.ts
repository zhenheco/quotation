/**
 * 營業稅申報服務
 * 處理 401（營業稅申報書）與 403（零稅率銷售額申報書）申報資料計算
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import { AccInvoice, getInvoices } from '@/lib/dal/accounting'
import {
  generateMediaFile,
  invoiceDetailToMediaData,
  type MediaFileResult,
  type MediaInvoiceData,
  type MediaFileOptions,
} from './media-file-generator'

// ============================================
// 類型定義
// ============================================

/**
 * 稅類別
 */
export type TaxCategory = 'TAXABLE_5' | 'ZERO_RATED' | 'EXEMPT' | 'NON_TAXABLE'

/**
 * 發票明細資料
 */
export interface InvoiceDetail {
  invoiceId: string
  invoiceNumber: string
  date: string
  counterpartyName: string
  counterpartyTaxId: string
  untaxedAmount: number
  taxAmount: number
  totalAmount: number
  taxCategory: TaxCategory
}

/**
 * 401 申報書資料
 */
export interface Form401Data {
  // 申報基本資訊
  period: {
    year: number
    month: number // 1-12，單數月份
    biMonth: number // 1-6，代表 1-2月、3-4月...
  }
  companyInfo: {
    companyId: string
    taxId: string
    companyName: string
  }

  // 銷項發票（OUTPUT）
  sales: {
    // 應稅銷售額（5%）
    taxable: {
      count: number
      untaxedAmount: number
      taxAmount: number
      invoices: InvoiceDetail[]
    }
    // 零稅率銷售額
    zeroRated: {
      count: number
      untaxedAmount: number
      invoices: InvoiceDetail[]
    }
    // 免稅銷售額
    exempt: {
      count: number
      untaxedAmount: number
      invoices: InvoiceDetail[]
    }
  }

  // 進項發票（INPUT）
  purchases: {
    // 可扣抵進項
    deductible: {
      count: number
      untaxedAmount: number
      taxAmount: number
      invoices: InvoiceDetail[]
    }
    // 不可扣抵進項
    nonDeductible: {
      count: number
      untaxedAmount: number
      taxAmount: number
      invoices: InvoiceDetail[]
    }
  }

  // 稅額計算
  taxCalculation: {
    outputTax: number // 銷項稅額
    inputTax: number // 進項稅額
    netTax: number // 應納（退）稅額 = 銷項 - 進項
    isRefund: boolean // 是否為退稅
  }

  // 統計資料
  summary: {
    totalSalesCount: number
    totalSalesAmount: number
    totalPurchasesCount: number
    totalPurchasesAmount: number
    generatedAt: string
  }
}

/**
 * 403 申報書資料（零稅率銷售額清單）
 */
export interface Form403Data {
  period: {
    year: number
    month: number
    biMonth: number
  }
  companyInfo: {
    companyId: string
    taxId: string
    companyName: string
  }

  // 零稅率銷售明細
  zeroRatedSales: {
    // 外銷貨物
    exports: {
      count: number
      amount: number
      invoices: InvoiceDetail[]
    }
    // 與外銷有關之勞務或在國內提供而在國外使用之勞務
    exportServices: {
      count: number
      amount: number
      invoices: InvoiceDetail[]
    }
    // 其他零稅率
    others: {
      count: number
      amount: number
      invoices: InvoiceDetail[]
    }
    total: {
      count: number
      amount: number
    }
  }

  generatedAt: string
}

/**
 * 申報期間
 */
export interface TaxPeriod {
  year: number
  month: number // 奇數月份 (1, 3, 5, 7, 9, 11)
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
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
  const startMonth = (biMonth - 1) * 2 + 1
  const endMonth = startMonth + 1

  const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`

  // 計算月底日期
  const lastDayOfMonth = new Date(year, endMonth, 0).getDate()
  const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`

  return {
    year,
    month: endMonth, // 以結束月份為申報月份
    startDate,
    endDate,
  }
}

/**
 * 根據發票判斷稅類別
 */
function determineTaxCategory(invoice: AccInvoice): TaxCategory {
  const taxAmount = parseFloat(String(invoice.tax_amount)) || 0
  const untaxedAmount = parseFloat(String(invoice.untaxed_amount)) || 0

  if (taxAmount === 0 && untaxedAmount > 0) {
    // 需要根據 tax_code_id 或其他欄位判斷是零稅率還是免稅
    // 這裡簡化處理：假設有設定 tax_code_id 的為零稅率，否則為免稅
    if (invoice.tax_code_id) {
      return 'ZERO_RATED'
    }
    return 'EXEMPT'
  }

  if (taxAmount > 0) {
    return 'TAXABLE_5'
  }

  return 'NON_TAXABLE'
}

/**
 * 將發票轉換為明細資料
 */
function invoiceToDetail(invoice: AccInvoice): InvoiceDetail {
  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    date: invoice.date,
    counterpartyName: invoice.counterparty_name || '',
    counterpartyTaxId: invoice.counterparty_tax_id || '',
    untaxedAmount: parseFloat(String(invoice.untaxed_amount)) || 0,
    taxAmount: parseFloat(String(invoice.tax_amount)) || 0,
    totalAmount: parseFloat(String(invoice.total_amount)) || 0,
    taxCategory: determineTaxCategory(invoice),
  }
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
  biMonth: number
): Promise<Form401Data> {
  const period = calculateTaxPeriod(year, biMonth)

  // 取得期間內所有已過帳的發票
  const [outputInvoices, inputInvoices] = await Promise.all([
    getInvoices(db, {
      companyId,
      type: 'OUTPUT',
      status: 'POSTED',
      startDate: period.startDate,
      endDate: period.endDate,
      limit: 10000,
      offset: 0,
    }),
    getInvoices(db, {
      companyId,
      type: 'INPUT',
      status: 'POSTED',
      startDate: period.startDate,
      endDate: period.endDate,
      limit: 10000,
      offset: 0,
    }),
  ])

  // 分類銷項發票
  const salesTaxable: InvoiceDetail[] = []
  const salesZeroRated: InvoiceDetail[] = []
  const salesExempt: InvoiceDetail[] = []

  for (const inv of outputInvoices) {
    const detail = invoiceToDetail(inv)
    switch (detail.taxCategory) {
      case 'TAXABLE_5':
        salesTaxable.push(detail)
        break
      case 'ZERO_RATED':
        salesZeroRated.push(detail)
        break
      case 'EXEMPT':
        salesExempt.push(detail)
        break
    }
  }

  // 分類進項發票（簡化：假設所有進項都可扣抵）
  const purchasesDeductible: InvoiceDetail[] = []
  const purchasesNonDeductible: InvoiceDetail[] = []

  for (const inv of inputInvoices) {
    const detail = invoiceToDetail(inv)
    // 實務上需要根據進項來源判斷是否可扣抵
    // 這裡簡化處理：有稅額的進項都可扣抵
    if (detail.taxAmount > 0) {
      purchasesDeductible.push(detail)
    } else {
      purchasesNonDeductible.push(detail)
    }
  }

  // 計算統計數據
  const taxableUntaxed = salesTaxable.reduce((sum, d) => sum + d.untaxedAmount, 0)
  const taxableTax = salesTaxable.reduce((sum, d) => sum + d.taxAmount, 0)
  const zeroRatedAmount = salesZeroRated.reduce((sum, d) => sum + d.untaxedAmount, 0)
  const exemptAmount = salesExempt.reduce((sum, d) => sum + d.untaxedAmount, 0)

  const deductibleUntaxed = purchasesDeductible.reduce((sum, d) => sum + d.untaxedAmount, 0)
  const deductibleTax = purchasesDeductible.reduce((sum, d) => sum + d.taxAmount, 0)
  const nonDeductibleUntaxed = purchasesNonDeductible.reduce((sum, d) => sum + d.untaxedAmount, 0)
  const nonDeductibleTax = purchasesNonDeductible.reduce((sum, d) => sum + d.taxAmount, 0)

  // 稅額計算
  const outputTax = taxableTax
  const inputTax = deductibleTax
  const netTax = outputTax - inputTax

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
  }
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
  biMonth: number
): Promise<Form403Data> {
  const period = calculateTaxPeriod(year, biMonth)

  // 取得期間內所有已過帳的銷項發票
  const outputInvoices = await getInvoices(db, {
    companyId,
    type: 'OUTPUT',
    status: 'POSTED',
    startDate: period.startDate,
    endDate: period.endDate,
    limit: 10000,
    offset: 0,
  })

  // 篩選零稅率發票
  const zeroRatedInvoices = outputInvoices.filter((inv) => {
    const taxAmount = parseFloat(String(inv.tax_amount)) || 0
    const untaxedAmount = parseFloat(String(inv.untaxed_amount)) || 0
    // 零稅率：有銷售額但無稅額，且有設定 tax_code_id
    return taxAmount === 0 && untaxedAmount > 0 && inv.tax_code_id
  })

  // 分類零稅率發票（簡化處理：全部歸類為外銷貨物）
  // 實務上需要根據發票附註或其他欄位判斷
  const exports = zeroRatedInvoices.map(invoiceToDetail)

  const totalAmount = exports.reduce((sum, d) => sum + d.untaxedAmount, 0)

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
  }
}

// ============================================
// XML 匯出（電子申報格式）
// ============================================

/**
 * 產生 401 申報書 XML
 * 格式符合財政部電子申報規範
 */
export function generateForm401Xml(data: Form401Data): string {
  const { period, companyInfo, sales, purchases, taxCalculation } = data

  // 格式化金額（無小數點）
  const formatAmount = (n: number): string => Math.round(n).toString()

  // XML 格式
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<VAT401>
  <Header>
    <Year>${period.year}</Year>
    <Period>${String(period.biMonth).padStart(2, '0')}</Period>
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
    <IsRefund>${taxCalculation.isRefund ? 'Y' : 'N'}</IsRefund>
  </TaxCalculation>
</VAT401>`

  return xml
}

/**
 * 產生 403 申報書 XML
 */
export function generateForm403Xml(data: Form403Data): string {
  const { period, companyInfo, zeroRatedSales } = data

  const formatAmount = (n: number): string => Math.round(n).toString()

  // 發票明細
  const invoiceItems = zeroRatedSales.exports.invoices
    .map(
      (inv) => `    <Invoice>
      <Number>${escapeXml(inv.invoiceNumber)}</Number>
      <Date>${inv.date}</Date>
      <BuyerTaxId>${escapeXml(inv.counterpartyTaxId)}</BuyerTaxId>
      <BuyerName>${escapeXml(inv.counterpartyName)}</BuyerName>
      <Amount>${formatAmount(inv.untaxedAmount)}</Amount>
    </Invoice>`
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<VAT403>
  <Header>
    <Year>${period.year}</Year>
    <Period>${String(period.biMonth).padStart(2, '0')}</Period>
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
</VAT403>`

  return xml
}

/**
 * 從可能是物件或字串的公司名稱中提取字串
 * 處理多語言物件 {en: 'xxx', zh: 'xxx'} 或嵌套結構
 */
function ensureString(value: unknown, locale: string = 'zh'): string {
  // 已經是字串，直接返回
  if (typeof value === 'string') return value

  // 是物件，嘗試提取
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>

    // 優先嘗試當前語系
    if (locale in obj && typeof obj[locale] === 'string') {
      return obj[locale] as string
    }

    // 回退到中文
    if ('zh' in obj && typeof obj.zh === 'string') {
      return obj.zh as string
    }

    // 回退到英文
    if ('en' in obj && typeof obj.en === 'string') {
      return obj.en as string
    }

    // 嘗試 name 屬性
    if ('name' in obj && typeof obj.name === 'string') {
      return obj.name as string
    }
  }

  return ''
}

/**
 * XML 特殊字元跳脫
 */
function escapeXml(str: unknown): string {
  // 確保輸入是字串
  const safeStr = ensureString(str)
  return safeStr
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
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
  type: 'OUTPUT' | 'INPUT',
  startDate: string,
  endDate: string
): Promise<{
  invoices: InvoiceDetail[]
  summary: {
    count: number
    untaxedAmount: number
    taxAmount: number
    totalAmount: number
  }
}> {
  const invoices = await getInvoices(db, {
    companyId,
    type,
    status: 'POSTED',
    startDate,
    endDate,
    limit: 10000,
    offset: 0,
  })

  const details = invoices.map(invoiceToDetail)

  const summary = details.reduce(
    (acc, inv) => ({
      count: acc.count + 1,
      untaxedAmount: acc.untaxedAmount + inv.untaxedAmount,
      taxAmount: acc.taxAmount + inv.taxAmount,
      totalAmount: acc.totalAmount + inv.totalAmount,
    }),
    { count: 0, untaxedAmount: 0, taxAmount: 0, totalAmount: 0 }
  )

  return { invoices: details, summary }
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
  taxRegistrationNumber?: string
): MediaFileResult {
  // 如果沒有提供稅籍編號，使用公司統編 + 0（總公司）
  const taxRegNum = taxRegistrationNumber || form401Data.companyInfo.taxId + '0'

  // 轉換發票資料為媒體檔格式
  const mediaInvoices: MediaInvoiceData[] = []

  // 銷項發票（應稅）
  for (const inv of form401Data.sales.taxable.invoices) {
    mediaInvoices.push(invoiceDetailToMediaData(inv, 'OUTPUT'))
  }

  // 銷項發票（零稅率）
  for (const inv of form401Data.sales.zeroRated.invoices) {
    mediaInvoices.push(invoiceDetailToMediaData(inv, 'OUTPUT'))
  }

  // 銷項發票（免稅）
  for (const inv of form401Data.sales.exempt.invoices) {
    mediaInvoices.push(invoiceDetailToMediaData(inv, 'OUTPUT'))
  }

  // 進項發票（可扣抵）
  for (const inv of form401Data.purchases.deductible.invoices) {
    const mediaData = invoiceDetailToMediaData(inv, 'INPUT')
    mediaData.isDeductible = true
    mediaInvoices.push(mediaData)
  }

  // 進項發票（不可扣抵）
  for (const inv of form401Data.purchases.nonDeductible.invoices) {
    const mediaData = invoiceDetailToMediaData(inv, 'INPUT')
    mediaData.isDeductible = false
    mediaInvoices.push(mediaData)
  }

  // 媒體檔產生選項
  const options: MediaFileOptions = {
    taxRegistrationNumber: taxRegNum,
    year: form401Data.period.year,
    biMonth: form401Data.period.biMonth,
  }

  // 產生媒體檔
  return generateMediaFile(mediaInvoices, options)
}
