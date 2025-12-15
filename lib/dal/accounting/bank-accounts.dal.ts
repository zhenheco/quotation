/**
 * 銀行帳戶與對帳資料存取層 (DAL)
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================
// 類型定義
// ============================================

export type ReconciliationStatus = 'UNRECONCILED' | 'MATCHED' | 'EXCEPTION'
export type ImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface BankAccount {
  id: string
  company_id: string
  account_number: string
  bank_code: string
  bank_name: string
  branch_name: string | null
  currency: string
  opening_balance: number
  current_balance: number
  account_id: string
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface BankTransaction {
  id: string
  company_id: string
  bank_account_id: string
  import_id: string | null
  transaction_date: string
  description: string
  debit: number
  credit: number
  balance: number
  reconciliation_status: ReconciliationStatus
  matched_invoice_id: string | null
  match_confidence: number | null
  match_method: string | null
  created_at: string
  updated_at: string
}

export interface BankStatementImport {
  id: string
  company_id: string
  bank_account_id: string
  file_name: string
  file_type: string
  period_start: string
  period_end: string
  total_records: number
  status: ImportStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface CreateBankAccountInput {
  company_id: string
  account_number: string
  bank_code: string
  bank_name: string
  branch_name?: string
  currency?: string
  opening_balance?: number
  account_id: string
  is_default?: boolean
}

export interface UpdateBankAccountInput {
  bank_name?: string
  branch_name?: string
  is_active?: boolean
  is_default?: boolean
}

export interface CreateBankTransactionInput {
  company_id: string
  bank_account_id: string
  import_id?: string
  transaction_date: string
  description: string
  debit?: number
  credit?: number
  balance: number
}

export interface BankAccountQueryOptions {
  companyId: string
  isActive?: boolean
}

export interface BankTransactionQueryOptions {
  companyId: string
  bankAccountId: string
  status?: ReconciliationStatus
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

// ============================================
// 銀行帳戶查詢函數
// ============================================

/**
 * 取得銀行帳戶列表
 */
