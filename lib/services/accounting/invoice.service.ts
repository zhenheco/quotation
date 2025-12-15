/**
 * 發票業務邏輯服務
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import {
  AccInvoice,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceQueryOptions,
  getInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  createInvoice,
  updateInvoice,
  verifyInvoice,
  deleteInvoice,
  postInvoiceWithJournalRpc,
  voidInvoiceRpc,
  recordInvoicePaymentRpc,
} from '@/lib/dal/accounting'

// ============================================
// 類型定義
// ============================================

export interface InvoiceListResult {
  invoices: AccInvoice[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface InvoiceSummary {
  totalOutput: number
  totalInput: number
  outputCount: number
  inputCount: number
  unpaidOutput: number
  unpaidInput: number
}

// ============================================
// 查詢服務
// ============================================

/**
 * 取得發票列表（分頁）
 */
export async function listInvoices(
  db: SupabaseClient,
  options: InvoiceQueryOptions & { page?: number; pageSize?: number }
): Promise<InvoiceListResult> {
  const page = options.page || 1
  const pageSize = options.pageSize || 20
  const offset = (page - 1) * pageSize

  const invoices = await getInvoices(db, {
    ...options,
    limit: pageSize,
    offset,
  })

  // 取得總數（簡化處理，實際可用 count 查詢）
  const allInvoices = await getInvoices(db, {
    ...options,
    limit: 10000,
    offset: 0,
  })

  return {
    invoices,
    total: allInvoices.length,
    page,
    pageSize,
    totalPages: Math.ceil(allInvoices.length / pageSize),
  }
}

/**
 * 取得發票詳情
 */
export async function getInvoiceDetail(
  db: SupabaseClient,
  invoiceId: string
): Promise<AccInvoice | null> {
  return getInvoiceById(db, invoiceId)
}

/**
 * 根據編號查詢發票
 */
export async function findInvoiceByNumber(
  db: SupabaseClient,
  companyId: string,
  invoiceNumber: string
): Promise<AccInvoice | null> {
  return getInvoiceByNumber(db, companyId, invoiceNumber)
}

/**
 * 取得發票統計摘要
 */
