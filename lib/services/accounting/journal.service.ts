/**
 * 會計傳票業務邏輯服務
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import {
  JournalEntry,
  JournalEntryWithTransactions,
  CreateJournalInput,
  CreateTransactionInput,
  JournalQueryOptions,
  JournalStatus,
  TransactionSource,
  TrialBalanceItem,
  getJournalEntries,
  getJournalEntryById,
  getJournalByNumber,
  getJournalByInvoiceId,
  createJournalWithTransactions,
  createJournalWithTransactionsRpc,
  postJournalEntry,
  postJournalEntryRpc,
  voidJournalEntry,
  voidJournalEntryRpc,
  deleteJournalEntry,
  getTrialBalance,
  getTrialBalanceRpc,
} from '@/lib/dal/accounting'

// ============================================
// 類型定義
// ============================================

export interface JournalListResult {
  journals: JournalEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateJournalRequest {
  company_id: string
  date: string
  description?: string
  source_type?: TransactionSource
  invoice_id?: string
  is_auto_generated?: boolean
  transactions: Array<{
    account_id: string
    description?: string
    debit: number
    credit: number
  }>
}

// ============================================
// 查詢服務
// ============================================

/**
 * 取得傳票列表（分頁）
 */
export async function listJournalEntries(
  db: SupabaseClient,
  options: JournalQueryOptions & { page?: number; pageSize?: number }
): Promise<JournalListResult> {
  const page = options.page || 1
  const pageSize = options.pageSize || 20
  const offset = (page - 1) * pageSize

  const journals = await getJournalEntries(db, {
    ...options,
    limit: pageSize,
    offset,
  })

  // 取得總數
  const allJournals = await getJournalEntries(db, {
    ...options,
    limit: 10000,
    offset: 0,
  })

  return {
    journals,
    total: allJournals.length,
    page,
    pageSize,
    totalPages: Math.ceil(allJournals.length / pageSize),
  }
}

/**
 * 取得傳票詳情（含分錄）
 */
export async function getJournalDetail(
  db: SupabaseClient,
  journalId: string
): Promise<JournalEntryWithTransactions | null> {
  return getJournalEntryById(db, journalId)
}

/**
 * 根據編號查詢傳票
 */
export async function findJournalByNumber(
  db: SupabaseClient,
  journalNumber: string
): Promise<JournalEntry | null> {
  return getJournalByNumber(db, journalNumber)
}

/**
 * 根據發票 ID 查詢傳票
 */
export async function findJournalByInvoice(
  db: SupabaseClient,
  invoiceId: string
): Promise<JournalEntry | null> {
  return getJournalByInvoiceId(db, invoiceId)
}

/**
 * 取得試算表
 */
export async function getTrialBalanceReport(
  db: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string,
  useRpc: boolean = true
): Promise<TrialBalanceItem[]> {
  if (useRpc) {
    return getTrialBalanceRpc(db, companyId, startDate, endDate)
  }
  return getTrialBalance(db, companyId, startDate, endDate)
}

// ============================================
// 寫入服務
// ============================================

/**
 * 建立傳票（含分錄）
 */
