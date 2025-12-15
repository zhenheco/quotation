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
