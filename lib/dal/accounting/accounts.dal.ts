/**
 * 會計科目資料存取層 (DAL)
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================
// 類型定義
// ============================================

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'COST'

export interface Account {
  id: string
  code: string
  name: string
  name_en: string | null
  description: string | null
  category: AccountCategory
  sub_category: string | null
  is_system: boolean
  is_active: boolean
  company_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateAccountInput {
  code: string
  name: string
  name_en?: string
  description?: string
  category: AccountCategory
  sub_category?: string
  company_id?: string
  is_active?: boolean
}

export interface UpdateAccountInput {
  name?: string
  name_en?: string
  description?: string
  sub_category?: string
  is_active?: boolean
}

export interface AccountQueryOptions {
  companyId?: string
  category?: AccountCategory
  isActive?: boolean
  includeSystem?: boolean
}

// ============================================
// 查詢函數
// ============================================

/**
 * 取得會計科目列表
 */
export async function getAccounts(
  db: SupabaseClient,
  options: AccountQueryOptions = {}
): Promise<Account[]> {
  const { companyId, category, isActive, includeSystem = true } = options

  let query = db
    .from('accounts')
    .select('*')
    .order('code', { ascending: true })

  // 公司科目 + 系統科目
  if (companyId) {
    if (includeSystem) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`)
    } else {
      query = query.eq('company_id', companyId)
    }
  }

  if (category) {
    query = query.eq('category', category)
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得會計科目失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得單一會計科目
 */
export async function getAccountById(
  db: SupabaseClient,
  accountId: string
): Promise<Account | null> {
  const { data, error } = await db
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得會計科目失敗: ${error.message}`)
  }

  return data
}

/**
 * 根據代碼取得會計科目
 */
export async function getAccountByCode(
  db: SupabaseClient,
  code: string,
  companyId?: string
): Promise<Account | null> {
  let query = db
    .from('accounts')
    .select('*')
    .eq('code', code)

  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`)
  }

  const { data, error } = await query.limit(1).maybeSingle()

  if (error) {
    throw new Error(`取得會計科目失敗: ${error.message}`)
  }

  return data
}

/**
 * 取得科目餘額（從交易明細計算）
 */
export async function getAccountBalance(
  db: SupabaseClient,
  accountId: string,
  companyId: string,
  endDate?: string
): Promise<{ debit: number; credit: number; balance: number }> {
  let query = db
    .from('acc_transactions')
    .select('debit, credit')
    .eq('account_id', accountId)
    .eq('company_id', companyId)
    .eq('status', 'POSTED')

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得科目餘額失敗: ${error.message}`)
  }

  const totals = (data || []).reduce(
    (acc, tx) => ({
      debit: acc.debit + (parseFloat(tx.debit) || 0),
      credit: acc.credit + (parseFloat(tx.credit) || 0),
    }),
    { debit: 0, credit: 0 }
  )

  return {
    ...totals,
    balance: totals.debit - totals.credit,
  }
}

// ============================================
// 寫入函數
// ============================================

/**
 * 建立會計科目
 */
