/**
 * 會計傳票與分錄資料存取層 (DAL)
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================
// 類型定義
// ============================================

export type JournalStatus = 'DRAFT' | 'POSTED' | 'VOIDED'
export type TransactionSource = 'INVOICE' | 'MANUAL' | 'IMPORT' | 'ADJUSTMENT'
export type TransactionStatus = 'DRAFT' | 'POSTED' | 'LOCKED' | 'VOIDED'

export interface JournalEntry {
  id: string
  company_id: string
  journal_number: string
  date: string
  description: string | null
  source_type: TransactionSource
  invoice_id: string | null
  status: JournalStatus
  is_auto_generated: boolean
  voided_at: string | null
  void_reason: string | null
  replaces_journal_id: string | null
  posted_at: string | null
  posted_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AccTransaction {
  id: string
  company_id: string
  journal_entry_id: string
  number: string
  date: string
  description: string | null
  account_id: string
  debit: number
  credit: number
  source_type: TransactionSource
  invoice_id: string | null
  status: TransactionStatus
  posted_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// 包含科目資訊的分錄（用於傳票詳情顯示）
export interface AccTransactionWithAccount extends AccTransaction {
  account?: {
    id: string
    code: string
    name: string
    category: string
  } | null
}

export interface JournalEntryWithTransactions extends JournalEntry {
  transactions: AccTransactionWithAccount[]
}

export interface CreateJournalInput {
  company_id: string
  date: string
  description?: string
  source_type: TransactionSource
  invoice_id?: string
  is_auto_generated?: boolean
}

export interface CreateTransactionInput {
  account_id: string
  description?: string
  debit: number
  credit: number
}

export interface UpdateJournalInput {
  date?: string
  description?: string
  transactions?: CreateTransactionInput[]
}

export interface JournalQueryOptions {
  companyId: string
  status?: JournalStatus
  sourceType?: TransactionSource
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface TrialBalanceItem {
  account_id: string
  account_code: string
  account_name: string
  account_category: string
  opening_debit: number
  opening_credit: number
  period_debit: number
  period_credit: number
  closing_debit: number
  closing_credit: number
}

// ============================================
// 輔助函數
// ============================================

/**
 * 產生傳票編號
 */
