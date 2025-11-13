/**
 * 合約資料存取層 (DAL)
 */

import { D1Client } from '@/lib/db/d1-client'

export interface Contract {
  id: string
  user_id: string
  company_id: string | null
  customer_id: string
  contract_number: string
  title: string
  start_date: string
  end_date: string
  signed_date: string | null
  status: 'draft' | 'active' | 'expired' | 'terminated'
  total_amount: number
  currency: string
  payment_terms: string | null
  contract_file_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function getContracts(
  db: D1Client,
  userId: string,
  companyId?: string
): Promise<Contract[]> {
  let sql = 'SELECT * FROM customer_contracts WHERE user_id = ?'
  const params: unknown[] = [userId]

  if (companyId) {
    sql += ' AND company_id = ?'
    params.push(companyId)
  }

  sql += ' ORDER BY created_at DESC'

  return await db.query<Contract>(sql, params)
}

export async function getContractById(
  db: D1Client,
  userId: string,
  contractId: string
): Promise<Contract | null> {
  return await db.queryOne<Contract>(
    'SELECT * FROM customer_contracts WHERE id = ? AND user_id = ?',
    [contractId, userId]
  )
}

export async function createContract(
  db: D1Client,
  userId: string,
  data: Omit<Contract, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Contract> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO customer_contracts (
      id, user_id, company_id, customer_id, contract_number, title,
      start_date, end_date, signed_date, status, total_amount, currency,
      payment_terms, contract_file_url, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, data.company_id, data.customer_id, data.contract_number, data.title,
      data.start_date, data.end_date, data.signed_date, data.status, data.total_amount, data.currency,
      data.payment_terms, data.contract_file_url, data.notes, now, now
    ]
  )

  const contract = await getContractById(db, userId, id)
  if (!contract) {
    throw new Error('Failed to create contract')
  }

  return contract
}

export interface ContractWithOverduePayments extends Contract {
  customer_name: string
  overdue_schedules_count: number
  total_overdue_amount: number
  oldest_overdue_days: number
}

export async function getContractsWithOverduePayments(
  db: D1Client,
  userId: string
): Promise<ContractWithOverduePayments[]> {
  const today = new Date().toISOString().split('T')[0]

  const sql = `
    SELECT
      ct.*,
      c.name as customer_name,
      COUNT(ps.id) as overdue_schedules_count,
      SUM(ps.amount - COALESCE(ps.paid_amount, 0)) as total_overdue_amount,
      MAX(julianday('now') - julianday(ps.due_date)) as oldest_overdue_days
    FROM customer_contracts ct
    INNER JOIN customers c ON ct.customer_id = c.id
    INNER JOIN payment_schedules ps ON ct.id = ps.contract_id
    WHERE ct.user_id = ?
      AND ct.status = 'active'
      AND ps.status = 'overdue'
      AND ps.due_date < ?
    GROUP BY ct.id
    ORDER BY oldest_overdue_days DESC
  `

  return await db.query<ContractWithOverduePayments>(sql, [userId, today])
}

export interface PaymentProgress {
  contract_id: string
  total_amount: number
  total_paid: number
  total_remaining: number
  progress_percentage: number
  total_schedules: number
  paid_schedules: number
  pending_schedules: number
  overdue_schedules: number
  currency: string
}

export async function getContractPaymentProgress(
  db: D1Client,
  userId: string,
  contractId: string
): Promise<PaymentProgress | null> {
  const contract = await getContractById(db, userId, contractId)

  if (!contract) {
    return null
  }

  const schedules = await db.query<{
    status: string
    amount: number
    paid_amount: number
  }>(
    'SELECT status, amount, COALESCE(paid_amount, 0) as paid_amount FROM payment_schedules WHERE contract_id = ?',
    [contractId]
  )

  const totalPaid = schedules.reduce((sum, s) => sum + s.paid_amount, 0)
  const totalRemaining = contract.total_amount - totalPaid
  const progressPercentage = contract.total_amount > 0
    ? Math.round((totalPaid / contract.total_amount) * 100)
    : 0

  const paidSchedules = schedules.filter(s => s.status === 'paid').length
  const pendingSchedules = schedules.filter(s => s.status === 'pending').length
  const overdueSchedules = schedules.filter(s => s.status === 'overdue').length

  return {
    contract_id: contract.id,
    total_amount: contract.total_amount,
    total_paid: totalPaid,
    total_remaining: totalRemaining,
    progress_percentage: progressPercentage,
    total_schedules: schedules.length,
    paid_schedules: paidSchedules,
    pending_schedules: pendingSchedules,
    overdue_schedules: overdueSchedules,
    currency: contract.currency,
  }
}

/**
 * 生成合約編號
 */