export async function getBankAccounts(
  db: SupabaseClient,
  options: BankAccountQueryOptions
): Promise<BankAccount[]> {
  const { companyId, isActive = true } = options

  let query = db
    .from('bank_accounts')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('bank_name', { ascending: true })

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得銀行帳戶失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得銀行帳戶
 */
export async function getBankAccountById(
  db: SupabaseClient,
  bankAccountId: string
): Promise<BankAccount | null> {
  const { data, error } = await db
    .from('bank_accounts')
    .select('*')
    .eq('id', bankAccountId)
    .is('deleted_at', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得銀行帳戶失敗: ${error.message}`)
  }

  return data
}

/**
 * 取得預設銀行帳戶
 */
export async function getDefaultBankAccount(
  db: SupabaseClient,
  companyId: string
): Promise<BankAccount | null> {
  const { data, error } = await db
    .from('bank_accounts')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_default', true)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`取得預設銀行帳戶失敗: ${error.message}`)
  }

  return data
}

// ============================================
// 銀行交易查詢函數
// ============================================

/**
 * 取得銀行交易列表
 */
export async function getBankTransactions(
  db: SupabaseClient,
  options: BankTransactionQueryOptions
): Promise<BankTransaction[]> {
  const {
    companyId,
    bankAccountId,
    status,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options

  let query = db
    .from('bank_transactions')
    .select('*')
    .eq('company_id', companyId)
    .eq('bank_account_id', bankAccountId)
    .order('transaction_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('reconciliation_status', status)
  }

  if (startDate) {
    query = query.gte('transaction_date', startDate)
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得銀行交易失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 取得未對帳交易
 */
export async function getUnreconciledTransactions(
  db: SupabaseClient,
  companyId: string,
  bankAccountId: string
): Promise<BankTransaction[]> {
  return getBankTransactions(db, {
    companyId,
    bankAccountId,
    status: 'UNRECONCILED',
    limit: 500,
  })
}

/**
 * 取得銀行帳戶餘額摘要
 */
export async function getBankAccountSummary(
  db: SupabaseClient,
  bankAccountId: string
): Promise<{
  currentBalance: number
  unreconciledCount: number
  unreconciledDebit: number
  unreconciledCredit: number
}> {
  // 取得帳戶資訊
  const account = await getBankAccountById(db, bankAccountId)
  if (!account) {
    throw new Error('銀行帳戶不存在')
  }

  // 取得未對帳交易摘要
  const { data, error } = await db
    .from('bank_transactions')
    .select('debit, credit')
    .eq('bank_account_id', bankAccountId)
    .eq('reconciliation_status', 'UNRECONCILED')

  if (error) {
    throw new Error(`取得未對帳交易失敗: ${error.message}`)
  }

  const transactions = data || []

  return {
    currentBalance: account.current_balance,
    unreconciledCount: transactions.length,
    unreconciledDebit: transactions.reduce((sum, tx) => sum + (parseFloat(String(tx.debit)) || 0), 0),
    unreconciledCredit: transactions.reduce((sum, tx) => sum + (parseFloat(String(tx.credit)) || 0), 0),
  }
}

// ============================================
// 銀行帳戶寫入函數
// ============================================

/**
 * 建立銀行帳戶
 */
export async function createBankAccount(
  db: SupabaseClient,
  input: CreateBankAccountInput
): Promise<BankAccount> {
  // 如果設為預設，先取消其他預設
  if (input.is_default) {
    await db
      .from('bank_accounts')
      .update({ is_default: false })
      .eq('company_id', input.company_id)
      .eq('is_default', true)
  }

  const { data, error } = await db
    .from('bank_accounts')
    .insert({
      id: crypto.randomUUID(),
      company_id: input.company_id,
      account_number: input.account_number,
      bank_code: input.bank_code,
      bank_name: input.bank_name,
      branch_name: input.branch_name || null,
      currency: input.currency || 'TWD',
      opening_balance: input.opening_balance || 0,
      current_balance: input.opening_balance || 0,
      account_id: input.account_id,
      is_active: true,
      is_default: input.is_default || false,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`帳號 ${input.account_number} 已存在`)
    }
    throw new Error(`建立銀行帳戶失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新銀行帳戶
 */
export async function updateBankAccount(
  db: SupabaseClient,
  bankAccountId: string,
  input: UpdateBankAccountInput
): Promise<BankAccount> {
  const existing = await getBankAccountById(db, bankAccountId)
  if (!existing) {
    throw new Error('銀行帳戶不存在')
  }

  // 如果設為預設，先取消其他預設
  if (input.is_default) {
    await db
      .from('bank_accounts')
      .update({ is_default: false })
      .eq('company_id', existing.company_id)
      .eq('is_default', true)
      .neq('id', bankAccountId)
  }

  const updateData: Record<string, unknown> = {}
  if (input.bank_name !== undefined) updateData.bank_name = input.bank_name
  if (input.branch_name !== undefined) updateData.branch_name = input.branch_name
  if (input.is_active !== undefined) updateData.is_active = input.is_active
  if (input.is_default !== undefined) updateData.is_default = input.is_default

  const { data, error } = await db
    .from('bank_accounts')
    .update(updateData)
    .eq('id', bankAccountId)
    .select()
    .single()

  if (error) {
    throw new Error(`更新銀行帳戶失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新銀行帳戶餘額
 */
export async function updateBankAccountBalance(
  db: SupabaseClient,
  bankAccountId: string,
  newBalance: number
): Promise<void> {
  const { error } = await db
    .from('bank_accounts')
    .update({ current_balance: newBalance })
    .eq('id', bankAccountId)

  if (error) {
    throw new Error(`更新銀行餘額失敗: ${error.message}`)
  }
}

// ============================================
// 銀行交易寫入函數
// ============================================

/**
 * 建立銀行交易
 */
export async function createBankTransaction(
  db: SupabaseClient,
  input: CreateBankTransactionInput
): Promise<BankTransaction> {
  const { data, error } = await db
    .from('bank_transactions')
    .insert({
      id: crypto.randomUUID(),
      company_id: input.company_id,
      bank_account_id: input.bank_account_id,
      import_id: input.import_id || null,
      transaction_date: input.transaction_date,
      description: input.description,
      debit: input.debit || 0,
      credit: input.credit || 0,
      balance: input.balance,
      reconciliation_status: 'UNRECONCILED',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`建立銀行交易失敗: ${error.message}`)
  }

  return data
}

/**
 * 批量建立銀行交易（匯入用）
 */
export async function createBankTransactionsBatch(
  db: SupabaseClient,
  transactions: CreateBankTransactionInput[]
): Promise<number> {
  if (transactions.length === 0) return 0

  const toInsert = transactions.map((tx) => ({
    id: crypto.randomUUID(),
    company_id: tx.company_id,
    bank_account_id: tx.bank_account_id,
    import_id: tx.import_id || null,
    transaction_date: tx.transaction_date,
    description: tx.description,
    debit: tx.debit || 0,
    credit: tx.credit || 0,
    balance: tx.balance,
    reconciliation_status: 'UNRECONCILED',
  }))

  const { error } = await db.from('bank_transactions').insert(toInsert)

  if (error) {
    throw new Error(`批量建立銀行交易失敗: ${error.message}`)
  }

  return transactions.length
}

/**
 * 對帳 - 標記交易為已匹配
 */
export async function matchBankTransaction(
  db: SupabaseClient,
  transactionId: string,
  invoiceId: string,
  confidence: number,
  method: string
): Promise<BankTransaction> {
  const { data, error } = await db
    .from('bank_transactions')
    .update({
      reconciliation_status: 'MATCHED',
      matched_invoice_id: invoiceId,
      match_confidence: confidence,
      match_method: method,
    })
    .eq('id', transactionId)
    .select()
    .single()

  if (error) {
    throw new Error(`對帳失敗: ${error.message}`)
  }

  return data
}

/**
 * 對帳 - 標記為例外
 */
export async function markTransactionException(
  db: SupabaseClient,
  transactionId: string
): Promise<BankTransaction> {
  const { data, error } = await db
    .from('bank_transactions')
    .update({
      reconciliation_status: 'EXCEPTION',
    })
    .eq('id', transactionId)
    .select()
    .single()

  if (error) {
    throw new Error(`標記例外失敗: ${error.message}`)
  }

  return data
}

/**
 * 重設對帳狀態
 */
export async function resetReconciliationStatus(
  db: SupabaseClient,
  transactionId: string
): Promise<BankTransaction> {
  const { data, error } = await db
    .from('bank_transactions')
    .update({
      reconciliation_status: 'UNRECONCILED',
      matched_invoice_id: null,
      match_confidence: null,
      match_method: null,
    })
    .eq('id', transactionId)
    .select()
    .single()

  if (error) {
    throw new Error(`重設對帳狀態失敗: ${error.message}`)
  }

  return data
}

// ============================================
// 匯入記錄函數
// ============================================

/**
 * 建立匯入記錄
 */
export async function createBankStatementImport(
  db: SupabaseClient,
  companyId: string,
  bankAccountId: string,
  fileName: string,
  fileType: string,
  periodStart: string,
  periodEnd: string,
  totalRecords: number
): Promise<BankStatementImport> {
  const { data, error } = await db
    .from('bank_statement_imports')
    .insert({
      id: crypto.randomUUID(),
      company_id: companyId,
      bank_account_id: bankAccountId,
      file_name: fileName,
      file_type: fileType,
      period_start: periodStart,
      period_end: periodEnd,
      total_records: totalRecords,
      status: 'PENDING',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`建立匯入記錄失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新匯入狀態
 */
export async function updateImportStatus(
  db: SupabaseClient,
  importId: string,
  status: ImportStatus,
  errorMessage?: string
): Promise<void> {
  const { error } = await db
    .from('bank_statement_imports')
    .update({
      status,
      error_message: errorMessage || null,
    })
    .eq('id', importId)

  if (error) {
    throw new Error(`更新匯入狀態失敗: ${error.message}`)
  }
}
