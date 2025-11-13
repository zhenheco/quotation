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

export interface PaymentFilters {
  customer_id?: string
  quotation_id?: string
  contract_id?: string
  status?: string
  payment_type?: string
  company_id?: string
}

export interface PaymentWithRelations extends Payment {
  customer?: {
    id: string
    company_name_zh: string
    company_name_en: string
  }
  quotation?: {
    id: string
    quotation_number: string
    total: number
  }
  contract?: {
    id: string
    contract_number: string
    total_amount: number
  }
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

export async function getPaymentsWithFilters(
  db: D1Client,
  userId: string,
  filters: PaymentFilters = {}
): Promise<Payment[]> {
  let sql = 'SELECT * FROM payments WHERE user_id = ?'
  const params: unknown[] = [userId]

  if (filters.customer_id) {
    sql += ' AND customer_id = ?'
    params.push(filters.customer_id)
  }

  if (filters.quotation_id) {
    sql += ' AND quotation_id = ?'
    params.push(filters.quotation_id)
  }

  if (filters.contract_id) {
    sql += ' AND contract_id = ?'
    params.push(filters.contract_id)
  }

  if (filters.status) {
    sql += ' AND status = ?'
    params.push(filters.status)
  }

  if (filters.payment_type) {
    sql += ' AND payment_type = ?'
    params.push(filters.payment_type)
  }

  if (filters.company_id) {
    sql += ' AND company_id = ?'
    params.push(filters.company_id)
  }

  sql += ' ORDER BY payment_date DESC'

  return await db.query<Payment>(sql, params)
}

export async function getPaymentsWithRelations(
  db: D1Client,
  userId: string,
  filters: PaymentFilters = {}
): Promise<PaymentWithRelations[]> {
  let sql = `
    SELECT
      p.*,
      c.id as customer_id_fk,
      c.name as customer_name,
      q.id as quotation_id_fk,
      q.quotation_number,
      q.total as quotation_total,
      ct.id as contract_id_fk,
      ct.contract_number,
      ct.total_amount as contract_total_amount
    FROM payments p
    INNER JOIN customers c ON p.customer_id = c.id
    LEFT JOIN quotations q ON p.quotation_id = q.id
    LEFT JOIN customer_contracts ct ON p.contract_id = ct.id
    WHERE p.user_id = ?
  `
  const params: unknown[] = [userId]

  if (filters.customer_id) {
    sql += ' AND p.customer_id = ?'
    params.push(filters.customer_id)
  }

  if (filters.quotation_id) {
    sql += ' AND p.quotation_id = ?'
    params.push(filters.quotation_id)
  }

  if (filters.contract_id) {
    sql += ' AND p.contract_id = ?'
    params.push(filters.contract_id)
  }

  if (filters.status) {
    sql += ' AND p.status = ?'
    params.push(filters.status)
  }

  if (filters.payment_type) {
    sql += ' AND p.payment_type = ?'
    params.push(filters.payment_type)
  }

  if (filters.company_id) {
    sql += ' AND p.company_id = ?'
    params.push(filters.company_id)
  }

  sql += ' ORDER BY p.payment_date DESC'

  const rows = await db.query<Payment & {
    customer_id_fk: string
    customer_name: string
    quotation_id_fk: string | null
    quotation_number: string | null
    quotation_total: number | null
    contract_id_fk: string | null
    contract_number: string | null
    contract_total_amount: number | null
  }>(sql, params)

  return rows.map(row => {
    const { customer_id_fk, customer_name, quotation_id_fk, quotation_number, quotation_total, contract_id_fk, contract_number, contract_total_amount, ...payment } = row

    return {
      ...payment,
      customer: {
        id: customer_id_fk,
        company_name_zh: customer_name,
        company_name_en: customer_name,
      },
      quotation: quotation_id_fk ? {
        id: quotation_id_fk,
        quotation_number: quotation_number || '',
        total: quotation_total || 0,
      } : undefined,
      contract: contract_id_fk ? {
        id: contract_id_fk,
        contract_number: contract_number || '',
        total_amount: contract_total_amount || 0,
      } : undefined,
    }
  })
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

export interface CollectedPaymentFilters {
  customer_id?: string
  start_date?: string
  end_date?: string
  payment_type?: string
}

export interface PaymentSchedule {
  id: string
  user_id: string
  contract_id: string
  customer_id: string
  schedule_number: number
  due_date: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paid_amount: number
  paid_date: string | null
  payment_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface UnpaidPaymentFilters {
  customer_id?: string
  min_days_overdue?: number
}

export interface UnpaidPaymentWithDetails extends PaymentSchedule {
  customer_name: string
  contract_number: string
  contract_title: string
  days_overdue: number
}

export interface PaymentStatistics {
  current_month: {
    total_collected: number
    total_pending: number
    total_overdue: number
    currency: string
  }
  current_year: {
    total_collected: number
    total_pending: number
    total_overdue: number
    currency: string
  }
  overdue: {
    count: number
    total_amount: number
    average_days: number
  }
}

export async function getCollectedPayments(
  db: D1Client,
  userId: string,
  filters: CollectedPaymentFilters = {}
): Promise<Payment[]> {
  let sql = 'SELECT * FROM payments WHERE user_id = ? AND status = ?'
  const params: unknown[] = [userId, 'confirmed']

  if (filters.customer_id) {
    sql += ' AND customer_id = ?'
    params.push(filters.customer_id)
  }

  if (filters.start_date) {
    sql += ' AND payment_date >= ?'
    params.push(filters.start_date)
  }

  if (filters.end_date) {
    sql += ' AND payment_date <= ?'
    params.push(filters.end_date)
  }

  if (filters.payment_type) {
    sql += ' AND payment_type = ?'
    params.push(filters.payment_type)
  }

  sql += ' ORDER BY payment_date DESC'

  return await db.query<Payment>(sql, params)
}

export async function getPaymentStatistics(
  db: D1Client,
  userId: string
): Promise<PaymentStatistics> {
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentYearStart = new Date(now.getFullYear(), 0, 1)

  const [currentMonthSchedules, currentYearSchedules, overdueSchedules] = await Promise.all([
    db.query<{ status: string; amount: number; currency: string }>(
      'SELECT status, amount, currency FROM payment_schedules WHERE user_id = ? AND due_date >= ?',
      [userId, currentMonthStart.toISOString()]
    ),
    db.query<{ status: string; amount: number; currency: string }>(
      'SELECT status, amount, currency FROM payment_schedules WHERE user_id = ? AND due_date >= ?',
      [userId, currentYearStart.toISOString()]
    ),
    db.query<{ amount: number; days_overdue: number }>(
      `SELECT amount, CAST(julianday('now') - julianday(due_date) AS INTEGER) as days_overdue
       FROM payment_schedules
       WHERE user_id = ? AND status = 'overdue'`,
      [userId]
    ),
  ])

  const currentMonthCollected = currentMonthSchedules
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  const currentMonthPending = currentMonthSchedules
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)

  const currentMonthOverdue = currentMonthSchedules
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0)

  const currentYearCollected = currentYearSchedules
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  const currentYearPending = currentYearSchedules
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)

