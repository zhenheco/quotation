/**
 * 付款條款資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue'

export interface PaymentTerm {
  id: string
  quotation_id: string
  term_number: number
  term_name: string | null
  percentage: number
  amount: number
  due_date: string | null
  paid_amount: number
  paid_date: string | null
  payment_status: PaymentStatus
  description: { zh: string; en: string } | null
  created_at: string
  updated_at: string
}

/**
 * 計算付款條款金額
 */
export function calculateTermAmount(percentage: number, total: number): number {
  if (percentage < 0 || percentage > 100) {
    throw new Error('百分比必須在 0-100 之間')
  }
  if (total < 0) {
    throw new Error('總金額必須大於等於 0')
  }
  return Math.round((percentage / 100) * total * 100) / 100
}

/**
 * 驗證付款條款百分比總和
 */
export function validatePercentages(terms: Pick<PaymentTerm, 'percentage'>[]): {
  isValid: boolean
  sum: number
  warning?: string
} {
  const sum = terms.reduce((acc, term) => acc + term.percentage, 0)
  const roundedSum = Math.round(sum * 100) / 100

  if (roundedSum === 100) {
    return { isValid: true, sum: roundedSum }
  }

  const warning =
    roundedSum < 100
      ? `付款百分比總和為 ${roundedSum}%，未達 100%`
      : `付款百分比總和為 ${roundedSum}%，超過 100%`

  return { isValid: true, sum: roundedSum, warning }
}

/**
 * 判斷付款狀態
 */
export function determinePaymentStatus(
  term: Pick<PaymentTerm, 'amount' | 'paid_amount' | 'due_date'>,
  currentDate: Date = new Date()
): PaymentStatus {
  const paidAmount = term.paid_amount || 0

  if (paidAmount >= term.amount) {
    return 'paid'
  }

  if (paidAmount > 0) {
    return 'partial'
  }

  if (term.due_date) {
    const dueDate = new Date(term.due_date)
    if (currentDate > dueDate) {
      return 'overdue'
    }
  }

  return 'unpaid'
}

/**
 * 取得報價單的所有付款條款
 */
export async function getPaymentTerms(
  db: SupabaseClient,
  userId: string,
  quotationId: string
): Promise<PaymentTerm[]> {
  const { data, error } = await db
    .from('payment_terms')
    .select(`
      *,
      quotations!inner (user_id)
    `)
    .eq('quotation_id', quotationId)
    .eq('quotations.user_id', userId)
    .order('term_number')

  if (error) {
    throw new Error(`Failed to get payment terms: ${error.message}`)
  }

  return (data || []).map(row => ({
    ...row,
    quotations: undefined,
  }))
}

/**
 * 根據 ID 取得付款條款
 */
export async function getPaymentTermById(
  db: SupabaseClient,
  userId: string,
  termId: string
): Promise<PaymentTerm | null> {
  const { data, error } = await db
    .from('payment_terms')
    .select(`
      *,
      quotations!inner (user_id)
    `)
    .eq('id', termId)
    .eq('quotations.user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get payment term: ${error.message}`)
  }

  if (!data) return null

  return {
    ...data,
    quotations: undefined,
  }
}

/**
 * 批次建立付款條款
 */
export async function batchCreatePaymentTerms(
  db: SupabaseClient,
  userId: string,
  quotationId: string,
  terms: Array<{
    term_number: number
    percentage: number
    due_date?: string | null
    description?: { zh: string; en: string }
  }>,
  total: number
): Promise<PaymentTerm[]> {
  const validation = validatePercentages(terms)
  if (validation.warning) {
    console.warn(validation.warning)
  }

  const { data: quotation, error: quotationError } = await db
    .from('quotations')
    .select('id')
    .eq('id', quotationId)
    .eq('user_id', userId)
    .single()

  if (quotationError && quotationError.code !== 'PGRST116') {
    throw new Error(`Failed to verify quotation: ${quotationError.message}`)
  }

  if (!quotation) {
    throw new Error('Quotation not found or access denied')
  }

  const now = new Date().toISOString()
  const insertData = terms.map((term) => ({
    id: crypto.randomUUID(),
    quotation_id: quotationId,
    term_number: term.term_number,
    percentage: term.percentage,
    amount: calculateTermAmount(term.percentage, total),
    due_date: term.due_date || null,
    description: term.description || null,
    paid_amount: 0,
    payment_status: 'unpaid' as const,
    created_at: now,
    updated_at: now,
  }))

  const { error: insertError } = await db
    .from('payment_terms')
    .insert(insertData)

  if (insertError) {
    throw new Error(`Failed to create payment terms: ${insertError.message}`)
  }

  return getPaymentTerms(db, userId, quotationId)
}