export async function createNewJournal(
  db: SupabaseClient,
  request: CreateJournalRequest,
  useRpc: boolean = true
): Promise<JournalEntryWithTransactions | { id: string; journal_number: string; status: JournalStatus }> {
  // 驗證分錄
  if (!request.transactions || request.transactions.length === 0) {
    throw new Error('傳票必須包含至少一筆分錄')
  }

  // 驗證借貸平衡
  const totalDebit = request.transactions.reduce((sum, tx) => sum + (tx.debit || 0), 0)
  const totalCredit = request.transactions.reduce((sum, tx) => sum + (tx.credit || 0), 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`借貸不平衡：借方 ${totalDebit}，貸方 ${totalCredit}`)
  }

  // 驗證每筆分錄必須有借或貸
  for (let i = 0; i < request.transactions.length; i++) {
    const tx = request.transactions[i]
    if ((tx.debit || 0) === 0 && (tx.credit || 0) === 0) {
      throw new Error(`第 ${i + 1} 筆分錄的借方和貸方都是 0`)
    }
    if ((tx.debit || 0) > 0 && (tx.credit || 0) > 0) {
      throw new Error(`第 ${i + 1} 筆分錄不能同時有借方和貸方金額`)
    }
  }

  if (useRpc) {
    return createJournalWithTransactionsRpc(
      db,
      request.company_id,
      {
        date: request.date,
        description: request.description,
        source_type: request.source_type,
        invoice_id: request.invoice_id,
        is_auto_generated: request.is_auto_generated,
      },
      request.transactions
    )
  }

  const journalInput: CreateJournalInput = {
    company_id: request.company_id,
    date: request.date,
    description: request.description,
    source_type: request.source_type || 'MANUAL',
  }

  const transactionInputs: CreateTransactionInput[] = request.transactions.map((tx) => ({
    account_id: tx.account_id,
    description: tx.description,
    debit: tx.debit || 0,
    credit: tx.credit || 0,
  }))

  return createJournalWithTransactions(db, journalInput, transactionInputs)
}

/**
 * 過帳傳票
 */
export async function postJournalById(
  db: SupabaseClient,
  journalId: string,
  postedBy: string,
  useRpc: boolean = true
): Promise<JournalEntry | { journal_id: string; status: string }> {
  const existing = await getJournalEntryById(db, journalId)
  if (!existing) {
    throw new Error('傳票不存在')
  }

  if (existing.status !== 'DRAFT') {
    throw new Error('只能過帳草稿狀態的傳票')
  }

  if (existing.transactions.length === 0) {
    throw new Error('傳票沒有分錄，無法過帳')
  }

  if (useRpc) {
    return postJournalEntryRpc(db, journalId, postedBy)
  }

  return postJournalEntry(db, journalId, postedBy)
}

/**
 * 作廢傳票
 */
export async function voidJournalById(
  db: SupabaseClient,
  journalId: string,
  voidedBy: string,
  reason: string,
  useRpc: boolean = true
): Promise<JournalEntry | { journal_id: string; status: string }> {
  const existing = await getJournalEntryById(db, journalId)
  if (!existing) {
    throw new Error('傳票不存在')
  }

  if (existing.status === 'VOIDED') {
    throw new Error('傳票已作廢')
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error('請填寫作廢原因')
  }

  if (useRpc) {
    return voidJournalEntryRpc(db, journalId, voidedBy, reason)
  }

  return voidJournalEntry(db, journalId, reason)
}

/**
 * 刪除傳票（僅限草稿）
 */
export async function deleteJournalById(
  db: SupabaseClient,
  journalId: string
): Promise<void> {
  const existing = await getJournalEntryById(db, journalId)
  if (!existing) {
    throw new Error('傳票不存在')
  }

  if (existing.status !== 'DRAFT') {
    throw new Error('只能刪除草稿狀態的傳票')
  }

  return deleteJournalEntry(db, journalId)
}

// ============================================
// 財務報表輔助
// ============================================

/**
 * 計算科目餘額
 */
export function calculateAccountBalance(trialBalance: TrialBalanceItem[]): {
  assets: number
  liabilities: number
  equity: number
  revenue: number
  expense: number
} {
  const result = {
    assets: 0,
    liabilities: 0,
    equity: 0,
    revenue: 0,
    expense: 0,
  }

  for (const item of trialBalance) {
    const balance = item.closing_debit - item.closing_credit

    switch (item.account_category) {
      case 'ASSET':
        result.assets += balance
        break
      case 'LIABILITY':
        result.liabilities -= balance // 貸方餘額為正
        break
      case 'EQUITY':
        result.equity -= balance // 貸方餘額為正
        break
      case 'REVENUE':
        result.revenue -= balance // 貸方餘額為正
        break
      case 'EXPENSE':
        result.expense += balance
        break
    }
  }

  return result
}

/**
 * 損益表項目格式
 */
