/**
 * 付款資料存取層 (DAL)
 */

import { D1Client } from '@/lib/db/d1-client'

export interface Payment {
  id: string
  user_id: string
  company_id: string | null
  quotation_id: string | null
  contract_id: string | null
  customer_id: string
  payment_type: 'deposit' | 'installment' | 'final' | 'full'
  payment_date: string
  amount: number
  currency: string
  payment_method: string | null
  reference_number: string | null
  receipt_url: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
}

export async function getPayments(
  db: D1Client,
  userId: string,
  companyId?: string
): Promise<Payment[]> {
  let sql = 'SELECT * FROM payments WHERE user_id = ?'
  const params: unknown[] = [userId]

  if (companyId) {
    sql += ' AND company_id = ?'
    params.push(companyId)
  }

  sql += ' ORDER BY payment_date DESC'

  return await db.query<Payment>(sql, params)
}

export async function getPaymentById(
  db: D1Client,
  userId: string,
  paymentId: string
): Promise<Payment | null> {
  return await db.queryOne<Payment>(
    'SELECT * FROM payments WHERE id = ? AND user_id = ?',
    [paymentId, userId]
  )
}

export async function createPayment(
  db: D1Client,
  userId: string,
  data: Omit<Payment, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Payment> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO payments (
      id, user_id, company_id, quotation_id, contract_id, customer_id,
      payment_type, payment_date, amount, currency, payment_method,
      reference_number, receipt_url, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, data.company_id, data.quotation_id, data.contract_id, data.customer_id,
      data.payment_type, data.payment_date, data.amount, data.currency, data.payment_method,
      data.reference_number, data.receipt_url, data.status, data.notes, now, now
    ]
  )

  const payment = await getPaymentById(db, userId, id)
  if (!payment) {
    throw new Error('Failed to create payment')
  }

  return payment
}