  const currentYearOverdue = currentYearSchedules
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0)

  const currency = currentMonthSchedules.find(p => p.currency)?.currency || 'TWD'

  const overdueCount = overdueSchedules.length
  const overdueTotalAmount = overdueSchedules.reduce((sum, p) => sum + p.amount, 0)
  const overdueAverageDays = overdueCount > 0
    ? Math.floor(overdueSchedules.reduce((sum, p) => sum + p.days_overdue, 0) / overdueCount)
    : 0

  return {
    current_month: {
      total_collected: currentMonthCollected,
      total_pending: currentMonthPending,
      total_overdue: currentMonthOverdue,
      currency,
    },
    current_year: {
      total_collected: currentYearCollected,
      total_pending: currentYearPending,
      total_overdue: currentYearOverdue,
      currency,
    },
    overdue: {
      count: overdueCount,
      total_amount: overdueTotalAmount,
      average_days: overdueAverageDays,
    },
  }
}

/**
 * 取得未付款的排程（超過 30 天逾期）
 */
export async function getUnpaidPaymentSchedules(
  db: D1Client,
  userId: string,
  filters: UnpaidPaymentFilters = {}
): Promise<UnpaidPaymentWithDetails[]> {
  const today = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(today.getDate() - 30)

  let sql = `
    SELECT
      ps.*,
      c.name as customer_name,
      ct.contract_number,
      ct.title as contract_title
    FROM payment_schedules ps
    INNER JOIN customers c ON ps.customer_id = c.id
    INNER JOIN customer_contracts ct ON ps.contract_id = ct.id
    WHERE ct.user_id = ?
      AND ps.status = 'overdue'
      AND ps.due_date < ?
  `
  const params: unknown[] = [userId, thirtyDaysAgo.toISOString().split('T')[0]]

  if (filters.customer_id) {
    sql += ' AND ps.customer_id = ?'
    params.push(filters.customer_id)
  }

  sql += ' ORDER BY ps.due_date ASC'

  const rows = await db.query<PaymentSchedule & {
    customer_name: string
    contract_number: string
    contract_title: string
  }>(sql, params)

  return rows.map(row => {
    const dueDate = new Date(row.due_date)
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    if (filters.min_days_overdue && daysOverdue < filters.min_days_overdue) {
      return null
    }

    return {
      ...row,
      days_overdue: daysOverdue,
    }
  }).filter((item): item is UnpaidPaymentWithDetails => item !== null)
}

