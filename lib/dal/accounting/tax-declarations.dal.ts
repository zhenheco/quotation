/**
 * 營業稅申報 DAL (Data Access Layer)
 * 管理 tax_declarations 表的 CRUD 操作
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import type { TaxDeclaration, TaxDeclarationStatus } from '@/types/models'

// ============================================
// 類型定義
// ============================================

export interface CreateTaxDeclarationInput {
  company_id: string
  period_year: number
  period_bi_month: number
  opening_offset_amount?: number
}

export interface UpdateTaxDeclarationInput {
  current_output_tax?: number
  current_input_tax?: number
  fixed_asset_input_tax?: number
  return_allowance_tax?: number
  item_non_deductible_tax?: number
  ratio_non_deductible_tax?: number
  net_payable_amount?: number
  closing_offset_amount?: number
  opening_offset_amount?: number
  sales_invoice_count?: number
  purchase_invoice_count?: number
}

export interface DeclarationContinuityResult {
  valid: boolean
  expectedAmount?: number
  message?: string
}

export interface ListTaxDeclarationsOptions {
  year?: number
  status?: TaxDeclarationStatus
  limit?: number
  offset?: number
}

// ============================================
// 查詢函數
// ============================================

export async function createTaxDeclaration(
  db: SupabaseClient,
  input: CreateTaxDeclarationInput
): Promise<TaxDeclaration> {
  const { data, error } = await db
    .from('tax_declarations')
    .insert({
      company_id: input.company_id,
      period_year: input.period_year,
      period_bi_month: input.period_bi_month,
      opening_offset_amount: input.opening_offset_amount ?? 0,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        `${input.period_year} 年第 ${input.period_bi_month} 期已存在`
      )
    }
    throw new Error(`建立申報期別失敗: ${error.message}`)
  }

  return data
}

export async function getTaxDeclaration(
  db: SupabaseClient,
  id: string
): Promise<TaxDeclaration | null> {
  const { data, error } = await db
    .from('tax_declarations')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得申報期別失敗: ${error.message}`)
  }

  return data
}

export async function getTaxDeclarationByPeriod(
  db: SupabaseClient,
  companyId: string,
  year: number,
  biMonth: number
): Promise<TaxDeclaration | null> {
  const { data, error } = await db
    .from('tax_declarations')
    .select('*')
    .eq('company_id', companyId)
    .eq('period_year', year)
    .eq('period_bi_month', biMonth)
    .maybeSingle()

  if (error) {
    throw new Error(`查詢申報期別失敗: ${error.message}`)
  }

  return data
}

export async function getOrCreateTaxDeclaration(
  db: SupabaseClient,
  companyId: string,
  year: number,
  biMonth: number,
  openingOffset?: number
): Promise<TaxDeclaration> {
  const existing = await getTaxDeclarationByPeriod(db, companyId, year, biMonth)
  if (existing) return existing

  // 自動帶入上期留抵：查找前一期的 closing_offset_amount
  let autoOffset = openingOffset
  if (autoOffset === undefined) {
    const prev = await getLatestClosedDeclaration(db, companyId, year, biMonth)
    if (prev && prev.closing_offset_amount > 0) {
      autoOffset = prev.closing_offset_amount
    }
  }

  return createTaxDeclaration(db, {
    company_id: companyId,
    period_year: year,
    period_bi_month: biMonth,
    opening_offset_amount: autoOffset ?? 0,
  })
}

export async function getLatestClosedDeclaration(
  db: SupabaseClient,
  companyId: string,
  beforeYear: number,
  beforeBiMonth: number
): Promise<TaxDeclaration | null> {
  const { data, error } = await db
    .from('tax_declarations')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['closed', 'submitted'])
    .or(`period_year.lt.${beforeYear},and(period_year.eq.${beforeYear},period_bi_month.lt.${beforeBiMonth})`)
    .order('period_year', { ascending: false })
    .order('period_bi_month', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得上期申報失敗: ${error.message}`)
  }

  return data
}

// ============================================
// 更新函數
// ============================================

export async function updateTaxDeclaration(
  db: SupabaseClient,
  id: string,
  input: UpdateTaxDeclarationInput
): Promise<TaxDeclaration> {
  // 先檢查狀態
  const existing = await getTaxDeclaration(db, id)
  if (!existing) {
    throw new Error('申報期別不存在')
  }
  if (existing.status !== 'draft') {
    throw new Error('已送出的申報不能修改')
  }

  const { data, error } = await db
    .from('tax_declarations')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`更新申報期別失敗: ${error.message}`)
  }

  return data
}

export async function submitTaxDeclaration(
  db: SupabaseClient,
  id: string
): Promise<TaxDeclaration> {
  const existing = await getTaxDeclaration(db, id)
  if (!existing) {
    throw new Error('申報期別不存在')
  }
  if (existing.status !== 'draft') {
    throw new Error('只能送出草稿狀態的申報')
  }

  const { data, error } = await db
    .from('tax_declarations')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`送出申報失敗: ${error.message}`)
  }

  return data
}

export async function reopenTaxDeclaration(
  db: SupabaseClient,
  id: string
): Promise<TaxDeclaration> {
  const existing = await getTaxDeclaration(db, id)
  if (!existing) {
    throw new Error('申報期別不存在')
  }
  if (existing.status === 'draft') {
    throw new Error('已是草稿狀態')
  }
  if (existing.status === 'closed') {
    throw new Error('已結案的申報不能重新開啟')
  }

  const { data, error } = await db
    .from('tax_declarations')
    .update({
      status: 'draft',
      submitted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`重新開啟申報失敗: ${error.message}`)
  }

  return data
}

export async function listTaxDeclarations(
  db: SupabaseClient,
  companyId: string,
  options: ListTaxDeclarationsOptions = {}
): Promise<TaxDeclaration[]> {
  const { year, status, limit = 20, offset = 0 } = options

  let query = db
    .from('tax_declarations')
    .select('*')
    .eq('company_id', companyId)
    .order('period_year', { ascending: false })
    .order('period_bi_month', { ascending: false })
    .range(offset, offset + limit - 1)

  if (year) {
    query = query.eq('period_year', year)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`列表查詢失敗: ${error.message}`)
  }

  return data || []
}

// ============================================
// 驗證函數
// ============================================

export async function validateDeclarationContinuity(
  db: SupabaseClient,
  companyId: string,
  year: number,
  biMonth: number,
  openingOffset: number
): Promise<DeclarationContinuityResult> {
  const prev = await getLatestClosedDeclaration(db, companyId, year, biMonth)

  // 沒有上期記錄（首次使用），接受任意值
  if (!prev) {
    return { valid: true }
  }

  // 檢查連續性
  if (prev.closing_offset_amount !== openingOffset) {
    return {
      valid: false,
      expectedAmount: prev.closing_offset_amount,
      message: `上期留抵為 ${prev.closing_offset_amount}，但本期輸入 ${openingOffset}`,
    }
  }

  return { valid: true }
}
