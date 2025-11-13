/**
 * 付款條款資料存取層 (DAL)
 */

import { D1Client } from '@/lib/db/d1-client'

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

interface PaymentTermRow {
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
  description: string | null
  created_at: string
  updated_at: string
}

function parsePaymentTermRow(row: PaymentTermRow): PaymentTerm {
  return {
    ...row,
    description: row.description ? JSON.parse(row.description) : null
  }
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
  db: D1Client,
  userId: string,
  quotationId: string
): Promise<PaymentTerm[]> {
  const sql = `
    SELECT pt.* FROM payment_terms pt
    INNER JOIN quotations q ON pt.quotation_id = q.id
    WHERE pt.quotation_id = ? AND q.user_id = ?
    ORDER BY pt.term_number
  `

  const rows = await db.query<PaymentTermRow>(sql, [quotationId, userId])
  return rows.map(parsePaymentTermRow)
}

/**
 * 根據 ID 取得付款條款
 */
export async function getPaymentTermById(
  db: D1Client,
  userId: string,
  termId: string
): Promise<PaymentTerm | null> {
  const sql = `
    SELECT pt.* FROM payment_terms pt
    INNER JOIN quotations q ON pt.quotation_id = q.id
    WHERE pt.id = ? AND q.user_id = ?
  `

  const row = await db.queryOne<PaymentTermRow>(sql, [termId, userId])
  return row ? parsePaymentTermRow(row) : null
}

/**
 * 批次建立付款條款
 */
export async function batchCreatePaymentTerms(
  db: D1Client,
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

  const sql = `
    SELECT id FROM quotations
    WHERE id = ? AND user_id = ?
  `
  const quotation = await db.queryOne<{ id: string }>(sql, [quotationId, userId])
  if (!quotation) {
    throw new Error('Quotation not found or access denied')
  }

  const now = new Date().toISOString()
  const insertPromises = terms.map((term) => {
    const id = crypto.randomUUID()
    const amount = calculateTermAmount(term.percentage, total)

    return db.execute(
      `INSERT INTO payment_terms (
        id, quotation_id, term_number, percentage, amount,
        due_date, description, paid_amount, payment_status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'unpaid', ?, ?)`,
      [
        id,
        quotationId,
        term.term_number,
        term.percentage,
        amount,
        term.due_date || null,
        term.description ? JSON.stringify(term.description) : null,
        now,
        now
      ]
    )
  })

  await Promise.all(insertPromises)

  return getPaymentTerms(db, userId, quotationId)
}

/**
 * 更新付款條款
 */
export async function updatePaymentTerm(
  db: D1Client,
  userId: string,
  termId: string,
  updates: {
    term_name?: string
    percentage?: number
    amount?: number
    due_date?: string | null
  }
): Promise<PaymentTerm> {
  const updateFields: string[] = []
  const params: unknown[] = []

  if (updates.term_name !== undefined) {
    updateFields.push('term_name = ?')
    params.push(updates.term_name)
  }
  if (updates.percentage !== undefined) {
    updateFields.push('percentage = ?')
    params.push(updates.percentage)
  }
  if (updates.amount !== undefined) {
    updateFields.push('amount = ?')
    params.push(updates.amount)
  }
  if (updates.due_date !== undefined) {
    updateFields.push('due_date = ?')
    params.push(updates.due_date)
  }

  if (updateFields.length === 0) {
    const term = await getPaymentTermById(db, userId, termId)
    if (!term) {
      throw new Error('Payment term not found')
    }
    return term
  }

  updateFields.push('updated_at = ?')
  params.push(new Date().toISOString())

  const sql = `
    UPDATE payment_terms
    SET ${updateFields.join(', ')}
    WHERE id = ? AND EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = payment_terms.quotation_id
      AND quotations.user_id = ?
    )
  `
  params.push(termId, userId)

  await db.execute(sql, params)

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
  db: D1Client,
  userId: string,
  termId: string
): Promise<void> {
  const sql = `
    DELETE FROM payment_terms
    WHERE id = ? AND EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = payment_terms.quotation_id
      AND quotations.user_id = ?
    )
  `

  const result = await db.execute(sql, [termId, userId])
  if (result.count === 0) {
    throw new Error('Payment term not found or access denied')
  }
}

/**
 * 更新付款狀態
 */
export async function updatePaymentStatus(
  db: D1Client,
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

  await db.execute(
    `UPDATE payment_terms
     SET paid_amount = ?, paid_date = ?, payment_status = ?, updated_at = ?
     WHERE id = ?`,
    [paidAmount, finalPaidDate, status, now, termId]
  )

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
  db: D1Client,
  userId: string,
  quotationId: string,
  newTotal: number
): Promise<void> {
  const terms = await getPaymentTerms(db, userId, quotationId)

  if (terms.length === 0) {
    return
  }

  const now = new Date().toISOString()

  const updatePromises = terms.map((term) => {
    const newAmount = calculateTermAmount(term.percentage, newTotal)
    return db.execute(
      `UPDATE payment_terms
       SET amount = ?, updated_at = ?
       WHERE id = ?`,
      [newAmount, now, term.id]
    )
  })

  await Promise.all(updatePromises)
}

/**
 * 自動檢查並更新逾期狀態
 */
export async function updateOverdueStatus(db: D1Client): Promise<number> {
  const today = new Date().toISOString().split('T')[0]

  const sql = `
    SELECT * FROM payment_terms
    WHERE due_date < ? AND payment_status IN ('unpaid', 'partial')
  `

  const overdueTerms = await db.query<PaymentTermRow>(sql, [today])

  if (overdueTerms.length === 0) {
    return 0
  }

  const now = new Date().toISOString()
  const updatePromises = overdueTerms.map((term) =>
    db.execute(
      `UPDATE payment_terms
       SET payment_status = 'overdue', updated_at = ?
       WHERE id = ?`,
      [now, term.id]
    )
  )

  await Promise.all(updatePromises)

  return overdueTerms.length
}