/**
 * 標記付款排程為逾期
 */
export async function markPaymentScheduleAsOverdue(
  db: D1Client,
  userId: string,
  scheduleId: string
): Promise<PaymentSchedule | null> {
  const schedule = await db.queryOne<PaymentSchedule>(
    'SELECT * FROM payment_schedules WHERE id = ? AND user_id = ?',
    [scheduleId, userId]
  )

  if (!schedule) {
    return null
  }

  await db.execute(
    'UPDATE payment_schedules SET status = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = ?',
    ['overdue', new Date().toISOString(), scheduleId, userId, 'pending']
  )

  return await db.queryOne<PaymentSchedule>(
    'SELECT * FROM payment_schedules WHERE id = ? AND user_id = ?',
    [scheduleId, userId]
  )
}

/**
 * 批量標記逾期的付款排程
 */
export async function batchMarkOverduePaymentSchedules(
  db: D1Client,
  userId: string
): Promise<{ updated_count: number; schedule_ids: string[] }> {
  const today = new Date().toISOString().split('T')[0]

  const overdueSchedules = await db.query<PaymentSchedule>(
    'SELECT id FROM payment_schedules WHERE user_id = ? AND status = ? AND due_date < ?',
    [userId, 'pending', today]
  )

  if (overdueSchedules.length === 0) {
    return { updated_count: 0, schedule_ids: [] }
  }

  const scheduleIds = overdueSchedules.map(s => s.id)

  await db.execute(
    `UPDATE payment_schedules
     SET status = 'overdue', updated_at = ?
     WHERE user_id = ? AND status = 'pending' AND due_date < ?`,
    [new Date().toISOString(), userId, today]
  )

  return {
    updated_count: overdueSchedules.length,
    schedule_ids: scheduleIds,
  }
}

/**
 * 取得即將到期的收款提醒
 */