/**
 * 更新付款條款
 */
export async function updatePaymentTerm(
  db: SupabaseClient,
  userId: string,
  termId: string,
  updates: {
    term_name?: string
    percentage?: number
    amount?: number
    due_date?: string | null
  }
): Promise<PaymentTerm> {
  const existing = await getPaymentTermById(db, userId, termId)
  if (!existing) {
    throw new Error('Payment term not found')
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.term_name !== undefined) updateData.term_name = updates.term_name
  if (updates.percentage !== undefined) updateData.percentage = updates.percentage
  if (updates.amount !== undefined) updateData.amount = updates.amount
  if (updates.due_date !== undefined) updateData.due_date = updates.due_date

  if (Object.keys(updateData).length === 1) {
    return existing
  }

  const { error } = await db
    .from('payment_terms')
    .update(updateData)
    .eq('id', termId)

  if (error) {
    throw new Error(`Failed to update payment term: ${error.message}`)
  }

  const term = await getPaymentTermById(db, userId, termId)
  if (!term) {
    throw new Error('Payment term not found after update')
  }

  return term
}

/**
 * 刪除付款條款
 */
export async function deletePaymentTerm(
  db: SupabaseClient,
  userId: string,
  termId: string
): Promise<void> {
  const existing = await getPaymentTermById(db, userId, termId)
  if (!existing) {
    throw new Error('Payment term not found or access denied')
  }

  const { error } = await db
    .from('payment_terms')
    .delete()
    .eq('id', termId)

  if (error) {
    throw new Error(`Failed to delete payment term: ${error.message}`)
  }
}

/**
 * 更新付款狀態
 */
export async function updatePaymentStatus(
  db: SupabaseClient,
  userId: string,
  termId: string,
  paidAmount: number,
  paidDate?: string
): Promise<PaymentTerm> {
  const term = await getPaymentTermById(db, userId, termId)
  if (!term) {
    throw new Error('Payment term not found')
  }

  const status = determinePaymentStatus(
    {
      amount: term.amount,
      paid_amount: paidAmount,
      due_date: term.due_date,
    },
    paidDate ? new Date(paidDate) : new Date()
  )

  const now = new Date().toISOString()
  const finalPaidDate = paidDate || now.split('T')[0]

  const { error } = await db
    .from('payment_terms')
    .update({
      paid_amount: paidAmount,
      paid_date: finalPaidDate,
      payment_status: status,
      updated_at: now,
    })
    .eq('id', termId)

  if (error) {
    throw new Error(`Failed to update payment status: ${error.message}`)
  }

  const updatedTerm = await getPaymentTermById(db, userId, termId)
  if (!updatedTerm) {
    throw new Error('Payment term not found after update')
  }

  return updatedTerm
}

/**
 * 重新計算所有付款條款金額
 */
export async function recalculateAllTerms(
  db: SupabaseClient,
  userId: string,
  quotationId: string,
  newTotal: number
): Promise<void> {
  const terms = await getPaymentTerms(db, userId, quotationId)

  if (terms.length === 0) {
    return
  }

  const now = new Date().toISOString()

  for (const term of terms) {
    const newAmount = calculateTermAmount(term.percentage, newTotal)
    const { error } = await db
      .from('payment_terms')
      .update({
        amount: newAmount,
        updated_at: now,
      })
      .eq('id', term.id)

    if (error) {
      throw new Error(`Failed to recalculate term ${term.id}: ${error.message}`)
    }
  }
}

/**
 * 自動檢查並更新逾期狀態
 */
export async function updateOverdueStatus(db: SupabaseClient): Promise<number> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error: fetchError } = await db
    .from('payment_terms')
    .select('id')
    .lt('due_date', today)
    .in('payment_status', ['unpaid', 'partial'])

  if (fetchError) {
    throw new Error(`Failed to get overdue terms: ${fetchError.message}`)
  }

  const overdueTerms = data || []

  if (overdueTerms.length === 0) {
    return 0
  }

  const now = new Date().toISOString()
  const { error: updateError } = await db
    .from('payment_terms')
    .update({
      payment_status: 'overdue',
      updated_at: now,
    })
    .lt('due_date', today)
    .in('payment_status', ['unpaid', 'partial'])

  if (updateError) {
    throw new Error(`Failed to update overdue status: ${updateError.message}`)
  }

  return overdueTerms.length
}
