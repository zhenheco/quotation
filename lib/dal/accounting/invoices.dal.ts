/**
 * 會計發票資料存取層 (DAL)
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================
// 類型定義
// ============================================

export type InvoiceType = 'OUTPUT' | 'INPUT'
export type InvoiceStatus = 'DRAFT' | 'VERIFIED' | 'POSTED' | 'VOIDED'
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE'
export type PaymentMethod = 'CASH' | 'CHECK' | 'TRANSFER' | 'CREDIT_CARD' | 'UNCLASSIFIED'

export interface AccInvoice {
  id: string
  company_id: string
  number: string
  type: InvoiceType
  date: string
  untaxed_amount: number
  tax_amount: number
  total_amount: number
  counterparty_id: string | null
  counterparty_tax_id: string | null
  counterparty_name: string | null
  tax_code_id: string | null
  description: string | null
  account_id: string | null
  account_code: string | null
  is_account_automatic: boolean
  account_confidence: number | null
  ocr_raw_data: Record<string, unknown> | null
  ocr_confidence: number | null
  attachment_url: string | null
  status: InvoiceStatus
  verified_at: string | null
  verified_by: string | null
  // 過帳相關欄位（Migration 048 新增）
  journal_entry_id: string | null
  posted_at: string | null
  posted_by: string | null
  // 作廢相關欄位（Migration 048 新增）
  voided_at: string | null
  voided_by: string | null
  void_reason: string | null
  // 付款追蹤
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  paid_amount: number
  paid_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateInvoiceInput {
  company_id: string
  number: string
  type: InvoiceType
  date: string
  untaxed_amount: number
  tax_amount: number
  total_amount: number
  counterparty_id?: string
  counterparty_tax_id?: string
  counterparty_name?: string
  tax_code_id?: string
  description?: string
  account_id?: string
  account_code?: string
  due_date?: string
  attachment_url?: string
}

export interface UpdateInvoiceInput {
  number?: string
  date?: string
  untaxed_amount?: number
  tax_amount?: number
  total_amount?: number
  counterparty_id?: string
  counterparty_tax_id?: string
  counterparty_name?: string
  tax_code_id?: string
  description?: string
  account_id?: string
  account_code?: string
  due_date?: string
  attachment_url?: string
  payment_status?: PaymentStatus
  payment_method?: PaymentMethod
  paid_amount?: number
  paid_date?: string
}

export interface InvoiceQueryOptions {
  companyId: string
  type?: InvoiceType
  status?: InvoiceStatus
  paymentStatus?: PaymentStatus
  startDate?: string
  endDate?: string
  counterpartyId?: string
  limit?: number
  offset?: number
}

export interface InvoiceSummary {
  total_count: number
  total_untaxed: number
  total_tax: number
  total_amount: number
  unpaid_count: number
  unpaid_amount: number
}

// ============================================
// 查詢函數
// ============================================

/**
 * 取得發票列表
 */