export async function createAccount(
  db: SupabaseClient,
  input: CreateAccountInput
): Promise<Account> {
  const { data, error } = await db
    .from('accounts')
    .insert({
      id: crypto.randomUUID(),
      code: input.code,
      name: input.name,
      name_en: input.name_en || null,
      description: input.description || null,
      category: input.category,
      sub_category: input.sub_category || null,
      company_id: input.company_id || null,
      is_system: false,
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`科目代碼 ${input.code} 已存在`)
    }
    throw new Error(`建立會計科目失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新會計科目
 */
export async function updateAccount(
  db: SupabaseClient,
  accountId: string,
  input: UpdateAccountInput
): Promise<Account> {
  const { data, error } = await db
    .from('accounts')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.name_en !== undefined && { name_en: input.name_en }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.sub_category !== undefined && { sub_category: input.sub_category }),
      ...(input.is_active !== undefined && { is_active: input.is_active }),
    })
    .eq('id', accountId)
    .eq('is_system', false) // 不能修改系統科目
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('會計科目不存在或無法修改系統科目')
    }
    throw new Error(`更新會計科目失敗: ${error.message}`)
  }

  return data
}

/**
 * 刪除會計科目（軟刪除：停用）
 */
export async function deleteAccount(
  db: SupabaseClient,
  accountId: string
): Promise<void> {
  const { error } = await db
    .from('accounts')
    .update({ is_active: false })
    .eq('id', accountId)
    .eq('is_system', false) // 不能刪除系統科目

  if (error) {
    throw new Error(`刪除會計科目失敗: ${error.message}`)
  }
}

// ============================================
// 初始化預設科目
// ============================================

const DEFAULT_ACCOUNTS: Omit<CreateAccountInput, 'company_id'>[] = [
  // 資產類 1xxx
  { code: '1101', name: '現金', category: 'ASSET' },
  { code: '1102', name: '零用金', category: 'ASSET' },
  { code: '1103', name: '銀行存款', category: 'ASSET' },
  { code: '1131', name: '應收帳款', category: 'ASSET' },
  { code: '1141', name: '應收票據', category: 'ASSET' },
  { code: '1181', name: '其他應收款', category: 'ASSET' },
  { code: '1301', name: '預付款項', category: 'ASSET' },
  { code: '1471', name: '留抵稅額', category: 'ASSET' },
  // 負債類 2xxx
  { code: '2101', name: '應付帳款', category: 'LIABILITY' },
  { code: '2111', name: '應付票據', category: 'LIABILITY' },
  { code: '2171', name: '應付費用', category: 'LIABILITY' },
  { code: '2181', name: '其他應付款', category: 'LIABILITY' },
  { code: '2261', name: '銷項稅額', category: 'LIABILITY' },
  { code: '2262', name: '進項稅額', category: 'LIABILITY' },
  // 權益類 3xxx
  { code: '3101', name: '股本', category: 'EQUITY' },
  { code: '3351', name: '未分配盈餘', category: 'EQUITY' },
  { code: '3353', name: '本期損益', category: 'EQUITY' },
  // 收入類 4xxx
  { code: '4101', name: '銷貨收入', category: 'REVENUE' },
  { code: '4111', name: '勞務收入', category: 'REVENUE' },
  { code: '4181', name: '其他營業收入', category: 'REVENUE' },
  { code: '4201', name: '利息收入', category: 'REVENUE' },
  // 成本類 5xxx
  { code: '5101', name: '銷貨成本', category: 'COST' },
  { code: '5111', name: '勞務成本', category: 'COST' },
  // 費用類 6xxx
  { code: '6101', name: '薪資費用', category: 'EXPENSE' },
  { code: '6121', name: '勞健保費用', category: 'EXPENSE' },
  { code: '6131', name: '租金費用', category: 'EXPENSE' },
  { code: '6141', name: '水電費', category: 'EXPENSE' },
  { code: '6151', name: '通訊費', category: 'EXPENSE' },
  { code: '6161', name: '交通費', category: 'EXPENSE' },
  { code: '6171', name: '交際費', category: 'EXPENSE' },
  { code: '6181', name: '稅捐', category: 'EXPENSE' },
  { code: '6191', name: '折舊費用', category: 'EXPENSE' },
  { code: '6201', name: '其他費用', category: 'EXPENSE' },
]

/**
 * 初始化公司的預設會計科目
 */
export async function initializeDefaultAccounts(
  db: SupabaseClient,
  companyId: string
): Promise<void> {
  // 檢查是否已有科目
  const { count } = await db
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  if ((count || 0) > 0) {
    return // 已有科目，跳過初始化
  }

  // 批量建立預設科目
  const accounts = DEFAULT_ACCOUNTS.map((acc) => ({
    id: crypto.randomUUID(),
    ...acc,
    name_en: null,
    description: null,
    sub_category: null,
    company_id: companyId,
    is_system: true,
    is_active: true,
  }))

  const { error } = await db.from('accounts').insert(accounts)

  if (error) {
    throw new Error(`初始化會計科目失敗: ${error.message}`)
  }
}
