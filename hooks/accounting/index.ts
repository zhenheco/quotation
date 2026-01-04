/**
 * 會計模組 React Query Hooks
 * Account-system → quotation-system 整合
 */

// 發票
export {
  invoiceKeys,
  useInvoices,
  useInvoice,
  useInvoiceSummary,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useVerifyInvoice,
  usePostInvoice,
  useVoidInvoice,
  useRecordPayment,
} from './use-invoices'

// 傳票
export {
  journalKeys,
  useJournals,
  useJournal,
  useCreateJournal,
  useUpdateJournal,
  useDeleteJournal,
  usePostJournal,
  useVoidJournal,
} from './use-journals'

// 報表
export {
  reportKeys,
  useTrialBalance,
  useIncomeStatement,
  useBalanceSheet,
} from './use-reports'

// 營業稅申報
export {
  taxReportKeys,
  useForm401,
  useForm403,
  useDownloadTaxXml,
  useDownloadMediaFile,
  useInvoiceDetails,
  useInvalidateTaxReports,
} from './use-tax-reports'
export type { TaxReportParams, InvoiceDetailListResult } from './use-tax-reports'

// 營所稅申報（擴大書審）
export {
  incomeTaxKeys,
  useExpandedAuditPreview,
  useIncomeTaxFilings,
  useIncomeTaxSummary,
  useProfitRates,
  useCalculateAndSave,
  useSearchProfitRates,
  useInvalidateIncomeTax,
} from './use-income-tax'
export type {
  AnnualRevenueSummary,
  EligibilityCheckResult,
  ExpandedAuditResult,
  IncomeTaxFilingStatus,
  IncomeTaxFiling,
  IndustryProfitRate,
  FilingSummary,
  PreviewParams,
  CalculateAndSaveParams,
  SearchProfitRatesParams,
} from './use-income-tax'
