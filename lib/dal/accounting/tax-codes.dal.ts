/**
 * 稅碼資料存取層 (DAL)
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================
// 類型定義
// ============================================

export type TaxType = 'TAXABLE' | 'ZERO_RATED' | 'EXEMPT' | 'NON_TAXABLE'

export interface TaxCode {
  id: string
  code: string
  name: string
  description: string | null
  tax_rate: number
  tax_type: TaxType
  is_deductible: boolean
  is_common: boolean
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TaxCodeQueryOptions {
  taxType?: TaxType
  isDeductible?: boolean
  isActive?: boolean
}

// ============================================
// 查詢函數
// ============================================

/**
 * 取得所有稅碼
 */
export async function getTaxCodes(
  db: SupabaseClient,
  options: TaxCodeQueryOptions = {}
): Promise<TaxCode[]> {
  const { taxType, isDeductible, isActive = true } = options

  let query = db
    .from('tax_codes')
    .select('*')
    .order('code', { ascending: true })

  if (taxType) {
    query = query.eq('tax_type', taxType)
  }

  if (isDeductible !== undefined) {
    query = query.eq('is_deductible', isDeductible)
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得稅碼失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得稅碼
 */
export async function getTaxCodeById(
  db: SupabaseClient,
  taxCodeId: string
): Promise<TaxCode | null> {
  const { data, error } = await db
    .from('tax_codes')
    .select('*')
    .eq('id', taxCodeId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得稅碼失敗: ${error.message}`)
  }

  return data
}

/**
 * 根據代碼取得稅碼
 */
export async function getTaxCodeByCode(
  db: SupabaseClient,
  code: string
): Promise<TaxCode | null> {
  const { data, error } = await db
    .from('tax_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    throw new Error(`取得稅碼失敗: ${error.message}`)
  }

  return data
}

/**
 * 取得預設稅碼（應稅 5%）
 */
export async function getDefaultTaxCode(
  db: SupabaseClient
): Promise<TaxCode | null> {
  return getTaxCodeByCode(db, 'TX5')
}

/**
 * 計算稅額
 */
export function calculateTax(
  untaxedAmount: number,
  taxRate: number,
  isTaxIncluded: boolean = false
): { untaxed: number; tax: number; total: number } {
  if (isTaxIncluded) {
    // 含稅價反推
    const total = untaxedAmount
    const untaxed = Math.round(total / (1 + taxRate))
    const tax = total - untaxed
    return { untaxed, tax, total }
  } else {
    // 未稅價計算
    const untaxed = untaxedAmount
    const tax = Math.round(untaxed * taxRate)
    const total = untaxed + tax
    return { untaxed, tax, total }
  }
}
