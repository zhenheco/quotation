/**
 * 會計系統 DAL 模組索引
 * Account-system → quotation-system 整合
 */

// 會計科目
export * from './accounts.dal'

// 發票
export * from './invoices.dal'

// 傳票與分錄
export * from './journals.dal'

// 稅碼
export * from './tax-codes.dal'

// 往來對象
export * from './counterparties.dal'

// 銀行相關
export * from './bank-accounts.dal'

// 行業純益率
export * from './profit-rates.dal'

// 營所稅擴大書審
export * from './expanded-audit.dal'