export async function generateContractNumber(
  db: D1Client,
  userId: string
): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `C${year}`

  const lastContract = await db.queryOne<{ contract_number: string }>(
    `SELECT contract_number
     FROM customer_contracts
     WHERE user_id = ? AND contract_number LIKE ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, `${prefix}-%`]
  )

  if (!lastContract) {
    return `${prefix}-001`
  }

  const lastNumber = parseInt(lastContract.contract_number.split('-')[1] || '0')
  const nextNumber = String(lastNumber + 1).padStart(3, '0')

  return `${prefix}-${nextNumber}`
}

type PaymentTerms = 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

/**
 * 從報價單建立合約
 */
export async function convertQuotationToContract(
  db: D1Client,
  userId: string,
  quotationId: string,
  contractData: {
    signed_date: string
    expiry_date: string
    payment_frequency: PaymentTerms
    payment_day?: number
  }
): Promise<{ contract: Contract; quotation_number: string }> {
  const quotation = await db.queryOne<{
    id: string
    customer_id: string
    quotation_number: string
    total_amount: number
    currency: string
  }>(
    'SELECT id, customer_id, quotation_number, total_amount, currency FROM quotations WHERE id = ? AND user_id = ?',
    [quotationId, userId]
  )

  if (!quotation) {
    throw new Error('Quotation not found')
  }

  const contractNumber = await generateContractNumber(db, userId)
  const contractId = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO customer_contracts (
      id, user_id, company_id, customer_id, contract_number, title,
      start_date, end_date, signed_date, status, total_amount, currency,
      payment_terms, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contractId,
      userId,
      null,
      quotation.customer_id,
      contractNumber,
      `合約 - ${quotation.quotation_number}`,
      contractData.signed_date,
      contractData.expiry_date,
      contractData.signed_date,
      'active',
      quotation.total_amount,
      quotation.currency,
      contractData.payment_frequency,
      `由報價單 ${quotation.quotation_number} 轉換而成`,
      now,
      now
    ]
  )

  await db.execute(
    'UPDATE quotations SET status = ? WHERE id = ?',
    ['accepted', quotationId]
  )

  const paymentDay = contractData.payment_day || 5
  await generatePaymentSchedules(
    db,
    userId,
    contractId,
    quotation.customer_id,
    {
      start_date: contractData.signed_date,
      end_date: contractData.expiry_date,
      total_amount: quotation.total_amount,
      currency: quotation.currency,
      payment_frequency: contractData.payment_frequency,
      payment_day: paymentDay
    }
  )

  await db.execute(
    `UPDATE customers SET
      contract_status = ?,
      contract_expiry_date = ?,
      payment_terms = ?
    WHERE id = ? AND user_id = ?`,
    ['contracted', contractData.expiry_date, contractData.payment_frequency, quotation.customer_id, userId]
  )

  const contract = await getContractById(db, userId, contractId)
  if (!contract) {
    throw new Error('Failed to create contract')
  }

  return {
    contract,
    quotation_number: quotation.quotation_number
  }
}

/**
 * 生成付款排程
 */
async function generatePaymentSchedules(
  db: D1Client,
  userId: string,
  contractId: string,
  customerId: string,
  params: {
    start_date: string
    end_date: string
    total_amount: number
    currency: string
    payment_frequency: PaymentTerms
    payment_day: number
  }
): Promise<void> {
  const { start_date, total_amount, currency, payment_frequency, payment_day } = params

  let numberOfPayments: number
  let intervalMonths: number

  switch (payment_frequency) {
    case 'monthly':
      numberOfPayments = 12
      intervalMonths = 1
      break
    case 'quarterly':
      numberOfPayments = 4
      intervalMonths = 3
      break
    case 'semi_annual':
      numberOfPayments = 2
      intervalMonths = 6
      break
    case 'annual':
      numberOfPayments = 1
      intervalMonths = 12
      break
    default:
      throw new Error('Invalid payment frequency')
  }

  const amountPerPayment = total_amount / numberOfPayments
  const startDate = new Date(start_date)

  for (let i = 0; i < numberOfPayments; i++) {
    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i * intervalMonths)
    dueDate.setDate(payment_day)

    const scheduleId = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.execute(
      `INSERT INTO payment_schedules (
        id, user_id, contract_id, customer_id, schedule_number,
        due_date, amount, currency, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scheduleId,
        userId,
        contractId,
        customerId,
        i + 1,
        dueDate.toISOString().split('T')[0],
        amountPerPayment,
        currency,
        'pending',
        now,
        now
      ]
    )
  }

  const nextSchedule = await db.queryOne<{
    due_date: string
    amount: number
    currency: string
  }>(
    `SELECT due_date, amount, currency FROM payment_schedules
     WHERE contract_id = ?
     ORDER BY due_date ASC
     LIMIT 1`,
    [contractId]
  )

  if (nextSchedule) {
    await db.execute(
      `UPDATE customers SET
        next_payment_due_date = ?,
        next_payment_amount = ?,
        payment_currency = ?
      WHERE id = ? AND user_id = ?`,
      [nextSchedule.due_date, nextSchedule.amount, nextSchedule.currency, customerId, userId]
    )
  }
}

/**
 * 更新合約的下次應收資訊
 */
export async function updateContractNextCollection(
  db: D1Client,
  userId: string,
  contractId: string,
  data: {
    next_collection_date: string
    next_collection_amount: number
  }
): Promise<Contract> {
  const contract = await getContractById(db, userId, contractId)
  if (!contract) {
    throw new Error('Contract not found')
  }

  await db.execute(
    `UPDATE customer_contracts
     SET next_collection_date = ?,
         next_collection_amount = ?,
         updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [data.next_collection_date, data.next_collection_amount, new Date().toISOString(), contractId, userId]
  )

  const updated = await getContractById(db, userId, contractId)
  if (!updated) {
    throw new Error('Contract not found after update')
  }

  return updated
}