export async function getInvoices(
  db: SupabaseClient,
  options: InvoiceQueryOptions
): Promise<AccInvoice[]> {
  const {
    companyId,
    type,
    status,
    paymentStatus,
    startDate,
    endDate,
    counterpartyId,
    limit = 50,
    offset = 0,
  } = options

  let query = db
    .from('acc_invoices')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) {
    query = query.eq('type', type)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (paymentStatus) {
    query = query.eq('payment_status', paymentStatus)
  }

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  if (counterpartyId) {
    query = query.eq('counterparty_id', counterpartyId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得發票列表失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得單一發票
 */
export async function getInvoiceById(
  db: SupabaseClient,
  invoiceId: string
): Promise<AccInvoice | null> {
  const { data, error } = await db
    .from('acc_invoices')
    .select('*')
    .eq('id', invoiceId)
    .is('deleted_at', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得發票失敗: ${error.message}`)
  }

  return data
}

/**
 * 根據發票號碼取得發票
 */
export async function getInvoiceByNumber(
  db: SupabaseClient,
  companyId: string,
  number: string
): Promise<AccInvoice | null> {
  const { data, error } = await db
    .from('acc_invoices')
    .select('*')
    .eq('company_id', companyId)
    .eq('number', number)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`取得發票失敗: ${error.message}`)
  }

  return data
}

/**
 * 取得發票統計摘要
 */
export async function getInvoiceSummary(
  db: SupabaseClient,
  companyId: string,
  type: InvoiceType,
  startDate?: string,
  endDate?: string
): Promise<InvoiceSummary> {
  let query = db
    .from('acc_invoices')
    .select('untaxed_amount, tax_amount, total_amount, payment_status')
    .eq('company_id', companyId)
    .eq('type', type)
    .is('deleted_at', null)
    .neq('status', 'VOIDED')

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得發票摘要失敗: ${error.message}`)
  }

  const invoices = data || []

  return invoices.reduce(
    (acc, inv) => ({
      total_count: acc.total_count + 1,
      total_untaxed: acc.total_untaxed + (parseFloat(String(inv.untaxed_amount)) || 0),
      total_tax: acc.total_tax + (parseFloat(String(inv.tax_amount)) || 0),
      total_amount: acc.total_amount + (parseFloat(String(inv.total_amount)) || 0),
      unpaid_count: acc.unpaid_count + (inv.payment_status !== 'PAID' ? 1 : 0),
      unpaid_amount:
        acc.unpaid_amount +
        (inv.payment_status !== 'PAID' ? parseFloat(String(inv.total_amount)) || 0 : 0),
    }),
    {
      total_count: 0,
      total_untaxed: 0,
      total_tax: 0,
      total_amount: 0,
      unpaid_count: 0,
      unpaid_amount: 0,
    }
  )
}

/**
 * 取得逾期發票（帳齡分析）
 */
export async function getOverdueInvoices(
  db: SupabaseClient,
  companyId: string,
  type: InvoiceType,
  asOfDate: string
): Promise<AccInvoice[]> {
  const { data, error } = await db
    .from('acc_invoices')
    .select('*')
    .eq('company_id', companyId)
    .eq('type', type)
    .in('payment_status', ['UNPAID', 'PARTIAL'])
    .is('deleted_at', null)
    .lt('due_date', asOfDate)
    .order('due_date', { ascending: true })

  if (error) {
    throw new Error(`取得逾期發票失敗: ${error.message}`)
  }

  return data || []
}

// ============================================
// 寫入函數
// ============================================

/**
 * 建立發票
 */
export async function createInvoice(
  db: SupabaseClient,
  input: CreateInvoiceInput
): Promise<AccInvoice> {
  const { data, error } = await db
    .from('acc_invoices')
    .insert({
      id: crypto.randomUUID(),
      company_id: input.company_id,
      number: input.number,
      type: input.type,
      date: input.date,
      untaxed_amount: input.untaxed_amount,
      tax_amount: input.tax_amount,
      total_amount: input.total_amount,
      counterparty_id: input.counterparty_id || null,
      counterparty_tax_id: input.counterparty_tax_id || null,
      counterparty_name: input.counterparty_name || null,
      tax_code_id: input.tax_code_id || null,
      description: input.description || null,
      account_id: input.account_id || null,
      account_code: input.account_code || null,
      due_date: input.due_date || null,
      attachment_url: input.attachment_url || null,
      status: 'DRAFT',
      payment_status: 'UNPAID',
      payment_method: 'UNCLASSIFIED',
      paid_amount: 0,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`發票號碼 ${input.number} 已存在`)
    }
    throw new Error(`建立發票失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新發票
 */
export async function updateInvoice(
  db: SupabaseClient,
  invoiceId: string,
  input: UpdateInvoiceInput
): Promise<AccInvoice> {
  // 只能更新草稿狀態的發票
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  if (existing.status !== 'DRAFT') {
    throw new Error('只能修改草稿狀態的發票')
  }

  const updateData: Record<string, unknown> = {}

  if (input.number !== undefined) updateData.number = input.number
  if (input.date !== undefined) updateData.date = input.date
  if (input.untaxed_amount !== undefined) updateData.untaxed_amount = input.untaxed_amount
  if (input.tax_amount !== undefined) updateData.tax_amount = input.tax_amount
  if (input.total_amount !== undefined) updateData.total_amount = input.total_amount
  if (input.counterparty_id !== undefined) updateData.counterparty_id = input.counterparty_id
  if (input.counterparty_tax_id !== undefined)
    updateData.counterparty_tax_id = input.counterparty_tax_id
  if (input.counterparty_name !== undefined) updateData.counterparty_name = input.counterparty_name
  if (input.tax_code_id !== undefined) updateData.tax_code_id = input.tax_code_id
  if (input.description !== undefined) updateData.description = input.description
  if (input.account_id !== undefined) updateData.account_id = input.account_id
  if (input.account_code !== undefined) updateData.account_code = input.account_code
  if (input.due_date !== undefined) updateData.due_date = input.due_date
  if (input.attachment_url !== undefined) updateData.attachment_url = input.attachment_url
  if (input.payment_status !== undefined) updateData.payment_status = input.payment_status
  if (input.payment_method !== undefined) updateData.payment_method = input.payment_method
  if (input.paid_amount !== undefined) updateData.paid_amount = input.paid_amount
  if (input.paid_date !== undefined) updateData.paid_date = input.paid_date

  const { data, error } = await db
    .from('acc_invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) {
    throw new Error(`更新發票失敗: ${error.message}`)
  }

  return data
}

/**
 * 驗證發票
 */
export async function verifyInvoice(
  db: SupabaseClient,
  invoiceId: string,
  verifiedBy: string
): Promise<AccInvoice> {
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  if (existing.status !== 'DRAFT') {
    throw new Error('只能驗證草稿狀態的發票')
  }

  const { data, error } = await db
    .from('acc_invoices')
    .update({
      status: 'VERIFIED',
      verified_at: new Date().toISOString(),
      verified_by: verifiedBy,
    })
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) {
    throw new Error(`驗證發票失敗: ${error.message}`)
  }

  return data
}

/**
 * 過帳發票（需要在 Service 層處理傳票產生）
 */
export async function postInvoice(
  db: SupabaseClient,
  invoiceId: string
): Promise<AccInvoice> {
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  if (existing.status !== 'VERIFIED') {
    throw new Error('只能過帳已驗證的發票')
  }

  const { data, error } = await db
    .from('acc_invoices')
    .update({
      status: 'POSTED',
    })
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) {
    throw new Error(`過帳發票失敗: ${error.message}`)
  }

  return data
}

/**
 * 作廢發票
 */
export async function voidInvoice(
  db: SupabaseClient,
  invoiceId: string
): Promise<AccInvoice> {
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  if (existing.status === 'VOIDED') {
    throw new Error('發票已作廢')
  }

  const { data, error } = await db
    .from('acc_invoices')
    .update({
      status: 'VOIDED',
    })
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) {
    throw new Error(`作廢發票失敗: ${error.message}`)
  }

  return data
}

/**
 * 刪除發票（軟刪除）
 */
export async function deleteInvoice(
  db: SupabaseClient,
  invoiceId: string
): Promise<void> {
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  if (existing.status === 'POSTED') {
    throw new Error('已過帳的發票不能刪除')
  }

  const { error } = await db
    .from('acc_invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', invoiceId)

  if (error) {
    throw new Error(`刪除發票失敗: ${error.message}`)
  }
}

/**
 * 記錄付款
 */
export async function recordPayment(
  db: SupabaseClient,
  invoiceId: string,
  amount: number,
  method: PaymentMethod,
  paidDate: string
): Promise<AccInvoice> {
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  const newPaidAmount = existing.paid_amount + amount
  const totalAmount = parseFloat(String(existing.total_amount))

  let newPaymentStatus: PaymentStatus
  if (newPaidAmount >= totalAmount) {
    newPaymentStatus = 'PAID'
  } else if (newPaidAmount > 0) {
    newPaymentStatus = 'PARTIAL'
  } else {
    newPaymentStatus = 'UNPAID'
  }

  const { data, error } = await db
    .from('acc_invoices')
    .update({
      paid_amount: newPaidAmount,
      payment_method: method,
      paid_date: paidDate,
      payment_status: newPaymentStatus,
    })
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) {
    throw new Error(`記錄付款失敗: ${error.message}`)
  }

  return data
}

// ============================================
// RPC 版本（原子性操作）
// ============================================

/**
 * 過帳發票並產生傳票（RPC 版本 - 原子性操作）
 */
export async function postInvoiceWithJournalRpc(
  db: SupabaseClient,
  invoiceId: string,
  postedBy: string
): Promise<{ invoice_id: string; journal_entry_id: string; status: string }> {
  const { data, error } = await db.rpc('post_invoice_with_journal', {
    p_invoice_id: invoiceId,
    p_posted_by: postedBy,
  })

  if (error) {
    throw new Error(`過帳發票失敗 (RPC): ${error.message}`)
  }

  return data
}

/**
 * 作廢發票（RPC 版本 - 同時作廢傳票）
 */
export async function voidInvoiceRpc(
  db: SupabaseClient,
  invoiceId: string,
  voidedBy: string,
  reason: string
): Promise<{ invoice_id: string; status: string }> {
  const { data, error } = await db.rpc('void_invoice', {
    p_invoice_id: invoiceId,
    p_voided_by: voidedBy,
    p_reason: reason,
  })

  if (error) {
    throw new Error(`作廢發票失敗 (RPC): ${error.message}`)
  }

  return data
}

/**
 * 記錄發票付款（RPC 版本）
 */
export async function recordInvoicePaymentRpc(
  db: SupabaseClient,
  invoiceId: string,
  amount: number,
  paymentDate: string,
  paymentMethod: PaymentMethod,
  reference: string | null,
  recordedBy: string
): Promise<{ invoice_id: string; total_paid: number; payment_status: string }> {
  const { data, error } = await db.rpc('record_invoice_payment', {
    p_invoice_id: invoiceId,
    p_amount: amount,
    p_payment_date: paymentDate,
    p_payment_method: paymentMethod,
    p_reference: reference,
    p_recorded_by: recordedBy,
  })

  if (error) {
    throw new Error(`記錄付款失敗 (RPC): ${error.message}`)
  }

  return data
}