export async function getInvoiceSummary(
  db: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<InvoiceSummary> {
  const invoices = await getInvoices(db, {
    companyId,
    startDate,
    endDate,
    limit: 10000,
    offset: 0,
  })

  const summary: InvoiceSummary = {
    totalOutput: 0,
    totalInput: 0,
    outputCount: 0,
    inputCount: 0,
    unpaidOutput: 0,
    unpaidInput: 0,
  }

  for (const inv of invoices) {
    if (inv.status === 'VOIDED') continue

    const amount = parseFloat(String(inv.total_amount)) || 0

    if (inv.type === 'OUTPUT') {
      summary.totalOutput += amount
      summary.outputCount++
      if (inv.payment_status !== 'PAID') {
        summary.unpaidOutput += amount - (inv.paid_amount || 0)
      }
    } else {
      summary.totalInput += amount
      summary.inputCount++
      if (inv.payment_status !== 'PAID') {
        summary.unpaidInput += amount - (inv.paid_amount || 0)
      }
    }
  }

  return summary
}

// ============================================
// 寫入服務
// ============================================

/**
 * 建立新發票
 */
export async function createNewInvoice(
  db: SupabaseClient,
  input: CreateInvoiceInput
): Promise<AccInvoice> {
  // 驗證金額
  if (input.total_amount <= 0) {
    throw new Error('發票金額必須大於 0')
  }

  // 檢查發票號碼是否重複
  if (input.number) {
    const existing = await getInvoiceByNumber(db, input.company_id, input.number)
    if (existing) {
      throw new Error(`發票號碼 ${input.number} 已存在`)
    }
  }

  return createInvoice(db, input)
}

/**
 * 更新發票
 */
export async function updateExistingInvoice(
  db: SupabaseClient,
  invoiceId: string,
  input: UpdateInvoiceInput
): Promise<AccInvoice> {
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  if (existing.status !== 'DRAFT') {
    throw new Error('只能修改草稿狀態的發票')
  }

  return updateInvoice(db, invoiceId, input)
}

/**
 * 審核發票
 */
export async function verifyInvoiceById(
  db: SupabaseClient,
  invoiceId: string,
  verifiedBy: string
): Promise<AccInvoice> {
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  // 驗證必要欄位
  if (!existing.number) {
    throw new Error('發票號碼不可為空')
  }

  if (!existing.counterparty_name && !existing.counterparty_id) {
    throw new Error('請選擇或填寫往來對象')
  }

  return verifyInvoice(db, invoiceId, verifiedBy)
}

/**
 * 過帳發票（含產生傳票）
 */
export async function postInvoiceById(
  db: SupabaseClient,
  invoiceId: string,
  postedBy: string
): Promise<{ invoice_id: string; journal_entry_id: string; status: string }> {
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  if (existing.status !== 'VERIFIED') {
    throw new Error('只能過帳已審核的發票')
  }

  // 使用 RPC 確保原子性
  return postInvoiceWithJournalRpc(db, invoiceId, postedBy)
}

/**
 * 作廢發票（含作廢傳票）
 */
export async function voidInvoiceById(
  db: SupabaseClient,
  invoiceId: string,
  voidedBy: string,
  reason: string
): Promise<{ invoice_id: string; status: string }> {
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  if (existing.status === 'VOIDED') {
    throw new Error('發票已作廢')
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error('請填寫作廢原因')
  }

  // 使用 RPC 確保原子性（同時作廢發票和傳票）
  return voidInvoiceRpc(db, invoiceId, voidedBy, reason)
}

/**
 * 刪除發票（僅限草稿）
 */
export async function deleteInvoiceById(
  db: SupabaseClient,
  invoiceId: string
): Promise<void> {
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  if (existing.status !== 'DRAFT') {
    throw new Error('只能刪除草稿狀態的發票')
  }

  return deleteInvoice(db, invoiceId)
}

/**
 * 記錄付款
 */
export async function recordPayment(
  db: SupabaseClient,
  invoiceId: string,
  amount: number,
  paymentDate: string,
  paymentMethod: string,
  reference: string | null,
  recordedBy: string
): Promise<{ invoice_id: string; total_paid: number; payment_status: string }> {
  const existing = await getInvoiceById(db, invoiceId)
  if (!existing) {
    throw new Error('發票不存在')
  }

  if (existing.status === 'VOIDED') {
    throw new Error('無法對已作廢的發票記錄付款')
  }

  if (amount <= 0) {
    throw new Error('付款金額必須大於 0')
  }

  const totalAmount = parseFloat(String(existing.total_amount)) || 0
  const currentPaid = existing.paid_amount || 0
  const remaining = totalAmount - currentPaid

  if (amount > remaining + 0.01) {
    throw new Error(`付款金額 ${amount} 超過剩餘應付金額 ${remaining}`)
  }

  return recordInvoicePaymentRpc(
    db,
    invoiceId,
    amount,
    paymentDate,
    paymentMethod as 'CASH' | 'TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'UNCLASSIFIED',
    reference,
    recordedBy
  )
}

// ============================================
// 批次處理
// ============================================

/**
 * 批次審核發票
 */
export async function batchVerifyInvoices(
  db: SupabaseClient,
  invoiceIds: string[],
  verifiedBy: string
): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
  const success: string[] = []
  const failed: Array<{ id: string; error: string }> = []

  for (const id of invoiceIds) {
    try {
      await verifyInvoiceById(db, id, verifiedBy)
      success.push(id)
    } catch (error) {
      failed.push({
        id,
        error: error instanceof Error ? error.message : '未知錯誤',
      })
    }
  }

  return { success, failed }
}

/**
 * 批次過帳發票
 */
export async function batchPostInvoices(
  db: SupabaseClient,
  invoiceIds: string[],
  postedBy: string
): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
  const success: string[] = []
  const failed: Array<{ id: string; error: string }> = []

  for (const id of invoiceIds) {
    try {
      await postInvoiceById(db, id, postedBy)
      success.push(id)
    } catch (error) {
      failed.push({
        id,
        error: error instanceof Error ? error.message : '未知錯誤',
      })
    }
  }

  return { success, failed }
}