export interface IncomeStatementItem {
  accountCode: string
  accountName: string
  amount: number
}

/**
 * 損益表資料格式（符合前端期望）
 */
export interface IncomeStatementData {
  revenue: { items: IncomeStatementItem[]; total: number }
  expenses: { items: IncomeStatementItem[]; total: number }
  netIncome: number
}

/**
 * 產生損益表資料
 * 返回格式符合前端 ReportsDashboard 期望的結構
 */
export async function generateIncomeStatement(
  db: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<IncomeStatementData> {
  const trialBalance = await getTrialBalanceReport(db, companyId, startDate, endDate)

  const revenueItems = trialBalance.filter((item) => item.account_category === 'REVENUE')
  const expenseItems = trialBalance.filter((item) => item.account_category === 'EXPENSE')

  // 計算收入總額（貸方餘額為正）
  const totalRevenue = revenueItems.reduce((sum, item) => sum + (item.closing_credit - item.closing_debit), 0)
  // 計算費用總額（借方餘額為正）
  const totalExpenses = expenseItems.reduce((sum, item) => sum + (item.closing_debit - item.closing_credit), 0)

  // 轉換為前端期望的格式
  const revenue = {
    items: revenueItems.map((item) => ({
      accountCode: item.account_code,
      accountName: item.account_name,
      amount: item.closing_credit - item.closing_debit,
    })),
    total: totalRevenue,
  }

  const expenses = {
    items: expenseItems.map((item) => ({
      accountCode: item.account_code,
      accountName: item.account_name,
      amount: item.closing_debit - item.closing_credit,
    })),
    total: totalExpenses,
  }

  return {
    revenue,
    expenses,
    netIncome: totalRevenue - totalExpenses,
  }
}

/**
 * 資產負債表項目格式
 */
export interface BalanceSheetItem {
  accountCode: string
  accountName: string
  balance: number
}

/**
 * 資產負債表資料格式（符合前端期望）
 */
export interface BalanceSheetData {
  assets: { items: BalanceSheetItem[]; total: number }
  liabilities: { items: BalanceSheetItem[]; total: number }
  equity: { items: BalanceSheetItem[]; total: number }
}

/**
 * 產生資產負債表資料
 * 返回格式符合前端 ReportsDashboard 期望的結構
 */
export async function generateBalanceSheet(
  db: SupabaseClient,
  companyId: string,
  asOfDate: string
): Promise<BalanceSheetData> {
  // 資產負債表是累計至某日期的餘額
  const trialBalance = await getTrialBalanceReport(db, companyId, '1900-01-01', asOfDate)

  const assetItems = trialBalance.filter((item) => item.account_category === 'ASSET')
  const liabilityItems = trialBalance.filter((item) => item.account_category === 'LIABILITY')
  const equityItems = trialBalance.filter((item) => item.account_category === 'EQUITY')

  // 計算總額
  const totalAssets = assetItems.reduce((sum, item) => sum + (item.closing_debit - item.closing_credit), 0)
  const totalLiabilities = liabilityItems.reduce((sum, item) => sum + (item.closing_credit - item.closing_debit), 0)
  const totalEquity = equityItems.reduce((sum, item) => sum + (item.closing_credit - item.closing_debit), 0)

  // 轉換為前端期望的格式
  const assets = {
    items: assetItems.map((item) => ({
      accountCode: item.account_code,
      accountName: item.account_name,
      balance: item.closing_debit - item.closing_credit,
    })),
    total: totalAssets,
  }

  const liabilities = {
    items: liabilityItems.map((item) => ({
      accountCode: item.account_code,
      accountName: item.account_name,
      balance: item.closing_credit - item.closing_debit,
    })),
    total: totalLiabilities,
  }

  const equity = {
    items: equityItems.map((item) => ({
      accountCode: item.account_code,
      accountName: item.account_name,
      balance: item.closing_credit - item.closing_debit,
    })),
    total: totalEquity,
  }

  return {
    assets,
    liabilities,
    equity,
  }
}