export async function getPaymentReminders(
  db: D1Client,
  userId: string,
  daysAhead: number = 30
): Promise<Array<{
  contract_id: string
  contract_number: string
  contract_title: string
  customer_id: string
  customer_name: string
  next_collection_date: string
  next_collection_amount: number
  currency: string
  days_until_collection: number
  collection_status: 'overdue' | 'due_today' | 'due_soon' | 'upcoming'
}>> {
  const today = new Date()
  const futureDate = new Date()
  futureDate.setDate(today.getDate() + daysAhead)

  const sql = `
    SELECT
      ct.id as contract_id,
      ct.contract_number,
      ct.title as contract_title,
      ct.customer_id,
      c.name as customer_name,
      ps.due_date as next_collection_date,
      ps.amount as next_collection_amount,
      ps.currency
    FROM customer_contracts ct
    INNER JOIN customers c ON ct.customer_id = c.id
    INNER JOIN payment_schedules ps ON ct.id = ps.contract_id
    WHERE ct.user_id = ?
      AND ct.status = 'active'
      AND ps.status = 'pending'
      AND ps.due_date <= ?
    ORDER BY ps.due_date ASC
  `

  const rows = await db.query<{
    contract_id: string
    contract_number: string
    contract_title: string
    customer_id: string
    customer_name: string
    next_collection_date: string
    next_collection_amount: number
    currency: string
  }>(sql, [userId, futureDate.toISOString().split('T')[0]])

  return rows.map(row => {
    const collectionDate = new Date(row.next_collection_date)
    const daysUntilCollection = Math.floor((collectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    let collectionStatus: 'overdue' | 'due_today' | 'due_soon' | 'upcoming'
    if (daysUntilCollection < 0) {
      collectionStatus = 'overdue'
    } else if (daysUntilCollection === 0) {
      collectionStatus = 'due_today'
    } else if (daysUntilCollection <= 7) {
      collectionStatus = 'due_soon'
    } else {
      collectionStatus = 'upcoming'
    }

    return {
      ...row,
      days_until_collection: daysUntilCollection,
      collection_status: collectionStatus,
    }
  })
}

/**
 * 記錄付款並更新相關的排程和合約
 */
export async function recordPayment(
  db: D1Client,
  userId: string,
  data: {
    customer_id: string
    quotation_id?: string
    contract_id?: string
    payment_type: 'deposit' | 'installment' | 'final' | 'full' | 'recurring'
    payment_date: string
    amount: number
    currency: string
    payment_method?: 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'other'
    reference_number?: string
    notes?: string
    schedule_id?: string
  }
): Promise<Payment> {
  if (!data.quotation_id && !data.contract_id) {
    throw new Error('Either quotation_id or contract_id must be provided')
  }

  const payment = await createPayment(db, userId, {
    company_id: null,
    quotation_id: data.quotation_id || null,
    contract_id: data.contract_id || null,
    customer_id: data.customer_id,
    payment_type: data.payment_type as 'deposit' | 'installment' | 'final' | 'full',
    payment_date: data.payment_date,
    amount: data.amount,
    currency: data.currency,
    payment_method: data.payment_method || null,
    reference_number: data.reference_number || null,
    receipt_url: null,
    status: 'confirmed',
    notes: data.notes || null,
  })

  if (data.schedule_id) {
    await db.execute(
      `UPDATE payment_schedules
       SET status = 'paid', paid_date = ?, payment_id = ?, paid_amount = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [data.payment_date, payment.id, data.amount, new Date().toISOString(), data.schedule_id, userId]
    )
  } else if (data.contract_id) {
    const nextSchedule = await db.queryOne<PaymentSchedule>(
      `SELECT * FROM payment_schedules
       WHERE contract_id = ? AND user_id = ? AND status = 'pending'
       ORDER BY due_date ASC
       LIMIT 1`,
      [data.contract_id, userId]
    )

    if (nextSchedule) {
      await db.execute(
        `UPDATE payment_schedules
         SET status = 'paid', paid_date = ?, payment_id = ?, paid_amount = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`,
        [data.payment_date, payment.id, data.amount, new Date().toISOString(), nextSchedule.id, userId]
      )
    }
  }

  if (data.contract_id) {
    const nextUnpaid = await db.queryOne<PaymentSchedule>(
      `SELECT * FROM payment_schedules
       WHERE contract_id = ? AND user_id = ? AND status = 'pending'
       ORDER BY due_date ASC
       LIMIT 1`,
      [data.contract_id, userId]
    )

    if (nextUnpaid) {
      await db.execute(
        `UPDATE customer_contracts
         SET next_collection_date = ?, next_collection_amount = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`,
        [nextUnpaid.due_date, nextUnpaid.amount, new Date().toISOString(), data.contract_id, userId]
      )
    } else {
      await db.execute(
        `UPDATE customer_contracts
         SET next_collection_date = NULL, next_collection_amount = NULL, updated_at = ?
         WHERE id = ? AND user_id = ?`,
        [new Date().toISOString(), data.contract_id, userId]
      )
    }
  }

  return payment
}
