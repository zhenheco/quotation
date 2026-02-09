/**
 * 客戶資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import { withRetry, RetryOptions } from '@/lib/utils/retry'
import { sanitizeSearchQuery } from '@/lib/security'

export interface Customer {
  id: string
  user_id: string
  company_id: string | null
  owner_id: string | null
  customer_number: string | null
  name: { zh: string; en: string }
  email: string | null
  phone: string | null
  fax: string | null
  address: { zh: string; en: string } | null
  tax_id: string | null
  contact_person: { name: string; phone: string; email: string } | null
  notes: string | null
  created_at: string
  updated_at: string
}

// PostgreSQL 錯誤類型
interface PostgresError {
  code?: string
  constraint?: string
  message?: string
}

// 檢查是否為客戶編號衝突錯誤
function isCustomerNumberConflict(error: unknown): boolean {
  const pgError = error as PostgresError
  return pgError?.code === '23505' &&
         (pgError?.constraint?.includes('customer_number') ||
          pgError?.message?.includes('customer_number') ||
          false)
}

export interface CustomerQueryOptions {
  companyId?: string
  ownerId?: string
  filterByOwner?: boolean
}

export async function getCustomers(
  db: SupabaseClient,
  userId: string,
  options: CustomerQueryOptions = {}
): Promise<Customer[]> {
  const { companyId, ownerId, filterByOwner } = options

  let query = db
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  if (filterByOwner && ownerId) {
    query = query.eq('owner_id', ownerId)
  } else {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get customers: ${error.message}`)
  }

  return data || []
}

export async function getCustomerById(
  db: SupabaseClient,
  userId: string,
  customerId: string
): Promise<Customer | null> {
  const { data, error } = await db
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get customer: ${error.message}`)
  }

  return data
}

/**
 * 根據 ID 取得客戶（不限制 user_id，用於跨用戶查詢同公司資料）
 *
 * ⚠️ 安全警告：此函數不驗證用戶權限，僅應在以下情況使用：
 * - 已通過其他方式驗證用戶有權訪問相關資料（如：報價單授權後查詢其客戶名稱）
 * - 用於內部資料關聯，不直接暴露給 API
 */
export async function getCustomerByIdOnly(
  db: SupabaseClient,
  customerId: string
): Promise<Customer | null> {
  const { data, error } = await db
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get customer: ${error.message}`)
  }

  return data
}

export async function createCustomer(
  db: SupabaseClient,
  userId: string,
  data: {
    id?: string
    company_id?: string
    owner_id?: string
    customer_number?: string
    name: { zh: string; en: string }
    email?: string | null
    phone?: string
    fax?: string
    address?: { zh: string; en: string }
    tax_id?: string
    contact_person?: { name: string; phone: string; email: string }
    notes?: string
  }
): Promise<Customer> {
  const now = new Date().toISOString()

  const { data: customer, error } = await db
    .from('customers')
    .insert({
      id: data.id || crypto.randomUUID(),
      user_id: userId,
      company_id: data.company_id || null,
      owner_id: data.owner_id || userId,
      customer_number: data.customer_number || null,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      fax: data.fax || null,
      address: data.address || null,
      tax_id: data.tax_id || null,
      contact_person: data.contact_person || null,
      notes: data.notes || null,
      created_at: now,
      updated_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create customer: ${error.message}`)
  }

  return customer
}

export async function updateCustomer(
  db: SupabaseClient,
  userId: string,
  customerId: string,
  data: Partial<{
    name: { zh: string; en: string }
    email: string | null
    phone: string
    fax: string
    address: { zh: string; en: string }
    tax_id: string
    contact_person: { name: string; phone: string; email: string }
    notes: string
    company_id: string
    owner_id: string
  }>
): Promise<Customer> {
  const { data: customer, error } = await db
    .from('customers')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', customerId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update customer: ${error.message}`)
  }

  return customer
}

export async function deleteCustomer(
  db: SupabaseClient,
  userId: string,
  customerId: string
): Promise<void> {
  const { error, count } = await db
    .from('customers')
    .delete()
    .eq('id', customerId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete customer: ${error.message}`)
  }

  if (count === 0) {
    throw new Error('Customer not found or already deleted')
  }
}

export async function getCustomersByIds(
  db: SupabaseClient,
  userId: string,
  customerIds: string[]
): Promise<Map<string, Customer>> {
  if (customerIds.length === 0) {
    return new Map()
  }

  const uniqueIds = [...new Set(customerIds)]

  const { data, error } = await db
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .in('id', uniqueIds)

  if (error) {
    throw new Error(`Failed to get customers: ${error.message}`)
  }

  const customerMap = new Map<string, Customer>()
  for (const customer of data || []) {
    customerMap.set(customer.id, customer)
  }

  return customerMap
}

export async function searchCustomers(
  db: SupabaseClient,
  userId: string,
  query: string,
  companyId?: string
): Promise<Customer[]> {
  // 安全：清理搜尋輸入防止 filter injection
  const safeQuery = sanitizeSearchQuery(query)
  if (!safeQuery) return []

  let dbQuery = db
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .or(`email.ilike.%${safeQuery}%,name.ilike.%${safeQuery}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (companyId) {
    dbQuery = dbQuery.eq('company_id', companyId)
  }

  const { data, error } = await dbQuery

  if (error) {
    throw new Error(`Failed to search customers: ${error.message}`)
  }

  return data || []
}

/**
 * 生成客戶編號（呼叫資料庫 RPC 函數）
 */
export async function generateCustomerNumber(
  db: SupabaseClient,
  companyId: string
): Promise<string> {
  const { data, error } = await db.rpc('generate_customer_number_atomic', {
    p_company_id: companyId
  })

  if (error) {
    throw new Error(`Failed to generate customer number: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to generate customer number: no data returned')
  }

  return data as string
}

/**
 * 建立客戶（帶重試機制，處理編號衝突）
 */
export async function createCustomerWithRetry(
  db: SupabaseClient,
  userId: string,
  companyId: string,
  data: Omit<Parameters<typeof createCustomer>[2], 'customer_number' | 'company_id'>,
  options: Pick<RetryOptions, 'maxRetries' | 'baseDelayMs'> = {}
): Promise<Customer> {
  return withRetry(
    async () => {
      const customerNumber = await generateCustomerNumber(db, companyId)
      return createCustomer(db, userId, {
        ...data,
        company_id: companyId,
        customer_number: customerNumber
      })
    },
    {
      ...options,
      shouldRetry: isCustomerNumberConflict
    }
  )
}
