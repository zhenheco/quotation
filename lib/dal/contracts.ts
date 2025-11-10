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
