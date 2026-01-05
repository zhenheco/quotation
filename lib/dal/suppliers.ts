/**
 * 供應商資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import { withRetry, RetryOptions } from '@/lib/utils/retry'
import { sanitizeSearchQuery } from '@/lib/security'

export interface Supplier {
  id: string
  company_id: string
  user_id: string
  supplier_number: string | null
  name: { zh: string; en: string }
  code: string | null
  contact_person: { name: string; phone: string; email: string } | null
  phone: string | null
  email: string | null
  fax: string | null
  address: { zh: string; en: string } | null
  website: string | null
  tax_id: string | null
  payment_terms: string | null
  payment_days: number | null
  bank_name: string | null
  bank_account: string | null
  bank_code: string | null
  swift_code: string | null
  is_active: boolean
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

// 檢查是否為供應商編號衝突錯誤
function isSupplierNumberConflict(error: unknown): boolean {
  const pgError = error as PostgresError
  return pgError?.code === '23505' &&
         (pgError?.constraint?.includes('supplier_number') ||
          pgError?.message?.includes('supplier_number') ||
          false)
}

export interface SupplierQueryOptions {
  companyId?: string
  isActive?: boolean
}

/**
 * 取得供應商列表
 */
export async function getSuppliers(
  db: SupabaseClient,
  userId: string,
  options: SupplierQueryOptions = {}
): Promise<Supplier[]> {
  const { companyId, isActive } = options

  let query = db
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false })

  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get suppliers: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得單一供應商
 */
export async function getSupplierById(
  db: SupabaseClient,
  supplierId: string
): Promise<Supplier | null> {
  const { data, error } = await db
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get supplier: ${error.message}`)
  }

  return data
}

/**
 * 建立供應商
 */
export async function createSupplier(
  db: SupabaseClient,
  userId: string,
  data: {
    id?: string
    company_id: string
    supplier_number?: string
    name: { zh: string; en: string }
    code?: string
    contact_person?: { name: string; phone: string; email: string }
    phone?: string
    email?: string
    fax?: string
    address?: { zh: string; en: string }
    website?: string
    tax_id?: string
    payment_terms?: string
    payment_days?: number
    bank_name?: string
    bank_account?: string
    bank_code?: string
    swift_code?: string
    is_active?: boolean
    notes?: string
  }
): Promise<Supplier> {
  const now = new Date().toISOString()

  const { data: supplier, error } = await db
    .from('suppliers')
    .insert({
      id: data.id || crypto.randomUUID(),
      company_id: data.company_id,
      user_id: userId,
      supplier_number: data.supplier_number || null,
      name: data.name,
      code: data.code || null,
      contact_person: data.contact_person || null,
      phone: data.phone || null,
      email: data.email || null,
      fax: data.fax || null,
      address: data.address || null,
      website: data.website || null,
      tax_id: data.tax_id || null,
      payment_terms: data.payment_terms || null,
      payment_days: data.payment_days ?? 30,
      bank_name: data.bank_name || null,
      bank_account: data.bank_account || null,
      bank_code: data.bank_code || null,
      swift_code: data.swift_code || null,
      is_active: data.is_active ?? true,
      notes: data.notes || null,
      created_at: now,
      updated_at: now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create supplier: ${error.message}`)
  }

  return supplier
}

/**
 * 更新供應商
 */
export async function updateSupplier(
  db: SupabaseClient,
  supplierId: string,
  data: Partial<{
    name: { zh: string; en: string }
    code: string
    contact_person: { name: string; phone: string; email: string }
    phone: string
    email: string
    fax: string
    address: { zh: string; en: string }
    website: string
    tax_id: string
    payment_terms: string
    payment_days: number
    bank_name: string
    bank_account: string
    bank_code: string
    swift_code: string
    is_active: boolean
    notes: string
  }>
): Promise<Supplier> {
  const { data: supplier, error } = await db
    .from('suppliers')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', supplierId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update supplier: ${error.message}`)
  }

  return supplier
}

/**
 * 刪除供應商
 */
export async function deleteSupplier(
  db: SupabaseClient,
  supplierId: string
): Promise<void> {
  const { error } = await db
    .from('suppliers')
    .delete()
    .eq('id', supplierId)

  if (error) {
    throw new Error(`Failed to delete supplier: ${error.message}`)
  }
}

/**
 * 根據 ID 列表取得多個供應商
 */
export async function getSuppliersByIds(
  db: SupabaseClient,
  supplierIds: string[]
): Promise<Map<string, Supplier>> {
  if (supplierIds.length === 0) {
    return new Map()
  }

  const uniqueIds = [...new Set(supplierIds)]

  const { data, error } = await db
    .from('suppliers')
    .select('*')
    .in('id', uniqueIds)

  if (error) {
    throw new Error(`Failed to get suppliers: ${error.message}`)
  }

  const supplierMap = new Map<string, Supplier>()
  for (const supplier of data || []) {
    supplierMap.set(supplier.id, supplier)
  }

  return supplierMap
}

/**
 * 搜尋供應商
 */
export async function searchSuppliers(
  db: SupabaseClient,
  query: string,
  companyId?: string
): Promise<Supplier[]> {
  // 安全：清理搜尋輸入防止 filter injection
  const safeQuery = sanitizeSearchQuery(query)
  if (!safeQuery) return []

  let dbQuery = db
    .from('suppliers')
    .select('*')
    .or(`name.ilike.%${safeQuery}%,code.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(50)

  if (companyId) {
    dbQuery = dbQuery.eq('company_id', companyId)
  }

  const { data, error } = await dbQuery

  if (error) {
    throw new Error(`Failed to search suppliers: ${error.message}`)
  }

  return data || []
}

/**
 * 生成供應商編號（呼叫資料庫 RPC 函數）
 */
export async function generateSupplierNumber(
  db: SupabaseClient,
  companyId: string
): Promise<string> {
  const { data, error } = await db.rpc('generate_supplier_number_atomic', {
    p_company_id: companyId
  })

  if (error) {
    throw new Error(`Failed to generate supplier number: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to generate supplier number: no data returned')
  }

  return data as string
}

/**
 * 建立供應商（帶重試機制，處理編號衝突）
 */
export async function createSupplierWithRetry(
  db: SupabaseClient,
  userId: string,
  companyId: string,
  data: Omit<Parameters<typeof createSupplier>[2], 'supplier_number' | 'company_id'>,
  options: Pick<RetryOptions, 'maxRetries' | 'baseDelayMs'> = {}
): Promise<Supplier> {
  return withRetry(
    async () => {
      const supplierNumber = await generateSupplierNumber(db, companyId)
      return createSupplier(db, userId, {
        ...data,
        company_id: companyId,
        supplier_number: supplierNumber
      })
    },
    {
      ...options,
      shouldRetry: isSupplierNumberConflict
    }
  )
}

/**
 * 取得公司的所有啟用中供應商（用於下拉選單）
 */
export async function getActiveSuppliers(
  db: SupabaseClient,
  companyId: string
): Promise<Supplier[]> {
  const { data, error } = await db
    .from('suppliers')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to get active suppliers: ${error.message}`)
  }

  return data || []
}