async function generateJournalNumber(
  db: SupabaseClient,
  companyId: string,
  date: string
): Promise<string> {
  const year = date.substring(0, 4)
  const month = date.substring(5, 7)
  const prefix = `${year}${month}`

  // 取得當月最大編號
  const { data, error } = await db
    .from('journal_entries')
    .select('journal_number')
    .eq('company_id', companyId)
    .like('journal_number', `${prefix}%`)
    .order('journal_number', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`取得傳票編號失敗: ${error.message}`)
  }

  let nextSeq = 1
  if (data && data.length > 0) {
    const lastNumber = data[0].journal_number
    const lastSeq = parseInt(lastNumber.substring(6), 10)
    nextSeq = lastSeq + 1
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`
}

// ============================================
// 傳票查詢函數
// ============================================

/**
 * 取得傳票列表
 */
export async function getJournalEntries(
  db: SupabaseClient,
  options: JournalQueryOptions
): Promise<JournalEntry[]> {
  const {
    companyId,
    status,
    sourceType,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options

  let query = db
    .from('journal_entries')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .order('journal_number', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  if (sourceType) {
    query = query.eq('source_type', sourceType)
  }

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得傳票列表失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得單一傳票（含分錄與科目資訊）
 */
export async function getJournalEntryById(
  db: SupabaseClient,
  journalId: string
): Promise<JournalEntryWithTransactions | null> {
  const { data: journal, error: journalError } = await db
    .from('journal_entries')
    .select('*')
    .eq('id', journalId)
    .is('deleted_at', null)
    .single()

  if (journalError && journalError.code !== 'PGRST116') {
    throw new Error(`取得傳票失敗: ${journalError.message}`)
  }

  if (!journal) {
    return null
  }

  // 取得分錄並 join 科目資訊
  const { data: transactions, error: txError } = await db
    .from('acc_transactions')
    .select(`
      *,
      account:accounts!account_id (
        id,
        code,
        name,
        category
      )
    `)
    .eq('journal_entry_id', journalId)
    .is('deleted_at', null)
    .order('id', { ascending: true })

  if (txError) {
    throw new Error(`取得分錄失敗: ${txError.message}`)
  }

  return {
    ...journal,
    transactions: (transactions || []) as AccTransactionWithAccount[],
  }
}

/**
 * 根據傳票編號取得傳票
 */
export async function getJournalByNumber(
  db: SupabaseClient,
  journalNumber: string
): Promise<JournalEntry | null> {
  const { data, error } = await db
    .from('journal_entries')
    .select('*')
    .eq('journal_number', journalNumber)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`取得傳票失敗: ${error.message}`)
  }

  return data
}

/**
 * 根據發票 ID 取得傳票
 */
export async function getJournalByInvoiceId(
  db: SupabaseClient,
  invoiceId: string
): Promise<JournalEntry | null> {
  const { data, error } = await db
    .from('journal_entries')
    .select('*')
    .eq('invoice_id', invoiceId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`取得傳票失敗: ${error.message}`)
  }

  return data
}

// ============================================
// 分錄查詢函數
// ============================================

/**
 * 取得科目分錄
 */
export async function getTransactionsByAccount(
  db: SupabaseClient,
  companyId: string,
  accountId: string,
  startDate?: string,
  endDate?: string
): Promise<AccTransaction[]> {
  let query = db
    .from('acc_transactions')
    .select('*')
    .eq('company_id', companyId)
    .eq('account_id', accountId)
    .eq('status', 'POSTED')
    .is('deleted_at', null)
    .order('date', { ascending: true })

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得分錄失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 取得試算表
 */
export async function getTrialBalance(
  db: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<TrialBalanceItem[]> {
  // 取得所有科目
  const { data: accounts, error: accError } = await db
    .from('accounts')
    .select('id, code, name, category')
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .eq('is_active', true)
    .order('code', { ascending: true })

  if (accError) {
    throw new Error(`取得科目失敗: ${accError.message}`)
  }

  // 取得期初餘額（startDate 之前的已過帳分錄）
  const { data: openingTx, error: openingError } = await db
    .from('acc_transactions')
    .select('account_id, debit, credit')
    .eq('company_id', companyId)
    .eq('status', 'POSTED')
    .lt('date', startDate)
    .is('deleted_at', null)

  if (openingError) {
    throw new Error(`取得期初餘額失敗: ${openingError.message}`)
  }

  // 取得本期分錄
  const { data: periodTx, error: periodError } = await db
    .from('acc_transactions')
    .select('account_id, debit, credit')
    .eq('company_id', companyId)
    .eq('status', 'POSTED')
    .gte('date', startDate)
    .lte('date', endDate)
    .is('deleted_at', null)

  if (periodError) {
    throw new Error(`取得本期分錄失敗: ${periodError.message}`)
  }

  // 彙總計算
  const openingMap = new Map<string, { debit: number; credit: number }>()
  for (const tx of openingTx || []) {
    const existing = openingMap.get(tx.account_id) || { debit: 0, credit: 0 }
    openingMap.set(tx.account_id, {
      debit: existing.debit + (parseFloat(String(tx.debit)) || 0),
      credit: existing.credit + (parseFloat(String(tx.credit)) || 0),
    })
  }

  const periodMap = new Map<string, { debit: number; credit: number }>()
  for (const tx of periodTx || []) {
    const existing = periodMap.get(tx.account_id) || { debit: 0, credit: 0 }
    periodMap.set(tx.account_id, {
      debit: existing.debit + (parseFloat(String(tx.debit)) || 0),
      credit: existing.credit + (parseFloat(String(tx.credit)) || 0),
    })
  }

  // 組合結果
  return (accounts || []).map((acc) => {
    const opening = openingMap.get(acc.id) || { debit: 0, credit: 0 }
    const period = periodMap.get(acc.id) || { debit: 0, credit: 0 }

    return {
      account_id: acc.id,
      account_code: acc.code,
      account_name: acc.name,
      account_category: acc.category,
      opening_debit: opening.debit,
      opening_credit: opening.credit,
      period_debit: period.debit,
      period_credit: period.credit,
      closing_debit: opening.debit + period.debit,
      closing_credit: opening.credit + period.credit,
    }
  })
}

// ============================================
// 寫入函數
// ============================================

/**
 * 建立傳票（含分錄）
 * 注意：這是應用層事務，複雜場景建議用 RPC
 */
export async function createJournalWithTransactions(
  db: SupabaseClient,
  journalInput: CreateJournalInput,
  transactionInputs: CreateTransactionInput[]
): Promise<JournalEntryWithTransactions> {
  // 驗證借貸平衡
  const totalDebit = transactionInputs.reduce((sum, tx) => sum + tx.debit, 0)
  const totalCredit = transactionInputs.reduce((sum, tx) => sum + tx.credit, 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`借貸不平衡：借方 ${totalDebit}，貸方 ${totalCredit}`)
  }

  // 產生傳票編號
  const journalNumber = await generateJournalNumber(
    db,
    journalInput.company_id,
    journalInput.date
  )

  // 建立傳票
  const journalId = crypto.randomUUID()
  const { data: journal, error: journalError } = await db
    .from('journal_entries')
    .insert({
      id: journalId,
      company_id: journalInput.company_id,
      journal_number: journalNumber,
      date: journalInput.date,
      description: journalInput.description || null,
      source_type: journalInput.source_type,
      invoice_id: journalInput.invoice_id || null,
      is_auto_generated: journalInput.is_auto_generated || false,
      status: 'DRAFT',
    })
    .select()
    .single()

  if (journalError) {
    throw new Error(`建立傳票失敗: ${journalError.message}`)
  }

  // 建立分錄
  const transactionsToInsert = transactionInputs.map((tx) => ({
    id: crypto.randomUUID(),
    company_id: journalInput.company_id,
    journal_entry_id: journalId,
    number: journalNumber,
    date: journalInput.date,
    description: tx.description || journalInput.description || null,
    account_id: tx.account_id,
    debit: tx.debit,
    credit: tx.credit,
    source_type: journalInput.source_type,
    invoice_id: journalInput.invoice_id || null,
    status: 'DRAFT',
  }))

  const { data: transactions, error: txError } = await db
    .from('acc_transactions')
    .insert(transactionsToInsert)
    .select()

  if (txError) {
    // 嘗試回滾傳票
    await db.from('journal_entries').delete().eq('id', journalId)
    throw new Error(`建立分錄失敗: ${txError.message}`)
  }

  return {
    ...journal,
    transactions: transactions || [],
  }
}

/**
 * 過帳傳票
 */
export async function postJournalEntry(
  db: SupabaseClient,
  journalId: string,
  postedBy: string
): Promise<JournalEntry> {
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

  const now = new Date().toISOString()

  // 更新傳票狀態
  const { data: journal, error: journalError } = await db
    .from('journal_entries')
    .update({
      status: 'POSTED',
      posted_at: now,
      posted_by: postedBy,
    })
    .eq('id', journalId)
    .select()
    .single()

  if (journalError) {
    throw new Error(`過帳傳票失敗: ${journalError.message}`)
  }

  // 更新分錄狀態
  const { error: txError } = await db
    .from('acc_transactions')
    .update({
      status: 'POSTED',
      posted_at: now,
    })
    .eq('journal_entry_id', journalId)

  if (txError) {
    throw new Error(`過帳分錄失敗: ${txError.message}`)
  }

  return journal
}

/**
 * 作廢傳票
 */
export async function voidJournalEntry(
  db: SupabaseClient,
  journalId: string,
  voidReason: string
): Promise<JournalEntry> {
  const existing = await getJournalEntryById(db, journalId)
  if (!existing) {
    throw new Error('傳票不存在')
  }

  if (existing.status === 'VOIDED') {
    throw new Error('傳票已作廢')
  }

  const now = new Date().toISOString()

  // 更新傳票狀態
  const { data: journal, error: journalError } = await db
    .from('journal_entries')
    .update({
      status: 'VOIDED',
      voided_at: now,
      void_reason: voidReason,
    })
    .eq('id', journalId)
    .select()
    .single()

  if (journalError) {
    throw new Error(`作廢傳票失敗: ${journalError.message}`)
  }

  // 更新分錄狀態
  const { error: txError } = await db
    .from('acc_transactions')
    .update({
      status: 'VOIDED',
    })
    .eq('journal_entry_id', journalId)

  if (txError) {
    throw new Error(`作廢分錄失敗: ${txError.message}`)
  }

  return journal
}

/**
 * 刪除傳票（軟刪除，只能刪除草稿）
 */
export async function deleteJournalEntry(
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

  const now = new Date().toISOString()

  // 軟刪除分錄
  await db
    .from('acc_transactions')
    .update({ deleted_at: now })
    .eq('journal_entry_id', journalId)

  // 軟刪除傳票
  const { error } = await db
    .from('journal_entries')
    .update({ deleted_at: now })
    .eq('id', journalId)

  if (error) {
    throw new Error(`刪除傳票失敗: ${error.message}`)
  }
}

/**
 * 更新傳票（僅限草稿狀態）
 * 支援更新日期、摘要和分錄
 */
export async function updateJournalEntry(
  db: SupabaseClient,
  journalId: string,
  input: UpdateJournalInput
): Promise<JournalEntryWithTransactions> {
  const existing = await getJournalEntryById(db, journalId)
  if (!existing) {
    throw new Error('傳票不存在')
  }

  if (existing.status !== 'DRAFT') {
    throw new Error('只能修改草稿狀態的傳票')
  }

  // 更新傳票主表
  const journalUpdateData: Record<string, unknown> = {}
  if (input.date !== undefined) journalUpdateData.date = input.date
  if (input.description !== undefined) journalUpdateData.description = input.description

  if (Object.keys(journalUpdateData).length > 0) {
    const { error: journalError } = await db
      .from('journal_entries')
      .update(journalUpdateData)
      .eq('id', journalId)

    if (journalError) {
      throw new Error(`更新傳票失敗: ${journalError.message}`)
    }
  }

  // 如果有分錄更新，重建分錄
  if (input.transactions && input.transactions.length > 0) {
    // 驗證借貸平衡
    const totalDebit = input.transactions.reduce((sum, tx) => sum + tx.debit, 0)
    const totalCredit = input.transactions.reduce((sum, tx) => sum + tx.credit, 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`借貸不平衡：借方 ${totalDebit}，貸方 ${totalCredit}`)
    }

    // 軟刪除現有分錄
    const now = new Date().toISOString()
    await db
      .from('acc_transactions')
      .update({ deleted_at: now })
      .eq('journal_entry_id', journalId)
      .is('deleted_at', null)

    // 建立新分錄
    const date = input.date || existing.date
    const transactionRecords = input.transactions.map((tx) => ({
      id: crypto.randomUUID(),
      company_id: existing.company_id,
      journal_entry_id: journalId,
      number: existing.journal_number,
      date,
      description: tx.description || null,
      account_id: tx.account_id,
      debit: tx.debit,
      credit: tx.credit,
      source_type: existing.source_type,
      invoice_id: existing.invoice_id,
      status: 'DRAFT',
    }))

    const { error: txError } = await db
      .from('acc_transactions')
      .insert(transactionRecords)

    if (txError) {
      throw new Error(`更新分錄失敗: ${txError.message}`)
    }
  }

  // 返回更新後的傳票
  const updated = await getJournalEntryById(db, journalId)
  if (!updated) {
    throw new Error('更新後無法取得傳票')
  }

  return updated
}

// ============================================
// RPC 版本（原子性操作）
// ============================================

/**
 * 建立傳票（RPC 版本 - 原子性操作）
 * 修正：使用與資料表一致的欄位（invoice_id, is_auto_generated）
 */
export async function createJournalWithTransactionsRpc(
  db: SupabaseClient,
  companyId: string,
  journalData: {
    date: string
    description?: string
    source_type?: TransactionSource
    invoice_id?: string
    is_auto_generated?: boolean
  },
  transactions: Array<{
    account_id: string
    description?: string
    debit: number
    credit: number
  }>
): Promise<{ id: string; journal_number: string; status: JournalStatus }> {
  const { data, error } = await db.rpc('create_journal_with_transactions', {
    p_company_id: companyId,
    p_journal_data: journalData,
    p_transactions: transactions,
  })

  if (error) {
    throw new Error(`建立傳票失敗 (RPC): ${error.message}`)
  }

  return data
}

/**
 * 過帳傳票（RPC 版本）
 */
export async function postJournalEntryRpc(
  db: SupabaseClient,
  journalId: string,
  postedBy: string
): Promise<{ journal_id: string; status: string }> {
  const { data, error } = await db.rpc('post_journal_entry', {
    p_journal_id: journalId,
    p_posted_by: postedBy,
  })

  if (error) {
    throw new Error(`過帳傳票失敗 (RPC): ${error.message}`)
  }

  return data
}

/**
 * 作廢傳票（RPC 版本）
 */
export async function voidJournalEntryRpc(
  db: SupabaseClient,
  journalId: string,
  voidedBy: string,
  reason: string
): Promise<{ journal_id: string; status: string }> {
  const { data, error } = await db.rpc('void_journal_entry', {
    p_journal_id: journalId,
    p_voided_by: voidedBy,
    p_reason: reason,
  })

  if (error) {
    throw new Error(`作廢傳票失敗 (RPC): ${error.message}`)
  }

  return data
}

/**
 * 取得試算表（RPC 版本）
 */
export async function getTrialBalanceRpc(
  db: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<TrialBalanceItem[]> {
  const { data, error } = await db.rpc('get_trial_balance', {
    p_company_id: companyId,
    p_start_date: startDate,
    p_end_date: endDate,
  })

  if (error) {
    throw new Error(`取得試算表失敗 (RPC): ${error.message}`)
  }

  return data || []
}
