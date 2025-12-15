/**
 * 往來對象資料存取層 (DAL)
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================
// 類型定義
// ============================================

export type CounterpartyType = 'CUSTOMER' | 'VENDOR' | 'BOTH'

export interface Counterparty {
  id: string
  company_id: string
  name: string
  tax_id: string | null
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  type: CounterpartyType
  default_account_code: string | null
  default_tax_code: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateCounterpartyInput {
  company_id: string
  name: string
  type: CounterpartyType
  tax_id?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  default_account_code?: string
  default_tax_code?: string
}

export interface UpdateCounterpartyInput {
  name?: string
  type?: CounterpartyType
  tax_id?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  default_account_code?: string
  default_tax_code?: string
}

export interface CounterpartyQueryOptions {
  companyId: string
  type?: CounterpartyType
  search?: string
  limit?: number
  offset?: number
}

// ============================================
// 查詢函數
// ============================================

/**
 * 取得往來對象列表
 */
export async function getCounterparties(
  db: SupabaseClient,
  options: CounterpartyQueryOptions
): Promise<Counterparty[]> {
  const { companyId, type, search, limit = 50, offset = 0 } = options

  let query = db
    .from('counterparties')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (type) {
    if (type === 'CUSTOMER') {
      query = query.in('type', ['CUSTOMER', 'BOTH'])
    } else if (type === 'VENDOR') {
      query = query.in('type', ['VENDOR', 'BOTH'])
    } else {
      query = query.eq('type', type)
    }
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,tax_id.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得往來對象失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得往來對象
 */
export async function getCounterpartyById(
  db: SupabaseClient,
  counterpartyId: string
): Promise<Counterparty | null> {
  const { data, error } = await db
    .from('counterparties')
    .select('*')
    .eq('id', counterpartyId)
    .is('deleted_at', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得往來對象失敗: ${error.message}`)
  }

  return data
}

/**
 * 根據統一編號取得往來對象
 */
export async function getCounterpartyByTaxId(
  db: SupabaseClient,
  companyId: string,
  taxId: string
): Promise<Counterparty | null> {
  const { data, error } = await db
    .from('counterparties')
    .select('*')
    .eq('company_id', companyId)
    .eq('tax_id', taxId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`取得往來對象失敗: ${error.message}`)
  }

  return data
}

/**
 * 取得客戶列表（CUSTOMER 或 BOTH）
 */
export async function getCustomers(
  db: SupabaseClient,
  companyId: string,
  search?: string,
  limit?: number
): Promise<Counterparty[]> {
  return getCounterparties(db, {
    companyId,
    type: 'CUSTOMER',
    search,
    limit,
  })
}

/**
 * 取得供應商列表（VENDOR 或 BOTH）
 */
export async function getVendors(
  db: SupabaseClient,
  companyId: string,
  search?: string,
  limit?: number
): Promise<Counterparty[]> {
  return getCounterparties(db, {
    companyId,
    type: 'VENDOR',
    search,
    limit,
  })
}

// ============================================
// 寫入函數
// ============================================

/**
 * 建立往來對象
 */
export async function createCounterparty(
  db: SupabaseClient,
  input: CreateCounterpartyInput
): Promise<Counterparty> {
  // 檢查統編是否重複
  if (input.tax_id) {
    const existing = await getCounterpartyByTaxId(db, input.company_id, input.tax_id)
    if (existing) {
      throw new Error(`統一編號 ${input.tax_id} 已存在`)
    }
  }

  const { data, error } = await db
    .from('counterparties')
    .insert({
      id: crypto.randomUUID(),
      company_id: input.company_id,
      name: input.name,
      type: input.type,
      tax_id: input.tax_id || null,
      contact: input.contact || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      default_account_code: input.default_account_code || null,
      default_tax_code: input.default_tax_code || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`建立往來對象失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新往來對象
 */
export async function updateCounterparty(
  db: SupabaseClient,
  counterpartyId: string,
  input: UpdateCounterpartyInput
): Promise<Counterparty> {
  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.type !== undefined) updateData.type = input.type
  if (input.tax_id !== undefined) updateData.tax_id = input.tax_id
  if (input.contact !== undefined) updateData.contact = input.contact
  if (input.phone !== undefined) updateData.phone = input.phone
  if (input.email !== undefined) updateData.email = input.email
  if (input.address !== undefined) updateData.address = input.address
  if (input.default_account_code !== undefined)
    updateData.default_account_code = input.default_account_code
  if (input.default_tax_code !== undefined) updateData.default_tax_code = input.default_tax_code

  const { data, error } = await db
    .from('counterparties')
    .update(updateData)
    .eq('id', counterpartyId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('往來對象不存在')
    }
    throw new Error(`更新往來對象失敗: ${error.message}`)
  }

  return data
}

/**
 * 刪除往來對象（軟刪除）
 */
export async function deleteCounterparty(
  db: SupabaseClient,
  counterpartyId: string
): Promise<void> {
  const { error } = await db
    .from('counterparties')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', counterpartyId)
    .is('deleted_at', null)

  if (error) {
    throw new Error(`刪除往來對象失敗: ${error.message}`)
  }
}

/**
 * 從發票資料自動建立往來對象
 */
export async function createOrGetCounterpartyFromInvoice(
  db: SupabaseClient,
  companyId: string,
  taxId: string,
  name: string,
  invoiceType: 'OUTPUT' | 'INPUT'
): Promise<Counterparty> {
  // 嘗試取得現有往來對象
  const existing = await getCounterpartyByTaxId(db, companyId, taxId)
  if (existing) {
    // 如果類型需要升級為 BOTH
    if (
      (invoiceType === 'OUTPUT' && existing.type === 'VENDOR') ||
      (invoiceType === 'INPUT' && existing.type === 'CUSTOMER')
    ) {
      return updateCounterparty(db, existing.id, { type: 'BOTH' })
    }
    return existing
  }

  // 建立新往來對象
  return createCounterparty(db, {
    company_id: companyId,
    name,
    tax_id: taxId,
    type: invoiceType === 'OUTPUT' ? 'CUSTOMER' : 'VENDOR',
  })
}
